FROM node:20-alpine

# Install ffmpeg
RUN apk add --no-cache ffmpeg python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create temp directory
RUN mkdir -p temp

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]