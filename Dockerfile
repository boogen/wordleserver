# Stage 1: Build the application
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build
COPY . .
RUN npm run tsoa:gen
RUN npx tsc

# Stage 2: Production environment
FROM node:18-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm install --production

# Copy compiled code from builder
COPY --from=builder /app/out ./out
COPY --from=builder /app/model ./model
# Copy any other necessary assets (e.g., public folder if it exists)
# COPY --from=builder /app/public ./public 

ENV NODE_ENV=production
ENV PORT=5000
ENV LOGS_DIR=/app/logs
RUN mkdir -p /app/logs

EXPOSE 5000

CMD ["npm", "start"]
