FROM node:22-bullseye AS base

ENV TURBO_ENV_MODE=loose

# Required environment variables
ARG SECRET_KEY
ENV SECRET_KEY=${SECRET_KEY}

ARG APL_FILE_PATH
ENV APL_FILE_PATH=${APL_FILE_PATH}

ARG APP_IFRAME_BASE_URL=""
ENV APP_IFRAME_BASE_URL=${APP_IFRAME_BASE_URL}

ARG APP_API_BASE_URL=""
ENV APP_API_BASE_URL=${APP_API_BASE_URL}

# Optional environment variables
ARG APP_LOG_LEVEL="debug"
ENV APP_LOG_LEVEL=${APP_LOG_LEVEL}

ARG NEXT_PUBLIC_BASE_PATH="/"
ENV NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}

ENV APL="file"

WORKDIR /app

COPY ./package.json ./package.json

RUN export PNPM_VERSION=$(cat package.json | jq '.engines.pnpm' | sed -E 's/[^0-9.]//g')
RUN npm install -g pnpm@$PNPM_VERSION

# Dependencies stage, install dependencies only when needed
FROM base AS deps

WORKDIR /app

COPY . .

RUN pnpm i --prefer-offline

# Build stage, build the application
FROM base AS builder

WORKDIR /app

COPY --from=deps /app .

RUN pnpm turbo run build --filter=saleor-app-smtp

# Production image, copy all the files and run next
FROM base AS runner

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

RUN apt update && apt install -y awscli

WORKDIR /app

COPY --from=builder /app .

WORKDIR /app/apps/smtp

RUN chown nextjs:nodejs .next

CMD ["sh", "-c", "pnpm start"]
