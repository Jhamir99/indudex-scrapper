# syntax=docker/dockerfile:1

# Node 25+ no longer bundles corepack, so pnpm is installed with npm, pinned to
# the "packageManager" version in package.json.
FROM node:26-alpine AS base
RUN npm install -g pnpm@12.18.0
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

FROM base AS build
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM base AS prod-deps
# --ignore-scripts skips "prepare" (husky), which is a dev-only tool.
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

FROM node:26-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/dist ./dist
# Read by the scrapper's entry points (dist/bin/crawl.js): cadences, limits, takedowns.
COPY --from=build --chown=node:node /app/config ./config
# Read by the processor's steps through src/shared/catalogues: occupations, towns, NUTS, ...
COPY --from=build --chown=node:node /app/catalogues ./catalogues
# Read by the title translator: Firefox's engine loader and Aina's worker (the models are fetched into MT_DIR).
COPY --from=build --chown=node:node /app/vendor ./vendor
USER node
EXPOSE 4000
CMD ["node", "dist/index.js"]
