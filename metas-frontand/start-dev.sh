#!/bin/bash
# Script para iniciar a API do motor de distribuição e o frontend (Linux/Mac)

echo "======================================"
echo "Iniciando Motor de Distribuição de Metas"
echo "======================================"

# Mudar para diretório do motor
cd motor

# Verificar se o Python está instalado
if ! command -v python3 &> /dev/null; then
    echo "Erro: Python 3 não encontrado. Instale Python 3.8+ e tente novamente."
    exit 1
fi

# Instalar dependências
echo "Instalando dependências da API..."
pip3 install -q -r requirements.txt

# Iniciar a API em background
echo "Iniciando API na porta 5000..."
python3 api_server.py &
API_PID=$!

# Aguardar um segundo para a API iniciar
sleep 2

# Voltar ao diretório raiz
cd ..

# Iniciar o frontend
echo "Iniciando Frontend em http://localhost:5173"
npm run dev

# Limpar processo da API ao sair
trap "kill $API_PID" EXIT
