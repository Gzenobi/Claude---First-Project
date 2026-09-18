# Imagen única: compila el cliente (React) y el servidor (Express + Prisma),
# y sirve ambos desde un solo proceso Node en un solo puerto. Así el
# despliegue queda como una sola URL, sin instalar nada en cada PC del
# usuario final — solo necesitan un navegador.

FROM node:22-slim AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:22-slim AS server-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npx prisma generate
RUN npm run build

FROM node:22-slim
WORKDIR /app/server
ENV NODE_ENV=production
COPY --from=server-build /app/server/node_modules ./node_modules
COPY --from=server-build /app/server/dist ./dist
COPY --from=server-build /app/server/prisma ./prisma
COPY --from=server-build /app/server/package*.json ./
COPY --from=client-build /app/client/dist ../client/dist

EXPOSE 4000
# Al arrancar el contenedor: aplica las migraciones pendientes contra la base
# de datos de producción (DATABASE_URL) y recién después levanta el servidor.
CMD npx prisma migrate deploy && node dist/index.js
