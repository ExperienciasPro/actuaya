#!/bin/bash

# -------------------------------------------------------------------------
# SCRIPT DE DESPLIEGUE BACKEND MULTI-CLOUD (GOOGLE DRIVE / ONEDRIVE ZIP)
# -------------------------------------------------------------------------

set -Eeuo pipefail
trap cleanup SIGINT SIGTERM ERR

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cleanup() {
    trap - SIGINT SIGTERM ERR
    echo -e "\n${RED}[ERROR] El despliegue falló. Verifica que tu enlace sea público y compartido.${NC}"
    sudo rm -rf /tmp/cloud_back || true
    exit 1
}

echo -e "${YELLOW}====================================================${NC}"
echo -e "${YELLOW}   CLI BACKEND MULTI-CLOUD - DEVOPS EXPERT 2026     ${NC}"
echo -e "${YELLOW}====================================================${NC}"

# =========================================================================
# 1. RECOLECCIÓN DE DATOS
# =========================================================================
read -p "1. Subdominio para esta API (ej. api.actuaya.co): " DOMAIN
read -p "2. Enlace compartido (Google Drive o OneDrive): " CLOUD_URL
read -p "3. Puerto interno de Node.js (ej. 3002): " APP_PORT
read -p "4. Nombre de la Base de Datos (ej. actuaya_db): " DB_NAME
read -p "5. Token de seguridad (AUTH_TOKEN): " API_TOKEN
read -p "6. CORS_ORIGIN permitido (ej. https://actuaya.co): " CORS_ORIGIN

APP_DIR="/var/www/$DOMAIN"
TMP_DIR="/tmp/cloud_back"

echo -e "\n${YELLOW}[1/5] Validando entorno y puertos...${NC}"
if ss -tuln | grep -q ":$APP_PORT "; then
    echo -e "${RED}[CRÍTICO] El puerto $APP_PORT ya está ocupado por otra app.${NC}"
    exit 1
fi

if ! command -v unzip &> /dev/null; then
    sudo apt update && sudo apt install -y unzip
fi

# =========================================================================
# 2. DETECCIÓN AUTOMÁTICA DE PLATAFORMA Y DESCARGA
# =========================================================================
echo -e "\n${YELLOW}[2/5] Detectando proveedor de almacenamiento...${NC}"
sudo rm -rf "$TMP_DIR" && mkdir -p "$TMP_DIR"
URL_PREP=$(echo "$CLOUD_URL" | tr -d ' ')

if [[ "$URL_PREP" == *drive.google.com* ]]; then
    echo -e "${GREEN}-> Proveedor detectado: Google Drive${NC}"
    if ! command -v gdown &> /dev/null; then
        echo "Instalando soporte para Google Drive (gdown)..."
        sudo pip3 install --break-system-packages gdown || sudo apt install -y python3-gdown
    fi
    echo "Descargando archivo ZIP desde Google Drive..."
    gdown "$URL_PREP" -O "$TMP_DIR/source.zip"

elif [[ "$URL_PREP" == *sharepoint.com* ]]; then
    echo -e "${GREEN}-> Proveedor detectado: OneDrive Business / SharePoint${NC}"
    CLEAN_URL=$(echo "$URL_PREP" | cut -d'?' -f1)
    DIRECT_URL="${CLEAN_URL}?download=1"
    echo "Descargando desde SharePoint..."
    curl -f -L "$DIRECT_URL" -o "$TMP_DIR/source.zip"

else
    echo -e "${GREEN}-> Proveedor detectado: OneDrive Personal${NC}"
    CLEAN_URL=$(echo "$URL_PREP" | cut -d'?' -f1)
    B64_URL=$(echo -n "$CLEAN_URL" | base64 -w 0 | tr -d '=' | tr '/+' '_-' | tr -d '\r\n ')
    DIRECT_URL="https://api.onedrive.com/v1.0/shares/u!$B64_URL/root/content"
    echo "Descargando desde OneDrive..."
    curl -f -L "$DIRECT_URL" -o "$TMP_DIR/source.zip"
fi

# =========================================================================
# 3. EXTRAER CÓDIGO Y PREPARAR ENTORNO NODE.JS
# =========================================================================
echo -e "\n${YELLOW}[3/5] Descomprimiendo código fuente...${NC}"
sudo mkdir -p "$APP_DIR"
sudo rm -rf "$APP_DIR"/*

sudo unzip -q "$TMP_DIR/source.zip" -d "$APP_DIR"
cd "$APP_DIR"

# Validar si el archivo comprimido venía envuelto dentro de otra subcarpeta
if [ $(ls -1 | wc -l) -eq 1 ] && [ -d */ ]; then
    INTERNAL_DIR=$(ls -d */ | head -n 1)
    echo "Ajustando estructura de subcarpeta raíz detectada: $INTERNAL_DIR"
    sudo mv "$INTERNAL_DIR"* . 2>/dev/null || true
    sudo mv "$INTERNAL_DIR".* . 2>/dev/null || true
    sudo rm -rf "$INTERNAL_DIR"
fi

sudo chown -R $USER:$USER "$APP_DIR"

echo "Escribiendo archivo de variables de entorno .env..."
cat <<EOF > .env
PORT=$APP_PORT
MONGODB_URI=mongodb://127.0.0.1:27017/$DB_NAME
DB_NAME=$DB_NAME
AUTH_TOKEN=$API_TOKEN
CORS_ORIGIN=$CORS_ORIGIN
EOF

echo "Instalando paquetes de producción (npm install)..."
npm install --production

echo "Iniciando servicio en PM2..."
pm2 delete "$DOMAIN" 2>/dev/null || true
pm2 start server.js --name "$DOMAIN" --update-env
pm2 save

sudo rm -rf "$TMP_DIR"

# =========================================================================
# 4. CONFIGURACIÓN DEL PROXY INVERSO EN NGINX
# =========================================================================
echo -e "\n${YELLOW}[4/5] Vinculando Proxy Inverso en Nginx...${NC}"
sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF

if [ ! -f "/etc/nginx/sites-enabled/$DOMAIN" ]; then
    sudo ln -s "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/"
fi

sudo nginx -t
sudo systemctl restart nginx

# =========================================================================
# 5. ASIGNACIÓN DE CERTIFICADO SSL (HTTPS)
# =========================================================================
echo -e "\n${YELLOW}[5/5] Solicitando certificado SSL con Certbot...${NC}"
sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --redirect --register-unsafely-without-email

echo -e "\n${GREEN}====================================================${NC}"
echo -e "${GREEN}   ¡API DESPLEGADA DE FORMA EXITOSA EN LA NUBE!     ${NC}"
echo -e "${GREEN}====================================================${NC}"
echo -e "${GREEN}🔗 URL Pública API:${NC} https://$DOMAIN/"
echo -e "${GREEN}🤖 Proceso PM2:${NC} $DOMAIN"
echo -e "${GREEN}🍃 Base de Datos:${NC} $DB_NAME"
