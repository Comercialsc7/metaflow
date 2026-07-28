@echo off
REM Script para iniciar a API do motor de distribuição e o frontend

echo ======================================
echo Iniciando Motor de Distribuição de Metas
echo ======================================

REM Mudar para diretório do motor
cd motor

REM Verificar se o Python está instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo Erro: Python não encontrado. Instale Python 3.8+ e tente novamente.
    pause
    exit /b 1
)

REM Instalar dependências (se necessário)
echo Instalando dependências da API...
pip install -q -r requirements.txt

REM Iniciar a API em uma nova janela
echo Iniciando API na porta 5000...
start "Motor de Distribuição - API" python api_server.py

REM Aguardar um segundo para a API iniciar
timeout /t 2 /nobreak

REM Voltar ao diretório raiz
cd ..

REM Iniciar o frontend (assumindo que você tem npm/node instalado)
echo Iniciando Frontend em http://localhost:5173
npm run dev

pause
