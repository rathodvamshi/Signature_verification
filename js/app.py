import os
import sys
import cv2
import numpy as np
import h5py

# Suppress warnings to keep stdout clean for the Node.js server
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3' 

IMG_HEIGHT, IMG_WIDTH = 150, 150

# ============================================
# BALANCED VALIDATION THRESHOLDS (Very Permissive)
# ============================================
MIN_CONFIDENCE_THRESHOLD = 45.0  # Lowered to 45% for maximum flexibility
COMPLETELY_BLANK_THRESHOLD = 0.01  # Image must have at least 1% dark pixels
COMPLETELY_FILLED_THRESHOLD = 0.95  # Image shouldn't be 95%+ dark
MAX_REASONABLE_COMPONENTS = 200  # Increased from 50 for complex signatures

# ============================================
# Load the Keras model manually from weights/biases in H5
# ============================================
def leaky_relu(z, alpha=0.01):
    return np.where(z > 0, z, alpha * z)

def softmax(z):
    z = z - np.max(z, axis=0, keepdims=True) 
    return np.exp(z) / np.sum(np.exp(z), axis=0, keepdims=True)

def load_model_from_h5(model_path):
    weights = []
    biases = []
    with h5py.File(model_path, 'r') as f:
        # Assumes keys are named 'weights_layer_X' and 'biases_layer_X'
        layer_count = len(f.keys()) // 2
        for i in range(layer_count): 
            weights.append(np.array(f[f"weights_layer_{i}"]))
            biases.append(np.array(f[f"biases_layer_{i}"]))
    return weights, biases

