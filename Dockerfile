FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (only production deps)
RUN npm ci --only=production

# Copy engine code
COPY index.js ./
COPY engines/ ./engines/
COPY examples/ ./examples/

# Health check
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/v1/health', (r) => { if (r.statusCode !== 200) throw new Error(r.statusCode); })"

# Expose port
EXPOSE 3000

# Run API server
CMD ["node", "examples/api-server.js"]
