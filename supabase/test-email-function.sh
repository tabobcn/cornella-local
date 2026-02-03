#!/bin/bash

# ==============================================
# SCRIPT DE TESTING DE EMAILS
# ==============================================
# Prueba la Edge Function de emails
# ==============================================

set -e

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🧪 Testing Email Function"
echo "========================="
echo ""

# Solicitar datos
read -p "Project Ref (ej: abcdefghijklmnop): " PROJECT_REF
read -p "Anon Key (ej: eyJhbGc...): " ANON_KEY
read -p "Email destino (tu email): " EMAIL_TO

if [ -z "$PROJECT_REF" ] || [ -z "$ANON_KEY" ] || [ -z "$EMAIL_TO" ]; then
    echo -e "${RED}❌ Todos los campos son requeridos${NC}"
    exit 1
fi

FUNCTION_URL="https://$PROJECT_REF.supabase.co/functions/v1/send-email"

echo ""
echo -e "${BLUE}Testing 5 tipos de emails...${NC}"
echo ""

# Test 1: Nuevo presupuesto
echo -e "${YELLOW}1/5 Enviando: Nueva solicitud de presupuesto...${NC}"
curl -X POST $FUNCTION_URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d "{
    \"type\": \"new_budget_request\",
    \"to\": \"$EMAIL_TO\",
    \"data\": {
      \"business_name\": \"Café del Barrio\",
      \"category\": \"Reformas\",
      \"description\": \"Necesito pintar las paredes del local y cambiar el suelo\",
      \"urgency\": \"urgent\",
      \"app_url\": \"https://cornellalocal.vercel.app\"
    }
  }"

echo ""
sleep 2

# Test 2: Respuesta a presupuesto
echo -e "${YELLOW}2/5 Enviando: Respuesta a presupuesto...${NC}"
curl -X POST $FUNCTION_URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d "{
    \"type\": \"budget_response\",
    \"to\": \"$EMAIL_TO\",
    \"data\": {
      \"business_name\": \"Reformas García\",
      \"estimated_price\": \"1,500\",
      \"notes\": \"Incluye materiales y mano de obra. Trabajo estimado: 3 días.\",
      \"app_url\": \"https://cornellalocal.vercel.app\"
    }
  }"

echo ""
sleep 2

# Test 3: Nueva candidatura
echo -e "${YELLOW}3/5 Enviando: Nueva candidatura...${NC}"
curl -X POST $FUNCTION_URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d "{
    \"type\": \"new_job_application\",
    \"to\": \"$EMAIL_TO\",
    \"data\": {
      \"business_name\": \"Cafetería La Esquina\",
      \"job_title\": \"Camarero/a\",
      \"candidate_name\": \"María López\",
      \"candidate_email\": \"maria@example.com\",
      \"candidate_phone\": \"+34 666 777 888\",
      \"message\": \"Tengo 3 años de experiencia en hostelería y disponibilidad inmediata.\",
      \"app_url\": \"https://cornellalocal.vercel.app\"
    }
  }"

echo ""
sleep 2

# Test 4: Cambio de estado - Contratado
echo -e "${YELLOW}4/5 Enviando: Candidatura - Contratado...${NC}"
curl -X POST $FUNCTION_URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d "{
    \"type\": \"application_status_change\",
    \"to\": \"$EMAIL_TO\",
    \"data\": {
      \"candidate_name\": \"Carlos Ruiz\",
      \"job_title\": \"Dependiente\",
      \"business_name\": \"Librería Cervantes\",
      \"status\": \"hired\",
      \"app_url\": \"https://cornellalocal.vercel.app\"
    }
  }"

echo ""
sleep 2

# Test 5: Cambio de estado - Entrevista
echo -e "${YELLOW}5/5 Enviando: Candidatura - Entrevista programada...${NC}"
curl -X POST $FUNCTION_URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d "{
    \"type\": \"application_status_change\",
    \"to\": \"$EMAIL_TO\",
    \"data\": {
      \"candidate_name\": \"Ana García\",
      \"job_title\": \"Vendedor/a\",
      \"business_name\": \"Moda y Estilo\",
      \"status\": \"shortlisted\",
      \"interview_date\": \"2026-02-10T10:00:00Z\",
      \"app_url\": \"https://cornellalocal.vercel.app\"
    }
  }"

echo ""
echo ""
echo -e "${GREEN}✅ Tests completados!${NC}"
echo ""
echo -e "${BLUE}Revisa tu bandeja de entrada: $EMAIL_TO${NC}"
echo -e "${YELLOW}Si no ves los emails:${NC}"
echo "  1. Revisa la carpeta de spam"
echo "  2. Verifica que el dominio esté verificado en Resend"
echo "  3. Revisa los logs: supabase functions logs send-email"
echo ""
echo -e "${BLUE}Ver emails enviados: https://resend.com/emails${NC}"
