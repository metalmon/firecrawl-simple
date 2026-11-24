# The Firecrawl API and its queue worker. Both run from this image; the command picks
# which. Page fetching is not done here — it goes to the browser service over HTTP
# (PLAYWRIGHT_MICROSERVICE_URL), so nothing in this image opens a browser.
#
# Two stages. The build needs the Go toolchain, TypeScript and the type packages;
# runtime needs none of them, and in a single stage they all stay in the image, because
# deleting them later cannot unwrite an earlier layer. Measured: 3.19 GB before.
#
# The base is pinned by digest: `node:20-slim` moves, and a build that quietly lands on
# a different Debian is the kind of difference nobody notices until something fails to
# start.

FROM node@sha256:2cf067cfed83d5ea958367df9f966191a942351a2df77d6f0193e162b5febfc0 AS build

WORKDIR /app

RUN npm install -g pnpm@12.23.0

COPY ./package.json ./pnpm-lock.yaml ./

# The API never drives a browser of its own; it asks the browser service over HTTP.
ENV PUPPETEER_SKIP_DOWNLOAD=true

RUN pnpm install --frozen-lockfile

# Only for the shared library below; all of it stays in this stage. gcc and libc6-dev
# are named explicitly because cgo needs them and apt recommends are off here.
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends ca-certificates git golang-go gcc libc6-dev && \
    update-ca-certificates

COPY . ./

# An optional faster HTML-to-Markdown path, taken only when USE_GO_MARKDOWN_PARSER is
# "true"; otherwise, and whenever it fails, the TypeScript Turndown path runs instead.
RUN cd src/lib/go-html-to-md && \
    go mod tidy && \
    go build -o html-to-markdown.so -buildmode=c-shared html-to-markdown.go

RUN pnpm run build

# ⚠ The loader resolves the library against __dirname, which after compilation is
# dist/src/lib — not src/lib. Built in place, the file sat where nothing looked for it,
# so the Go path could never have run even with the flag set. Put it where the compiled
# code looks.
RUN mkdir -p dist/src/lib/go-html-to-md && \
    cp src/lib/go-html-to-md/html-to-markdown.so dist/src/lib/go-html-to-md/

# ⚠ NOT a production install. This package lists express — the framework the API
# actually runs on — under devDependencies, so `--prod` removes it and the container
# exits with `Cannot find module 'express'`. Reclassifying that belongs upstream; until
# then the full set ships, and the weight this image sheds is elsewhere: the Go
# toolchain, the browser and the caches below, none of which reach the runtime stage.
RUN rm -rf /root/.local/share/pnpm /root/.cache/pnpm /root/.cache/go-build /root/.cache/node

FROM node@sha256:2cf067cfed83d5ea958367df9f966191a942351a2df77d6f0193e162b5febfc0

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./

ARG PORT=3002
ENV PORT=${PORT}

EXPOSE ${PORT}

# The compiled entrypoint. The package's `start:production` runs `tsc` first, which
# would put the TypeScript compiler back into the runtime image for no reason, and its
# `workers` script runs through nodemon and ts-node — a development loop, in production.
CMD ["node", "dist/src/index.js"]
