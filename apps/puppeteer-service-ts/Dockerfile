FROM node:18-slim

# Fonts only. The Chrome this block used to install from Google's repository was
# never driven: Hero fetches its own build during `pnpm install` (into
# /root/.cache/ulixee), and the shared libraries a chromium-based browser needs
# arrive with `playwright install-deps chromium` below. Measured in the running
# container: /opt/google held 452 MB that nothing opened.
RUN apt-get update && \
    apt-get install -y \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-symbola \
    fonts-noto \
    fonts-freefont-ttf \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY ./package.json ./pnpm-lock.yaml ./

# ⚠ Both flags must precede the install they govern. `puppeteer` otherwise fetches
# a Chrome of its own at install time (577 MB under /root/.cache/puppeteer) that no
# code here opens — the scraper drives Hero, and Hero brings its own.
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Install only the OS libraries chromium-based browsers need (via apt) — NOT the
# playwright chromium binary. The scraper uses Ulixee Hero's own Chrome (fetched
# during `pnpm install` above), so downloading playwright's chromium from
# storage.googleapis.com is redundant and fails behind DPI (ECONNREFUSED).
RUN npx playwright install-deps chromium

# Build the application
RUN pnpm run build

# Set up environment
ARG PORT=3000
ENV PORT=${PORT}
ENV PLAYWRIGHT_BROWSERS_PATH=/app/ms-playwright

EXPOSE ${PORT}

CMD ["pnpm", "start"]
