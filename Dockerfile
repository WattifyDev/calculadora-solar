# 1. Etapa de dependencias
FROM node:20-alpine AS deps
# libc6-compat es recomendado en alpine para evitar errores con paquetes nativos
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
COPY node_modules ./node_modules

# 2. Etapa de construcción
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generamos el cliente de Prisma antes del build (necesario para el tipado y el build de Next.js)
RUN npx prisma@6.8.2 generate
# Desactivamos la telemetría de Next.js durante el build
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# 3. Etapa de producción
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
# Desactivamos la telemetría en ejecución
ENV NEXT_TELEMETRY_DISABLED 1

# [MEJORA DE SEGURIDAD] Creamos un usuario "no root"
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# [MEJORA] Copiamos carpetas necesarias para runtime
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/generated ./generated
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Copiamos los archivos generados y les asignamos el propietario "nextjs"
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Cambiamos al usuario sin privilegios
USER nextjs

EXPOSE 3000

ENV PORT 3000
# Aseguramos que Next.js escuche en todas las interfaces del contenedor
ENV HOSTNAME "0.0.0.0"

# [MEJORA] Ejecutamos prisma db push antes de arrancar
CMD npx prisma@6.8.2 db push --accept-data-loss && node server.js
