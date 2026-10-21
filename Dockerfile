FROM node:26-bookworm-slim AS build
WORKDIR /website
RUN npm install --global pnpm@11.18.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY patches/ ./patches/
RUN pnpm install --frozen-lockfile
COPY . .
ARG NEXT_PUBLIC_WEB_SITE_URL
ARG NEXT_PUBLIC_DOCS_SITE_URL
ENV NEXT_PUBLIC_WEB_SITE_URL=$NEXT_PUBLIC_WEB_SITE_URL
ENV NEXT_PUBLIC_DOCS_SITE_URL=$NEXT_PUBLIC_DOCS_SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm deploy:check && pnpm build

FROM node:26-bookworm-slim AS runtime
WORKDIR /website
ENV NODE_ENV=production PORT=3002
COPY --from=build --chown=node:node /website/out ./out
COPY --from=build --chown=node:node /website/scripts/serve-static.mjs ./scripts/serve-static.mjs
USER node
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s CMD node -e "fetch('http://127.0.0.1:3002/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "scripts/serve-static.mjs"]
