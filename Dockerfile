FROM cgr.dev/chainguard/node:latest-dev AS base
USER root
RUN npm install -g pnpm@10.29.3
WORKDIR /app
RUN chown -R node:node /app
USER node

FROM base AS deps
COPY --chown=node:node package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

FROM base AS build
COPY --chown=node:node package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY --chown=node:node tsconfig.json ./
COPY --chown=node:node src/ src/
RUN pnpm run build

FROM cgr.dev/chainguard/node:latest AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
EXPOSE 3000
USER node
CMD ["dist/server.js"]
