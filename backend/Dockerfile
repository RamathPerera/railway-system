# ---- Build stage ----
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm install

# Copy source and compile TypeScript to dist/
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Runtime stage ----
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copy production dependencies
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# Copy compiled output
COPY --from=build /app/dist ./dist

EXPOSE 5000

CMD ["npm", "start"]
