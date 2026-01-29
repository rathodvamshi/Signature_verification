# Use Node.js 18 slim as base
FROM node:18-slim

# Install Python 3, pip, and essential libraries for OpenCV
# Even with opencv-python-headless, some base libraries might be needed
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    libglib2.0-0 \
    build-essential \
    libhdf5-dev \
    libsm6 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install Node.js dependencies
RUN npm install --production

# Copy requirements.txt
COPY requirements.txt ./

# Install Python dependencies
# Use pip3 to ensure it's linked to python3
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

# Copy the rest of the application code
COPY . .

# Create necessary directories
RUN mkdir -p js/uploads/history

# DEBUG: List all files to verify structure during build
RUN echo "📂 Listing Templates Directory:" && ls -R templates

# Set permissions
RUN chmod -R 777 js/uploads

# Environment variables
ENV NODE_ENV=production
ENV PORT=10000

# Expose port
EXPOSE 10000

# Start command
CMD ["node", "js/server.js"]
