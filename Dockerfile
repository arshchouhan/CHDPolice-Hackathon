FROM node:18-slim

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Copy app source code
COPY . .

# Create necessary directories
RUN mkdir -p uploads logs screenshots
RUN chmod 755 uploads logs screenshots

# Create a directory for MongoDB initialization scripts
RUN mkdir -p mongo-init

# Expose the port the app runs on
EXPOSE 3000

# Add health check endpoint
RUN echo 'app.get("/health", (req, res) => res.status(200).send("OK"));' >> server.js

# Start the application
CMD ["node", "server.js"]