# ============================================
# SMART IMAGE AUTO-CORRECTION
# ============================================
def auto_crop_signature(img_gray):
    """
    Automatically crop to signature region, removing excess white space.
    This is CRITICAL for handling images with any aspect ratio.
    """
    # Apply binary threshold
    _, binary = cv2.threshold(img_gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    
    # Find all non-zero points (signature pixels)
    coords = cv2.findNonZero(binary)
    
    if coords is None or len(coords) == 0:
        # Image is completely blank
        return None
    
    # Get bounding box of signature
    x, y, w, h = cv2.boundingRect(coords)
    
    # Add small margin (5% on each side)
    margin_x = int(w * 0.05)
    margin_y = int(h * 0.05)
    
    x = max(0, x - margin_x)
    y = max(0, y - margin_y)
    w = min(img_gray.shape[1] - x, w + 2 * margin_x)
    h = min(img_gray.shape[0] - y, h + 2 * margin_y)
    
    # Crop to signature region
    cropped = img_gray[y:y+h, x:x+w]
    
    return cropped

def enhance_signature_image(img_gray):
    """
    Apply professional image enhancement for better ML accuracy.
    """
    # 1. Denoise
    img_denoised = cv2.fastNlMeansDenoising(img_gray, None, 10, 7, 21)
    
    # 2. Enhance contrast using CLAHE
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    img_enhanced = clahe.apply(img_denoised)
    
    # 3. Sharpen to enhance edges
    kernel = np.array([[-1,-1,-1],
                       [-1, 9,-1],
                       [-1,-1,-1]])
    img_sharpened = cv2.filter2D(img_enhanced, -1, kernel)
    
    return img_sharpened

def validate_is_signature(img_gray):
    """
    SIMPLIFIED validation - only reject OBVIOUSLY wrong images.
    Focus: Let legitimate signatures through, block only nonsense.
    """
    height, width = img_gray.shape
    
    # Check 1: Not completely blank
    _, binary = cv2.threshold(img_gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    signature_pixels = np.count_nonzero(binary)
    total_pixels = height * width
    pixel_density = signature_pixels / total_pixels
    
    if pixel_density < COMPLETELY_BLANK_THRESHOLD:
        return False, f"Image is completely blank or nearly all white (only {pixel_density*100:.1f}% dark pixels)."
    
    if pixel_density > COMPLETELY_FILLED_THRESHOLD:
        return False, f"Image is almost completely black ({pixel_density*100:.1f}% dark). This doesn't look like a signature."
    
    # Check 2: Has some edge patterns (signatures have strokes)
    edges = cv2.Canny(img_gray, 50, 150)
    edge_pixels = np.count_nonzero(edges)
    
    if edge_pixels < 10:
        return False, "No clear strokes or patterns detected. Image may be blank or have very faint content."
    
    # Check 3: Not too many components (photos have 1000s of components)
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(binary, connectivity=8)
    num_components = num_labels - 1  # Subtract background
    
    if num_components > MAX_REASONABLE_COMPONENTS:
        return False, f"Image has {num_components} separate elements. This appears to be a photo or complex document, not a signature."
    
    # All basic checks passed - likely a signature or signature-like image
    return True, "Valid"

# ============================================
# Preprocess the image with intelligent handling
# ============================================
def preprocess_image(image_path):
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found at {image_path}")
        
    # Read original image
    img_original = cv2.imread(image_path)
    if img_original is None:
        raise ValueError("Error reading the image - possibly corrupt or invalid format")
    
    # Convert to grayscale
    if len(img_original.shape) == 3:
        img_gray = cv2.cvtColor(img_original, cv2.COLOR_BGR2GRAY)
    else:
        img_gray = img_original.copy()
    
    # ============================================
    # STEP 1: AUTO-CROP to signature region
    # This solves aspect ratio issues!
    # ============================================
    cropped = auto_crop_signature(img_gray)
    if cropped is None:
        raise ValueError("VALIDATION_FAILED: Image appears to be completely blank.")
    
    # ============================================
    # STEP 2: SIMPLIFIED VALIDATION
    # ============================================
    is_valid, reason = validate_is_signature(cropped)
    if not is_valid:
        raise ValueError(f"VALIDATION_FAILED: {reason}")
    
    # ============================================
    # STEP 3: ENHANCE IMAGE
    # ============================================
    enhanced = enhance_signature_image(cropped)
    
    # ============================================
    # STEP 4: RESIZE to model input size
    # ============================================
    img_resized = cv2.resize(enhanced, (IMG_WIDTH, IMG_HEIGHT))
    
    # ============================================
    # STEP 5: NORMALIZE
    # ============================================
    img_normalized = img_resized / 255.0
    
    return img_normalized.flatten().reshape(-1, 1)

# ============================================
# Prediction with balanced confidence check
# ============================================
def predict_signature(image_path, model_path):
    weights, biases = load_model_from_h5(model_path)
    layers_with_weights = len(biases)
    
    # This will raise ValueError if validation fails
    image = preprocess_image(image_path)
    
    # Simple Forward Pass
    a = image
    for l, (w, b) in enumerate(zip(weights, biases)):
        z = np.dot(w, a) + b
        if l + 1 < layers_with_weights:
            a = leaky_relu(z)
        else:
            # Output layer uses softmax
            prediction = softmax(z)
            
    predicted_label = np.argmax(prediction)
    confidence = prediction[predicted_label].item() * 100
    
    # ============================================
    # BALANCED CONFIDENCE CHECK
    # ============================================
    if confidence < MIN_CONFIDENCE_THRESHOLD:
        raise ValueError(f"CONFIDENCE_TOO_LOW: Model confidence {confidence:.2f}% is below threshold {MIN_CONFIDENCE_THRESHOLD}%. The signature quality may be poor or unclear.")
    
    # Label logic: 1 is Genuine based on common training labels for this project
    label_str = "Genuine" if predicted_label == 1 else "Forged"
    return label_str, confidence

# ============================================
# Main entry point for the Node.js 'spawn' call
# ============================================
if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(1)

    img_p = sys.argv[1]
    model_p = sys.argv[2]
    
    try:
        label, conf = predict_signature(img_p, model_p)
        # Final output format must be exact for server.js split(' with ')
        print(f"{label} with {conf:.2f}%confidence")
        sys.stdout.flush()
    except ValueError as ve:
        # Validation errors - send meaningful error to client
        error_msg = str(ve)
        if "VALIDATION_FAILED:" in error_msg:
            print(f"INVALID_IMAGE: {error_msg.replace('VALIDATION_FAILED: ', '')}")
        elif "CONFIDENCE_TOO_LOW:" in error_msg:
            print(f"UNCERTAIN: {error_msg.replace('CONFIDENCE_TOO_LOW: ', '')}")
        else:
            print(f"ERROR: {error_msg}")
        sys.stdout.flush()
        sys.exit(1)
    except Exception as e:
        # Unexpected errors
        print(f"ERROR: {str(e)}")
        sys.stdout.flush()
        sys.exit(1)