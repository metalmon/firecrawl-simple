# The scrape service: Express in front of Ulixee Hero, which drives its own Chrome.
#
# Two stages on purpose. Everything the build needs — pnpm, TypeScript, the type
# packages, pnpm's content store — is heavy and useless at runtime; in a single stage
# it all stays in the image, and deleting it in a later step does not shrink anything,
# because a layer keeps what an earlier layer wrote. Measured on this service:
# 3.71 GB before any of this, 2.04 GB once the two unused Chromes went.

FROM node:18-slim AS build

WORKDIR /app

RUN npm install -g pnpm

COPY ./package.json ./pnpm-lock.yaml ./

# ⚠ Both flags must precede the install they govern. `puppeteer` otherwise fetches a
# Chrome of its own at install time (577 MB under /root/.cache/puppeteer) that no code
# here opens — the scraper drives Hero, and Hero brings its own (/root/.cache/ulixee).
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

# Drop what only the build needed, in the SAME layer the runtime stage copies from.
# The store holds the hardlink sources for node_modules; removing its directory
# entries leaves the files alive through those links, which is why pnpm offers it.
RUN rm -rf node_modules && \
    pnpm install --prod --frozen-lockfile && \
    rm -rf /root/.local/share/pnpm /root/.cache/pnpm

FROM node:18-slim

# Fonts are about pixels; this service reads text out of the DOM and never renders an
# image, so the CJK, Thai and Arabic faces the original installed (about 90 MB) buy
# nothing here. A western set stays, because a browser with no font at all is a
# stranger configuration than it is worth.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    fonts-dejavu-core && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./

# Hero's Chrome lives outside node_modules, in the home cache, so it needs carrying
# over explicitly — the rest of the image is useless without it.
COPY --from=build /root/.cache/ulixee /root/.cache/ulixee

# Only the OS libraries a chromium-based browser links against — NOT playwright's own
# chromium binary, which this service never opens and which fails to download behind
# DPI anyway.
RUN npx playwright install-deps chromium && \
    rm -rf /root/.npm /var/lib/apt/lists/*

ARG PORT=3000
ENV PORT=${PORT}
ENV PLAYWRIGHT_BROWSERS_PATH=/app/ms-playwright

EXPOSE ${PORT}

CMD ["node", "dist/api.js"]
