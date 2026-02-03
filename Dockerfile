# ==========================================
# MULTI-STAGE BUILD - Production Optimized
# ==========================================
# Stage 1: Build dependencies
FROM node:18-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev) for building
RUN npm ci

# ==========================================
# Stage 2: Production Runtime
# ==========================================
FROM node:18-slim

# Install Python 3, pip, and essential libraries for OpenCV
# Use --no-install-recommends to minimize image size
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ONLY production Node.js dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy requirements.txt
COPY requirements.txt ./

# Install Python dependencies with optimizations
# --no-cache-dir: Don't cache packages (saves space)
# --break-system-packages: Required for Debian 12+
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories with proper permissions
RUN mkdir -p uploads/history js/uploads/history && \
    chmod -R 755 uploads js/uploads

# Remove unnecessary files to reduce image size
RUN rm -rf \
    templates/*.md \
    templates/CRITICAL_FIX.md \
    templates/PROFILE_*.md \
    *.md \
    .git \
    .gitignore \
    node_modules/*/test \
    node_modules/*/tests \
    node_modules/*/.github

# Set production environment
ENV NODE_ENV=production
ENV PORT=10000
ENV PYTHONUNBUFFERED=1

# Run as non-root user for security
RUN useradd -m -u 1001 appuser && \
    chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:10000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start command
CMD ["node", "js/server.js"]
