FROM node:20-alpine

WORKDIR /usr/src/app/backend

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5000/api/health || exit 1

CMD ["node", "src/server.js"]
