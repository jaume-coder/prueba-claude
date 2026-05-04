FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .
RUN npm run build

# El build se copia al directorio static del backend via volumen en docker-compose
