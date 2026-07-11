# 📋 Briefing Técnico — ActuaYa App (para Gemini)

## ¿Qué es esta app?
**ActuaYa** es una plataforma web SaaS de productividad y gestión comercial para emprendedores y pequeñas empresas en Latinoamérica. Quiero subirla al subdominio **www.actuaya.co** usando **Hostinger** como hosting.

---

## 🛠️ Stack Tecnológico

| Tecnología | Versión | Detalles |
|------------|---------|----------|
| **Framework** | Angular 21.2 | Standalone components, signals, lazy loading |
| **Lenguaje** | TypeScript 5.9.2 | |
| **Estilos** | SCSS | Variables centralizadas en `src/styles/` |
| **Build Tool** | @angular/build 21.2.3 | (Vite-based, NO webpack) |
| **Package Manager** | npm 11.9 | |
| **Node requerido** | v22+ | Para compilar localmente |

---

## 📁 Estructura del Proyecto

```
actuaya/
├── src/                        ← Angular SPA source
│   ├── app/
│   │   ├── core/              ← Services, Guards, Models
│   │   │   ├── guards/        ← auth.guard.ts, device.guard.ts
│   │   │   ├── models/        ← Interfaces TypeScript
│   │   │   └── services/      ← 19 servicios (goal, sales, cashflow, etc.)
│   │   ├── features/
│   │   │   ├── home/          ← Landing page (ruta: /)
│   │   │   ├── login/         ← Login (ruta: /login)
│   │   │   ├── welcome/       ← Registro (ruta: /welcome)
│   │   │   ├── module-picker/ ← Setup (ruta: /setup)
│   │   │   ├── desktop/       ← 13 módulos desktop (ruta: /d/...)
│   │   │   └── mobile/        ← 6 vistas mobile (ruta: /m/...)
│   │   ├── layouts/
│   │   │   ├── desktop-layout/ ← Shell con sidebar + topbar
│   │   │   └── mobile-layout/  ← Shell mobile con bottom nav
│   │   ├── shared/            ← Componentes reutilizables (um-icon)
│   │   ├── app.routes.ts      ← Todas las rutas (40+)
│   │   └── app.ts             ← Root component
│   ├── assets/                ← Iconos, imágenes
│   ├── environments/
│   │   ├── environment.ts     ← Dev: apiUrl → localhost:3000
│   │   └── environment.prod.ts← Prod: apiUrl → actuaya.co/api
│   ├── styles/                ← Variables SCSS globales, mixins
│   ├── index.html             ← Entry point
│   └── styles.scss            ← Estilos globales
├── backend/                    ← ⭐ Express 5 + MongoDB Local
│   ├── server.js              ← Servidor Express principal
│   ├── models/data.model.js   ← Modelo Mongoose key-value
│   ├── routes/data.routes.js  ← API REST (reemplaza data.php)
│   ├── .env                   ← Config MongoDB URI + tokens
│   └── package.json
├── dist/browser/              ← ⭐ BUILD DE PRODUCCIÓN (frontend)
├── proxy.conf.json             ← Dev proxy /api → :3000
├── docker-compose.yml          ← Dev local (Mongo + Node + Angular)
├── nginx/performance.conf      ← Gzip + cache para Nginx
├── .github/workflows/deploy.yml← CI/CD GitHub Actions
├── angular.json
├── package.json
└── tsconfig.json
```

---

## 🔗 Rutas de la App (SPA - Single Page Application)

| Ruta | Componente | Acceso |
|------|-----------|--------|
| `/` | Landing Page | Público |
| `/login` | Login | Público |
| `/welcome` | Registro | Público |
| `/setup` | Selector de módulos | Post-registro |
| `/d/dashboard` | Dashboard principal | 🔒 authGuard |
| `/d/goals` | Metas y Objetivos | 🔒 authGuard |
| `/d/goals/tree` | Árbol de Metas | 🔒 authGuard |
| `/d/sales` | Pipeline de Ventas | 🔒 authGuard |
| `/d/sales/deals` | Deal Tracker | 🔒 authGuard |
| `/d/radar` | CRM Pre-Pipeline | 🔒 authGuard |
| `/d/cashflow` | Flujo de Caja | 🔒 authGuard |
| `/d/profitability` | Calculadora Rentabilidad | 🔒 authGuard |
| `/d/licitaciones` | Licitaciones (IA) | 🔒 authGuard |
| `/d/catalog` | Catálogo / Cotizador | 🔒 authGuard |
| `/d/inventory` | Control de Inventario | 🔒 authGuard |
| `/d/shifts` | Gestión de Turnos | 🔒 authGuard |
| `/d/analytics` | Analítica Unificada | 🔒 authGuard |
| `/d/settings` | Configuración | 🔒 authGuard |
| `/m/today` | Vista Móvil - Hoy | 🔒 authGuard |
| `/m/focus` | Vista Móvil - Enfoque | 🔒 authGuard |

---

## 💾 Persistencia de Datos

