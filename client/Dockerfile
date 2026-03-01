FROM node:20-alpine AS base

WORKDIR /app
COPY package*.json ./
RUN npm install

# We don't copy all source code here because we will map it as a volume in docker-compose
# for hot-reloading.

ENV PORT=3000
EXPOSE 3000

CMD ["npm", "run", "dev"]
