#!/bin/bash

# ==============================================
# SCRIPT DE CONFIGURACIÓN RÁPIDA DE EMAILS
# ==============================================
# Automatiza la configuración de notificaciones
# por email con Resend + Supabase
# ==============================================

set -e

echo "📧 Configuración de Notificaciones por Email"
echo "============================================="
echo ""

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar que supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI no está instalado${NC}"
    echo "Instala con: npm install -g supabase"
    exit 1
fi

echo -e "${GREEN}✓ Supabase CLI detectado${NC}"
echo ""

# Preguntar por project ref
echo -e "${BLUE}1. Ingresa tu Project Reference ID${NC}"
echo "   (Dashboard → Settings → General → Reference ID)"
read -p "   Project Ref: " PROJECT_REF

if [ -z "$PROJECT_REF" ]; then
    echo -e "${RED}❌ Project Ref es requerido${NC}"
    exit 1
fi

echo ""

# Preguntar por Resend API Key
echo -e "${BLUE}2. Ingresa tu Resend API Key${NC}"
echo "   (https://resend.com/api-keys)"
read -sp "   API Key: " RESEND_API_KEY
echo ""

if [ -z "$RESEND_API_KEY" ]; then
    echo -e "${RED}❌ Resend API Key es requerida${NC}"
    exit 1
fi

echo ""

# Login a Supabase
echo -e "${BLUE}3. Conectando con Supabase...${NC}"
supabase link --project-ref $PROJECT_REF || {
    echo -e "${RED}❌ Error al conectar con Supabase${NC}"
    exit 1
}

echo -e "${GREEN}✓ Conectado a Supabase${NC}"
echo ""

# Configurar secreto
echo -e "${BLUE}4. Configurando API Key de Resend...${NC}"
supabase secrets set RESEND_API_KEY=$RESEND_API_KEY || {
    echo -e "${RED}❌ Error al configurar secreto${NC}"
    exit 1
}

echo -e "${GREEN}✓ API Key configurada${NC}"
echo ""

# Desplegar función
echo -e "${BLUE}5. Desplegando Edge Function...${NC}"
supabase functions deploy send-email || {
    echo -e "${RED}❌ Error al desplegar función${NC}"
    exit 1
}

echo -e "${GREEN}✓ Edge Function desplegada${NC}"
echo ""

# Verificar secretos
echo -e "${BLUE}6. Verificando configuración...${NC}"
supabase secrets list

echo ""
echo -e "${GREEN}✅ Configuración completada con éxito!${NC}"
echo ""
echo -e "${YELLOW}PRÓXIMOS PASOS:${NC}"
echo "1. Ve a Supabase Dashboard → Database → Extensions"
echo "2. Habilita la extensión 'pg_net'"
echo "3. Ejecuta el script SQL: setup-email-triggers.sql"
echo "4. Configura variables de app en SQL Editor:"
echo ""
echo "   ALTER DATABASE postgres SET app.settings.supabase_url TO 'https://$PROJECT_REF.supabase.co';"
echo "   ALTER DATABASE postgres SET app.settings.supabase_anon_key TO 'TU_ANON_KEY';"
echo ""
echo "5. ¡Prueba enviando un presupuesto o candidatura!"
echo ""
echo -e "${BLUE}📚 Guía completa: supabase/EMAIL-SETUP-GUIDE.md${NC}"
