# Single service: the Fastify server serves the API and the built web app.
ARG NODE_IMAGE=node:22-slim
FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /app

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY apps/simulator/package.json apps/simulator/
COPY packages/engine/package.json packages/engine/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @comptoirs/web build

FROM base AS runtime
ENV NODE_ENV=production PORT=3000
# Not root: the image's own user, owning only the app.
COPY --from=build --chown=node:node /app /app
USER node
WORKDIR /app/apps/server
EXPOSE 3000
# The server itself, without pnpm in between, so that it receives the stop signal.
CMD ["node_modules/.bin/tsx", "src/server.ts"]
