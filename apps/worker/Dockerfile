FROM node:20-alpine

WORKDIR /app

# Copia o build compilado (gerado por `pnpm nx run worker:build`)
COPY dist/apps/worker ./

RUN npm install --omit=dev --ignore-scripts

CMD ["node", "index.js"]
