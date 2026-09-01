# ☀️ CALCULADORA SOLAR - WATTIFY

Este documento define la arquitectura, credenciales, entorno de ejecución y normas de desarrollo para la **Calculadora Solar de Wattify**.

## 📌 Visión General
La Calculadora Solar (https://calculadora-solar.wattify.es) es una aplicación web autónoma desarrollada en Next.js 16 (App Router) y React 19. Permite a los usuarios ingresar su dirección o buscar en Google Maps, obtener ortofotos y potencial de radiación solar vía la Google Solar API y PVGIS API, simular presupuestos y amortización fotovoltaica, y generar propuestas/PDFs o registrar leads.

## 🏗️ Arquitectura del Proyecto

- **Framework Web:** Next.js 16 (App Router) + React 19 + TypeScript
- **Estilos:** Tailwind CSS + Radix UI + Lucide React
- **ORM / Base de Datos:** Prisma 6 + PostgreSQL (calculadora_db en Docker Swarm)
- **Control de Versiones GitHub:** git@github.com:WattifyDev/calculadora-solar.git (Email: rturo.criado@wattify.es)
- **Integraciones externas:**
  - Google Maps & Google Solar API (GOOGLE_MAPS_API_KEY)
  - PVGIS API (Cálculo de radiación solar europea)
  - Motor de generación PDF (@react-pdf/renderer)
  - Nodemailer (Notificaciones SMTP)
- **Despliegue Producción:** Docker Swarm + Traefik v3 (76.13.42.121)
- **Dominio:** https://calculadora-solar.wattify.es
- **Embed JS:** https://calculadora-solar.wattify.es/embed.js (incrustable en sitios externos como wattify.es)

## 🔐 Entorno y Variables de Entorno (.env)

> ⚠️ **NUNCA incluir valores reales aquí.** Las credenciales se gestionan exclusivamente en el archivo `.env` del servidor (NO versionado) y en el gestor de secretos del VPS.

Variables requeridas en `.env` (sin valores):
```
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://calculadora-solar.wattify.es
DATABASE_URL=postgresql://[usuario]:[password]@db:5432/calculadora
POSTGRES_USER=[ver gestor de contraseñas]
POSTGRES_PASSWORD=[ver gestor de contraseñas]
POSTGRES_DB=calculadora
GOOGLE_MAPS_API_KEY=[ver Google Cloud Console]
API_SECRET_KEY=[ver gestor de contraseñas]
AUTH_SECRET=[ver gestor de contraseñas]
NEXT_TELEMETRY_DISABLED=1
```

## 🚀 Despliegue en VPS Hostinger

- **VPS IPv4:** 76.13.42.121
- **Contenedores Swarm:** calculadora_app, calculadora_db
- **Ruta en VPS:** /root/calculadora
- **Comando de despliegue en VPS:**
  `ash
  cd /root/calculadora
  git pull origin main
  docker build -t mi-app-nextjs:latest .
  docker service update --image mi-app-nextjs:latest calculadora_app
  `

## 🌕 Comando Especial: "To the moon"
Cuando el usuario diga **"To the moon"** o **"To the moon 🚀"**:
1. Verificar compilación local `npm run build`.
2. Realizar `git add .` y `git commit` de los cambios pendientes.
3. Generar la secuencia exacta de comandos de despliegue en VPS Hostinger `/root/calculadora`.

---
*Proyecto independizado de Paperclip_Oracle el 1 de Septiembre de 2026. Credenciales de GitHub vinculadas a arturo.criado@wattify.es.*