**La app usa un backend Express 5 + MongoDB Local** para persistir datos, con la misma arquitectura de TESTEA.

- El `DataSyncService` sincroniza localStorage ↔ MongoDB vía Express API (`/api/data`)
- El `StorageService` usa `localStorage` con prefijo `um_` como caché offline
- En desarrollo: `proxy.conf.json` redirige `/api/*` → `localhost:3000` (Express)
- En producción: Nginx redirige `/api/*` → Express (PM2)

**Stack backend:**
| Componente | Tecnología |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express 5 |
| ORM | Mongoose 9 |
| Base de datos | MongoDB 6 Local (VPS) |
| Process Manager | PM2 (producción) |
| CI/CD | GitHub Actions (self-hosted runner) |

---

## 📦 Build de Producción

### Comando para generar el build:
```bash
cd /ruta/al/proyecto/actuaya
npm run build
# o equivalente: npx ng build --configuration=production
```

### Output del build:
```
Directorio de salida: dist/browser/
Tamaño total: ~1.3 MB
Archivos: 63 archivos (index.html, .js chunks, .css, assets/)
Errores: 0
```

### Archivos clave en el build:
```
dist/browser/
├── index.html          ← Punto de entrada de la SPA
├── main-XXXXXX.js      ← Bundle principal
├── styles-XXXXXX.css   ← Estilos globales compilados
├── chunk-*.js           ← ~55 chunks lazy-loaded
├── favicon.ico
└── assets/              ← Iconos y recursos estáticos
```

---

## ⚙️ Configuración del Servidor (.htaccess)

La app ya incluye un `.htaccess` que se copia automáticamente al build. Configura:

1. **SPA Routing**: Redirige todas las rutas a `index.html` (necesario para que Angular maneje las rutas como `/d/dashboard`, `/login`, etc.)
2. **HTTPS forzado**: Redirige HTTP → HTTPS
3. **Compresión GZIP**: Para JS, CSS, JSON, etc.
4. **Cache agresivo**: 1 año para assets estáticos (los hashes en los nombres de archivo permiten cache-busting)

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  # Forzar HTTPS
  RewriteCond %{HTTPS} off
  RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
  # SPA: redirigir todo a index.html
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

---

## 🌐 Configuración de Despliegue en Hostinger VPS

### Datos del deploy:
| Campo | Valor |
|-------|-------|
| **Subdominio destino** | `actuaya.co` |
| **Hosting** | Hostinger VPS (KVM 2) |
| **Tipo de app** | Angular SPA + Express Backend |
| **Frontend** | Nginx sirve `dist/browser/` |
| **Backend** | Express 5 + Mongoose → MongoDB Local (VPS) |
| **Requiere Node.js?** | ✅ SÍ (v18+ para el backend Express) |
| **Requiere MongoDB?** | ✅ SÍ (MongoDB 6 local en el VPS) |
| **Requiere SSL?** | ✅ SÍ (Certbot / Let's Encrypt) |
| **Process Manager** | PM2 (backend Express) |
| **CI/CD** | GitHub Actions (self-hosted runner) |

### Pasos de deploy:
1. **Nginx**: Configurar site para servir SPA + reverse proxy `/api/*` → Express
2. **Backend**: `cd backend && npm install --production`
3. **PM2**: `pm2 start backend/server.js --name actuaya-backend`
4. **Build frontend**: `npx ng build --configuration production`
5. **Copiar dist**: `cp -r dist/browser/* /var/www/actuaya.co/dist/browser/`
6. **SSL**: Certbot para `actuaya.co`
7. **Verificar**: `curl https://actuaya.co/api/status` → 200 OK

---

## 📱 Responsividad

La app tiene dos layouts que se detectan automáticamente:
- **Desktop** (`/d/...`): Sidebar izquierdo + área de contenido. Diseñado para pantallas ≥ 768px.
- **Mobile** (`/m/...`): Bottom navigation tab bar. Diseñado para pantallas < 768px.
- **Landing page** (`/`): Diseño responsive propio.

---

## 🎨 Design System

- **Paleta**: "Soft Mint" → fondos claros (#F0FAF7), acentos violeta (#6c5ce7), teal (#00b4a6)
- **Tipografía**: System fonts (sin Google Fonts externas activas)
- **Tema oscuro**: Soportado vía `ThemeService` (toggle en topbar)
- **Iconos**: Sistema `um-icon` con SVGs inline (no depende de CDN externo)

---

## 🔮 Próximos Pasos (Post-Deploy)

1. **Autenticación real**: Implementar JWT con refresh tokens.
2. **PDF Export**: jspdf para cotizaciones del Cotizador.
3. **PWA**: Service worker para acceso offline.
4. **Migración de datos**: Script para migrar JSON flat-files existentes a MongoDB.

---

> **Resumen**: ActuaYa usa la misma arquitectura que TESTEA: Angular SPA servida por Nginx + Express 5 backend con MongoDB Local + PM2 + GitHub Actions CI/CD. El deploy se realiza automáticamente al hacer push a `main`.
