# syntax=docker/dockerfile:1

FROM node:20-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

FROM base AS dependencies

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json

RUN pnpm install --frozen-lockfile --filter web...

FROM base AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/apps/web/node_modules ./apps/web/node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web ./apps/web

# This public value is embedded into the browser bundle by `next build`.
ARG APP_ENV
ARG NEXT_PUBLIC_API_URL
ENV APP_ENV=$APP_ENV
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN test "$APP_ENV" = "test" -o "$APP_ENV" = "production" \
    && test -n "$NEXT_PUBLIC_API_URL" \
    && pnpm --filter web build

FROM node:20-alpine AS runner

WORKDIR /app

ARG APP_ENV
ARG NEXT_PUBLIC_API_URL

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV APP_ENV=$APP_ENV
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
