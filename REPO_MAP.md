# 🗺️ Mapa del Repositorio - Calculadora Solar

Este documento proporciona una visión técnica detallada de la arquitectura, flujos de datos y componentes críticos del sistema.

---

## 📂 Estructura Principal

| Directorio | Propósito |
| :--- | :--- |
| `app/` | Rutas de Next.js (App Router). Contiene la UI pública, el panel y los endpoints de la API. |
| `components/` | Componentes de React. Divididos en `ui/` (base) y componentes de negocio. |
| `lib/` | El "Core" del sistema: cálculos financieros, integraciones y utilidades de servidor. |
| `prisma/` | Definición de datos y acceso a base de datos (PostgreSQL/SQLite). |
| `public/` | Assets estáticos y el **script crítico de embed**. |

---

## 🗄️ Modelo de Datos (Prisma Schema)

El sistema se apoya en tres entidades principales que gestionan el flujo de leads y la personalización:

### 1. `Submission` (Los Leads)
Es el corazón del sistema. Almacena cada cálculo realizado por un usuario.
- **Campos de Ubicación**: `address`, `city`, `latitude`, `longitude`.
- **Datos de Google Solar**: `googleSolarData` (JSON completo), `totalRoofArea`, `suitableRoofArea`, `roofSuitability`.
- **Resultados del Cálculo**: `annualProduction`, `systemSize`, `panelCount`, `paybackYears`, `roi`, `lifetimeSavings`.
- **Datos del Cliente**: `userName`, `userEmail`, `userPhone`, `userConsentGiven`.
- **Técnico**: Almacena la `orthophotoBase64` y `orthophotoUrl` para el informe PDF.

### 2. `User` (Instaladores / Administradores)
Representa a la empresa que usa la calculadora o a los admins.
- **Configuración SMTP**: `smtpHost`, `smtpPort`, `smtpUser`, `smtpPassword` (para enviar los informes desde su propio correo).
- **Márgenes Comerciales**: `priceKW` (precio venta), y porcentajes para:
  - Estructura (`structureCostPercentage`)
  - Instalación (`installationServicesPercentage`)
  - Monitorización (`monitoringToolPercentage`)
  - Soporte (`warrantySupportPercentage`)
- **Dominio**: `domain` (usado para autorizar dónde se puede embeber la calculadora).

### 3. `Material` (Componentes)
Catálogo de equipos disponibles.
- **Tipos**: `PANEL`, `INVERSOR`, `OTHER`.
- **Campos**: `peakPower` (potencia pico), `area` (m2 del panel), `datasheetPdf` (ficha técnica).

---

## 🧩 Componentes Críticos y Flujos Especiales

### 📸 El Sistema de Ortofotos (`lib/orthophoto.ts`)
- **Proxy TIFF ➔ PNG**: Google Solar devuelve imágenes TIFF de alta resolución. Nuestro proxy (`/api/orthophoto`) las descarga, las procesa con **Sharp** (redimensionado a 800x600, compresión 75%) y las devuelve como PNG.
- **Caché**: Usa un `LRU Cache` de 50 imágenes con vida de 1 hora para no saturar el servidor con conversiones.

### � Detección Inteligente en Embed (`/api/embed/config`)
Cuando la calculadora se carga en una web externa:
1. **Verificación de Dominio**: Revisa el header `Referer`. Si el dominio no coincide con el de un `User` registrado, bloquea el servicio (Seguridad).
2. **Detección de País**: 
   - Primero intenta por el **TLD** del dominio (`.es` ➔ España, `.co` ➔ Colombia).
   - Si no es claro, usa **Geolocalización por IP** (vía `ipapi.co`).
3. **Inyección de Keys**: Entrega al cliente las API Keys necesarias (Maps, etc.) solo si el dominio está autorizado.

### 🧠 Cálculo de Producción Solar (`lib/google-solar.ts`)
No solo pedimos la imagen. Extraemos de Google:
- **Flux Layer**: Radiación específica por cada m2 del tejado.
- **Panel Config**: Google sugiere la disposición óptima de paneles. Nosotros filtramos esos paneles según el área útil y la potencia de los materiales creados en el dashboard.

---

## 🛰️ Integraciones con Google APIs

1. **Places API**: Usada en `solar-calculator-form.tsx` para sugerir direcciones.
2. **Geocoding API**: Traduce la dirección elegida a coordenadas exactas para la Solar API.
3. **Solar API**: Proporciona el modelo 3D del tejado y la base de datos de radiación histórica.

---

## �️ Resumen de la API (`app/api/`)

- **/api/results**: Procesa el cálculo final y guarda la `Submission`.
- **/api/pdf**: Genera el informe PDF on-the-fly usando `@react-pdf/renderer`.
- **/api/pvgis**: (Opcional) Consulta la base de datos europea PVGIS para contrastar la radiación de Google.

---

## �️ Notas de Instalación Técnica
- **Sharp**: Requiere librerías nativas en el SO. El `Dockerfile` ya las incluye.
- **Prisma Generated**: El cliente de Prisma se genera en `/generated/prisma` para evitar conflictos en ciertos entornos de despliegue.
