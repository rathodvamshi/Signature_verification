import os
import sys
import cv2
import numpy as np
import h5py

# Suppress warnings to keep stdout clean for the Node.js server
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3' 

IMG_HEIGHT, IMG_WIDTH = 150, 150

# Load the Keras model manually from weights/biases in H5
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

# Preprocess the image (grayscale, resize and normalize)
def preprocess_image(image_path):
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found at {image_path}")
        
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError("Error reading the image - possibly corrupt or invalid format")
        
    img = cv2.resize(img, (IMG_WIDTH, IMG_HEIGHT))
    img = img / 255.0  # Normalize to [0, 1]
    return img.flatten().reshape(-1, 1)  # Flatten to column vector for neural net

def predict_signature(image_path, model_path):
    weights, biases = load_model_from_h5(model_path)
    layers_with_weights = len(biases)
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
    
    # Label logic: 1 is Genuine based on common training labels for this project
    label_str = "Genuine" if predicted_label == 1 else "Forged"
    return label_str, confidence

# Main entry point for the Node.js 'spawn' call
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
    except Exception as e:
        # Silently fail so server.js doesn't crash on parse
        sys.exit(1)