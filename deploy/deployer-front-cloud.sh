#!/bin/bash

# -------------------------------------------------------------------------
# SCRIPT DE DESPLIEGUE FRONTEND MULTI-CLOUD (SOPORTE ZIP UNIVERSAL - V4)
# -------------------------------------------------------------------------

set -Eeuo pipefail

# Colores para la terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Manejador de errores críticos
trap cleanup SIGINT SIGTERM ERR
cleanup() {
    trap - SIGINT SIGTERM ERR
    echo -e "\n${RED}[CRÍTICO] El despliegue se detuvo. Verifica que el enlace sea un .ZIP público.${NC}"
    sudo rm -rf /tmp/cloud_front_working || true
    exit 1
}

echo -e "${YELLOW}====================================================${NC}"
echo -e "${YELLOW}   CLI FRONTEND CLOUD V4 - PROTECCIÓN ANTI-BLOQUEO   ${NC}"
echo -e "${YELLOW}====================================================${NC}"

# =========================================================================
# 1. RECOLECCIÓN DE DATOS
# =========================================================================
read -p "1. Dominio Principal para este Frontend (ej. actuaya.co): " DOMAIN
read -p "2. Enlace compartido del archivo .ZIP (Drive/OneDrive): " CLOUD_URL

FINAL_WWW_DIR="/var/www/front-$DOMAIN"
TMP_DIR="/tmp/cloud_front_working"
EXTRACT_DIR="$TMP_DIR/extracted"

if ! command -v unzip &> /dev/null; then
    sudo apt update && sudo apt install -y unzip
fi

# =========================================================================
# 2. DESCARGA DESDE LA NUBE (UN SOLO ARCHIVO ZIP = CERO BLOQUEOS)
# =========================================================================
echo -e "\n${YELLOW}[1/4] Descargando archivo comprimido...${NC}"
sudo rm -rf "$TMP_DIR" && mkdir -p "$TMP_DIR"
mkdir -p "$EXTRACT_DIR"

URL_PREP=$(echo "$CLOUD_URL" | tr -d ' ')

if [[ "$URL_PREP" == *drive.google.com* ]]; then
    echo -e "${GREEN}-> Proveedor: Google Drive (Descarga de archivo único)${NC}"
    if ! command -v gdown &> /dev/null; then
        sudo pip3 install --break-system-packages gdown || sudo apt install -y python3-gdown
    fi
    gdown "$URL_PREP" -O "$TMP_DIR/source.zip"
else
    echo -e "${GREEN}-> Proveedor: OneDrive (Descarga de archivo único)${NC}"
    CLEAN_URL=$(echo "$URL_PREP" | cut -d'?' -f1)
    if [[ "$URL_PREP" == *sharepoint.com* ]]; then
        DIRECT_URL="${CLEAN_URL}?download=1"
    else
        B64_URL=$(echo -n "$CLEAN_URL" | base64 -w 0 | tr -d '=' | tr '/+' '_-' | tr -d '\r\n ')
        DIRECT_URL="https://api.onedrive.com/v1.0/shares/u!$B64_URL/root/content"
    fi
    curl -f -L "$DIRECT_URL" -o "$TMP_DIR/source.zip"
fi

# =========================================================================
# 3. EXTRACCIÓN Y RASTREO INTELIGENTE DE CONTENIDO
# =========================================================================
echo -e "\n${YELLOW}[2/4] Descomprimiendo y localizando Frontend...${NC}"
sudo unzip -q "$TMP_DIR/source.zip" -d "$EXTRACT_DIR"

echo "Buscando el punto de entrada (index.html)..."
INDEX_PATH=$(find "$EXTRACT_DIR" -name "index.html" -print -quit)

if [ -z "$INDEX_PATH" ]; then
    echo -e "${RED}[ERROR] No se encontró ningún 'index.html' dentro del ZIP.${NC}"
    sudo rm -rf "$TMP_DIR"
    exit 1
fi

FRONT_SOURCE_DIR=$(dirname "$INDEX_PATH")
echo -e "${GREEN}-> ¡Frontend localizado con éxito en:${NC} $FRONT_SOURCE_DIR"

echo "Publicando archivos limpios en producción..."
sudo mkdir -p "$FINAL_WWW_DIR"
sudo rm -rf "$FINAL_WWW_DIR"/*
sudo cp -r "$FRONT_SOURCE_DIR"/* "$FINAL_WWW_DIR/"

sudo chown -R www-data:www-data "$FINAL_WWW_DIR"
sudo chmod -R 755 "$FINAL_WWW_DIR"
sudo rm -rf "$TMP_DIR"

# =========================================================================
# 4. CONFIGURACIÓN DE NGINX
# =========================================================================
echo -e "\n${YELLOW}[3/4] Sincronizando servidor Nginx...${NC}"

sudo tee /etc/nginx/sites-available/front-$DOMAIN > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    root $FINAL_WWW_DIR;
    index index.html index.htm;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|otf)$ {
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }
}
EOF

if [ ! -f "/etc/nginx/sites-enabled/front-$DOMAIN" ]; then
    sudo ln -s "/etc/nginx/sites-available/front-$DOMAIN" "/etc/nginx/sites-enabled/"
fi

sudo nginx -t
sudo systemctl restart nginx

# =========================================================================
# 5. ASIGNACIÓN DE CERTIFICADO SSL (HTTPS)
# =========================================================================
echo -e "\n${YELLOW}[4/4] Solicitando certificado SSL con Certbot...${NC}"
if sudo certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --redirect --register-unsafely-without-email; then
    echo -e "\n${GREEN}====================================================${NC}"
    echo -e "${GREEN}    ¡FRONTEND DESPLEGADO CON ÉXITO DESDE EL ZIP!    ${NC}"
    echo -e "${GREEN}====================================================${NC}"
    echo -e "${GREEN}🌐 Sitio Web Seguro:${NC} https://$DOMAIN"
else
    echo -e "\n${YELLOW}====================================================${NC}"
    echo -e "${YELLOW}   [AVISO] WEB MONTADA, PERO ESPERANDO PROPAGACIÓN   ${NC}"
    echo -e "Tu sitio ya responde en: http://$DOMAIN"
fi
