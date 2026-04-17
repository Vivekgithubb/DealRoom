FROM node:20

WORKDIR /app

# Install backend deps
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# Install frontend deps
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

# Copy all code
COPY . .

# Build frontend
RUN cd frontend && npm run build

# Expose port
EXPOSE 8080

# Start backend
CMD ["node", "backend/server.js"]