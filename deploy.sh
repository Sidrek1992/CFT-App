#!/bin/bash

# Script de Deployment para Vercel - CFT Correos

echo "🚀 Iniciando deployment a Vercel..."

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

# Verificar que tenemos vercel CLI
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vercel CLI no está instalado.${NC}"
    echo -e "${BLUE}Instalando Vercel CLI...${NC}"
    npm i -g vercel
fi

# Verificar variables de entorno
echo -e "${BLUE}📋 Verificando variables de entorno...${NC}"

if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ Error: No se encuentra .env.production${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Archivo .env.production encontrado${NC}"

# Build local para verificar
echo -e "${BLUE}🔨 Construyendo proyecto localmente...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error en el build. Por favor corrige los errores antes de deployar.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build exitoso${NC}"

# Preguntar si quiere hacer deploy
echo -e "${YELLOW}¿Deseas hacer deploy a producción? (y/n)${NC}"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo -e "${BLUE}🚀 Deployando a Vercel...${NC}"
    vercel --prod
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Deploy exitoso!${NC}"
        echo -e "${BLUE}🌐 Tu aplicación está en: https://app-correo-ten.vercel.app${NC}"
        echo ""
        echo -e "${YELLOW}📝 Próximos pasos:${NC}"
        echo "1. Verifica que las variables de entorno estén configuradas en Vercel"
        echo "2. Actualiza los redirect URIs en Google Cloud Console"
        echo "3. Prueba la autenticación OAuth"
        echo "4. Verifica el health check: https://app-correo-ten.vercel.app/api/health"
    else
        echo -e "${RED}❌ Error en el deploy${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}Deploy cancelado${NC}"
    exit 0
fi
