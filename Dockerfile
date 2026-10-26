# Waypoint: one Node process, no database. Build:  docker build -t waypoint .
#                                           Run:    docker run -p 3000:3000 waypoint

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
# Optional: the public URL, read at build time (SvelteKit's paths.origin).
ARG ORIGIN=""
ENV ORIGIN=$ORIGIN
RUN npm run build

# The build bundles all its dependencies, so the runtime image needs only build/
# and package.json (for "type": "module").
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1
USER node
CMD ["node", "build"]
