#!/bin/bash

# Script de Build para Hostinger - CFT Correos

echo "🚀 Preparando build para Hostinger..."

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: No se encuentra package.json. Ejecuta este script desde la raíz del proyecto.${NC}"
    exit 1
fi

# Verificar variables de entorno (opcional en Hostinger)
echo -e "${BLUE}📋 Verificando variables de entorno locales...${NC}"

if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}⚠️  No se encuentra .env.production (usa variables en Hostinger).${NC}"
else
    echo -e "${GREEN}✅ Archivo .env.production encontrado${NC}"
fi

# Instalar dependencias
echo -e "${BLUE}📦 Instalando dependencias...${NC}"
npm install

# Build local para producción
echo -e "${BLUE}🔨 Construyendo proyecto para producción...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error en el build. Por favor corrige los errores antes de deployar.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build exitoso${NC}"

echo -e "${BLUE}🌐 Siguientes pasos en Hostinger:${NC}"
echo "1. Sube el proyecto (incluye dist/ y server/)"
echo "2. Configura la app Node.js con entry: server/index.js"
echo "3. Define las variables de entorno en hPanel"
echo "4. Reinicia la aplicación"
echo "5. Verifica: https://goldenrod-cormorant-780503.hostingersite.com/api/health"
