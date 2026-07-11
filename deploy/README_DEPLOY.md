# Guía de Despliegue en VPS Virtuales (ActuaYa)

Esta guía explica paso a paso cómo subir los archivos y ejecutar los scripts de despliegue automatizado en los servidores VPS, siguiendo la arquitectura especificada en el **Documento Maestro de Operaciones**.

---

## 📦 1. Archivos Generados en la Carpeta `deploy/`

En la carpeta `deploy/` de este proyecto se encuentran los siguientes componentes preparados y listos para subir:

- **`frontend.zip`**: Compilación de producción optimizada del Frontend Angular SPA.
- **`backend.zip`**: Código fuente del Backend Express 5 (incluye `server.js`, `models/`, `routes/`, y configuración `.env`).
- **`deployer-front-cloud.sh`**: Script ejecutable de instalación automatizada para el VPS Frontend.
- **`deployer-back-cloud.sh`**: Script ejecutable de instalación automatizada para el VPS Backend.

---

## ☁️ 2. Preparación previa (Cargue a la Nube)

1. Subir los archivos **`frontend.zip`** y **`backend.zip`** a tu servicio de almacenamiento en la nube (Google Drive o OneDrive).
2. Asegurarse de que ambos archivos tengan **permisos de acceso público** (Cualquier persona con el enlace puede ver/descargar).
3. Copiar los enlaces públicos de descarga.

---

## 🚀 3. Ejecución del Despliegue en el VPS Frontend

### Dominio: `actuaya.co` (y `www.actuaya.co`)

1. **Conectarse al VPS Frontend vía SSH**:
   ```bash
   ssh root@<IP_DEL_VPS_FRONTEND>
   ```
2. **Subir o copiar el script `deployer-front-cloud.sh`** al directorio principal (`~/`):
   ```bash
   chmod +x ~/deployer-front-cloud.sh
   ```
3. **Ejecutar el script**:
   ```bash
   ~/deployer-front-cloud.sh
   ```
4. **Ingresar la información solicitada cuando la terminal lo pida**:
   - **Dominio Principal**: `actuaya.co`
   - **Enlace del ZIP**: *(Pegar el enlace público de `frontend.zip`)*

El script se encargará de instalar `unzip` / `gdown`, extraer el frontend a `/var/www/front-actuaya.co`, configurar Nginx con soporte SPA y emitir el certificado SSL con Certbot.

---

## ⚙️ 4. Ejecución del Despliegue en el VPS Backend

### Dominio: `api.actuaya.co`

1. **Conectarse al VPS Backend vía SSH**:
   ```bash
   ssh root@<IP_DEL_VPS_BACKEND>
   ```
2. **Subir o copiar el script `deployer-back-cloud.sh`** al directorio principal (`~/`):
   ```bash
   chmod +x ~/deployer-back-cloud.sh
   ```
3. **Ejecutar el script**:
   ```bash
   ~/deployer-back-cloud.sh
   ```
4. **Ingresar los parámetros solicitados**:
   1. **Subdominio API**: `api.actuaya.co`
   2. **Enlace del ZIP**: *(Pegar el enlace público de `backend.zip`)*
   3. **Puerto interno Node.js**: `3002`
   4. **Nombre de Base de Datos**: `actuaya_db`
   5. **Token de seguridad (AUTH_TOKEN)**: `cada38hydf`
   6. **CORS_ORIGIN permitido**: `https://actuaya.co`

El script extraerá la API en `/var/www/api.actuaya.co`, escribirá las variables `.env`, ejecutará `npm install --production`, iniciará el proceso en PM2, configurará el Proxy Inverso en Nginx y activará el certificado SSL con Certbot.

---

## 🔍 5. Comandos Útiles de Diagnóstico y Mantenimiento

En caso de cualquier eventualidad en los servidores, puedes usar:

| Acción | Comando en el VPS |
|---|---|
| Estado de Nginx | `sudo systemctl status nginx` |
| Ver logs de error Nginx | `sudo tail -f /var/log/nginx/error.log` |
| Lista de procesos Node.js | `pm2 list` |
| Ver logs de la API en PM2 | `pm2 logs api.actuaya.co` |
| Reiniciar servicios Node | `pm2 restart all` |
| Renovar certificados SSL | `sudo certbot renew` |
