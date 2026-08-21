# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile
RUN pnpm --filter @cpf/web build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable \
    && apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates curl \
    && curl --fail --silent --show-error \
      https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem \
      --output /usr/local/share/ca-certificates/aws-rds-global-bundle.pem \
    && chmod 0444 /usr/local/share/ca-certificates/aws-rds-global-bundle.pem \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 3000 4300
CMD ["pnpm", "--filter", "@cpf/web", "start", "--", "-H", "0.0.0.0", "-p", "4300"]
