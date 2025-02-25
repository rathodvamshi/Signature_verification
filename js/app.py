import os
import sys
import cv2
import numpy as np
import h5py

IMG_HEIGHT, IMG_WIDTH = 150, 150

# Load the Keras model
def leaky_relu(z, alpha=0.01):
    return np.where(z > 0, z, alpha * z)
def softmax(z):
    z = z - np.max(z, axis=0, keepdims=True) 
    return np.exp(z) / np.sum(np.exp(z), axis=0, keepdims=True)
def load_model_from_h5(model_path):
    weights = []
    biases = []
    with h5py.File(model_path, 'r') as f:
        for i in range(len(f.keys()) // 2): 
            weights.append(np.array(f[f"weights_layer_{i}"]))
            biases.append(np.array(f[f"biases_layer_{i}"]))
    return weights, biases
# Preprocess the image (resize and normalize)
# Debugging and Validation Added
def preprocess_image(image_path):
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found at {image_path}")
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError("Error reading the image")
    img = cv2.resize(img, (IMG_WIDTH, IMG_HEIGHT))
    img = img / 255.0  # Normalize
    return img.flatten().reshape(-1, 1)  # Flatten to column vector

def predict_signature(image_path, model_path):
    weights, biases = load_model_from_h5(model_path)
    layers = len(biases) + 1
    image = preprocess_image(image_path)
    a = image
    for l, (w, b) in enumerate(zip(weights, biases)):
        # print(f"Layer {l+1}: weights shape = {w.shape}, input shape = {a.shape}")
        if l + 2 != layers:
            a = leaky_relu(np.dot(w, a) + b)
        else:
            prediction = softmax(np.dot(w, a) + b)
    predicted_label = np.argmax(prediction)
    confidence = prediction[predicted_label].item() * 100
    label_str = "Genuine" if predicted_label == 1 else "Forged"
    return label_str, confidence

# Main execution for file-based prediction
if __name__ == "__main__":
    image_path = sys.argv[1]  # Image file path
    model_path = sys.argv[2]  # Model file path
    label, confidence = predict_signature(image_path, model_path)
    print(f"{label} with {confidence:.2f}%confidence")