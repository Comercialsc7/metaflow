#!/bin/bash
# Script para iniciar a API do motor de distribuicao e o frontend (Linux/Mac)

echo "======================================"
echo "Iniciando Motor de Distribuicao de Metas"
echo "======================================"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$SCRIPT_DIR/../API-motor-metas/API-motor-metas"

# Verificar se o Python esta instalado
if ! command -v python3 &> /dev/null; then
    echo "Erro: Python 3 nao encontrado. Instale Python 3.8+ e tente novamente."
    exit 1
fi

# Instalar dependencias
echo "Instalando dependencias da API..."
pip3 install -q -r "$API_DIR/requirements.txt"

# Iniciar a API em background
echo "Iniciando API na porta 5000..."
(cd "$API_DIR" && python3 api_server.py) &
API_PID=$!

# Aguardar um segundo para a API iniciar
sleep 2

# Iniciar o frontend
echo "Iniciando Frontend em http://localhost:5173"
npm run dev

# Limpar processo da API ao sair
trap "kill $API_PID" EXIT
