FROM node:24-bookworm-slim
WORKDIR /app
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --chown=node:node server.mjs database.mjs storage.mjs social.mjs moderation.mjs moderation-worker.mjs ./
COPY --chown=node:node public ./public
RUN mkdir -p /var/data/uploads && chown -R node:node /var/data
USER node
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DATA_DIR=/var/data
EXPOSE 3000
CMD ["node", "server.mjs"]
