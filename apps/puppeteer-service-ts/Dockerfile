# The scrape service: Express in front of Ulixee Hero, which drives its own Chrome.
#
# Two stages on purpose. Everything the build needs — pnpm, TypeScript, the type
# packages, pnpm's content store — is heavy and useless at runtime; in a single stage
# it all stays in the image, and deleting it in a later step does not shrink anything,
# because a layer keeps what an earlier layer wrote. Measured on this service, step by
# step: 3.71 GB -> 2.04 GB (two unused Chromes) -> 1.57 GB (two stages) -> 1.41 GB
# (dead dependencies and fonts).
#
# The base is pinned by digest, not by tag: `node:18-slim` moves, and a build that
# quietly lands on a different Debian is the kind of difference nobody sees until the
# browser fails to start. This digest is Node 18.20.8 on Debian 12.11.

FROM node@sha256:f9ab18e354e6855ae56ef2b290dd225c1e51a564f87584b9bd21dd651838830e AS build

WORKDIR /app

# Pinned: an unpinned package manager is free to resolve the tree differently, which
# makes the lockfile below a weaker promise than it looks.
RUN npm install -g pnpm@12.23.0

COPY ./package.json ./pnpm-lock.yaml ./

# ⚠ Both flags must precede the install they govern. `puppeteer` otherwise fetches a
# Chrome of its own at install time (577 MB under /root/.cache/puppeteer) that no code
# here opens — the scraper drives Hero, and Hero brings its own (/root/.cache/ulixee,
# version pinned by the @ulixee/chrome-* package in the lockfile).
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

# `pnpm prune --prod` leaves typescript and the type packages in place; a clean
# production install from the lockfile is what actually removes them. The store goes
# in the same layer — a later `rm` cannot unwrite an earlier one.
RUN rm -rf node_modules && \
    pnpm install --prod --frozen-lockfile && \
    rm -rf /root/.local/share/pnpm /root/.cache/pnpm

FROM node@sha256:f9ab18e354e6855ae56ef2b290dd225c1e51a564f87584b9bd21dd651838830e

# The shared libraries a chromium-based browser links against, written out rather than
# fetched. `npx playwright install-deps chromium` used to do this, which meant every
# build downloaded the playwright CLI from the registry and installed whatever list
# that version carried — an unpinned input in the middle of an otherwise pinned build.
# This is that command's own list (playwright 1.49 --dry-run), minus two groups:
#   * xvfb — a virtual X server, which a headless browser does not use;
#   * every font but one. The service reads text out of the DOM and renders no image,
#     so the CJK, Thai, emoji and unifont faces (about 60 MB) draw nothing. A browser
#     with no font at all is a stranger configuration than it is worth, so one western
#     family stays.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libasound2 libatk-bridge2.0-0 libatk1.0-0 libatspi2.0-0 libcairo2 libcups2 \
    libdbus-1-3 libdrm2 libgbm1 libglib2.0-0 libnspr4 libnss3 libpango-1.0-0 \
    libx11-6 libxcb1 libxcomposite1 libxdamage1 libxext6 libxfixes3 libxkbcommon0 \
    libxrandr2 libfontconfig1 libfreetype6 \
    fonts-dejavu-core && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./

# Hero's Chrome lives outside node_modules, in the home cache, so it needs carrying
# over explicitly — the rest of the image is useless without it.
COPY --from=build /root/.cache/ulixee /root/.cache/ulixee

ARG PORT=3000
ENV PORT=${PORT}

EXPOSE ${PORT}

CMD ["node", "dist/api.js"]
