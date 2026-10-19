FROM node:20-alpine

WORKDIR /app

ENV HOST=0.0.0.0
ENV NODE_ENV=development
ENV PORT=3000

COPY --chown=node:node index.html app.js styles.css 404.html openapi.json ./
COPY --chown=node:node server ./server

USER node

EXPOSE 3000

CMD ["node", "server/server.js"]
