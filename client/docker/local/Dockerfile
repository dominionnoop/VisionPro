FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

ENV NODE_ENV=development
ENV WATCHPACK_POLLING=true

EXPOSE 3000

CMD ["pnpm", "dev"]
