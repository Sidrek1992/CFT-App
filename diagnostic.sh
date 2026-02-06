#!/bin/bash

# Script de Diagnóstico - CFT Correos

echo "🔍 Diagnóstico de CFT Correos"
echo "=============================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar archivo .env.local
echo "1. Verificando archivo .env.local..."
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✅ .env.local existe${NC}"
    
    # Verificar variables críticas
    if grep -q "GOOGLE_CLIENT_ID" .env.local; then
        echo -e "${GREEN}✅ GOOGLE_CLIENT_ID configurado${NC}"
    else
        echo -e "${RED}❌ GOOGLE_CLIENT_ID falta${NC}"
    fi
    
    if grep -q "GOOGLE_CLIENT_SECRET" .env.local; then
        echo -e "${GREEN}✅ GOOGLE_CLIENT_SECRET configurado${NC}"
    else
        echo -e "${RED}❌ GOOGLE_CLIENT_SECRET falta${NC}"
    fi
    
    if grep -q "SUPABASE_URL" .env.local; then
        echo -e "${GREEN}✅ SUPABASE_URL configurado${NC}"
    else
        echo -e "${RED}❌ SUPABASE_URL falta${NC}"
    fi
    
    if grep -q "GEMINI_API_KEY" .env.local; then
        echo -e "${GREEN}✅ GEMINI_API_KEY configurado${NC}"
    else
        echo -e "${RED}❌ GEMINI_API_KEY falta${NC}"
    fi
else
    echo -e "${RED}❌ .env.local NO existe${NC}"
    echo -e "${YELLOW}→ Copia .env.local.example a .env.local${NC}"
fi

echo ""

# Verificar node_modules
echo "2. Verificando dependencias..."
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ node_modules existe${NC}"
else
    echo -e "${RED}❌ node_modules NO existe${NC}"
    echo -e "${YELLOW}→ Ejecuta: npm install${NC}"
fi

echo ""

# Verificar puertos
echo "3. Verificando puertos..."

# Puerto 4000 (Backend)
if lsof -Pi :4000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}⚠️  Puerto 4000 está en uso${NC}"
    echo "   Proceso: $(lsof -Pi :4000 -sTCP:LISTEN | tail -1)"
else
    echo -e "${GREEN}✅ Puerto 4000 disponible${NC}"
fi

# Puerto 3000 (Frontend)
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}⚠️  Puerto 3000 está en uso${NC}"
    echo "   Proceso: $(lsof -Pi :3000 -sTCP:LISTEN | tail -1)"
else
    echo -e "${GREEN}✅ Puerto 3000 disponible${NC}"
fi

echo ""

# Verificar conexión a Supabase
echo "4. Verificando conexión a Supabase..."
if [ -f ".env.local" ]; then
    SUPABASE_URL=$(grep SUPABASE_URL .env.local | cut -d '=' -f2)
    if [ ! -z "$SUPABASE_URL" ]; then
        if curl -s -f "$SUPABASE_URL" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Supabase accesible${NC}"
        else
            echo -e "${RED}❌ No se puede conectar a Supabase${NC}"
            echo -e "${YELLOW}→ Verifica tu conexión a internet${NC}"
        fi
    fi
fi

echo ""

# Verificar si el servidor está corriendo
echo "5. Verificando servidor backend..."
if curl -s http://localhost:4000/api/health > /dev/null 2>&1; then
    HEALTH=$(curl -s http://localhost:4000/api/health)
    echo -e "${GREEN}✅ Servidor backend corriendo${NC}"
    echo "   Health check: $HEALTH"
else
    echo -e "${RED}❌ Servidor backend NO está corriendo${NC}"
    echo -e "${YELLOW}→ Ejecuta: npm run server${NC}"
fi

echo ""

# Verificar si el frontend está corriendo
echo "6. Verificando frontend..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend corriendo${NC}"
else
    echo -e "${RED}❌ Frontend NO está corriendo${NC}"
    echo -e "${YELLOW}→ Ejecuta: npm run dev${NC}"
fi

echo ""
echo "=============================="
echo "Diagnóstico completado"
echo ""

# Resumen
echo "📋 Resumen:"
echo ""
echo "Para ejecutar la aplicación:"
echo "  Terminal 1: npm run server"
echo "  Terminal 2: npm run dev"
echo "  Navegador: http://localhost:3000"
echo ""
echo "Para ver logs detallados:"
echo "  Revisa la terminal donde corre 'npm run server'"
echo ""
echo "Documentación:"
echo "  - TROUBLESHOOTING.md - Solución de problemas"
echo "  - START_HERE.md - Guía de inicio"
echo "  - GUIA_RAPIDA.md - Ejecutar en local"
