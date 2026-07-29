@echo off
REM Script para iniciar a API do motor de distribuicao e o frontend

echo ======================================
echo Iniciando Motor de Distribuicao de Metas
echo ======================================

set API_DIR=..\API-motor-metas

REM Verificar se o Python esta instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo Erro: Python nao encontrado. Instale Python 3.8+ e tente novamente.
    pause
    exit /b 1
)

REM Instalar dependencias (se necessario)
echo Instalando dependencias da API...
pip install -q -r "%API_DIR%\requirements.txt"

REM Iniciar a API em uma nova janela
echo Iniciando API na porta 5000...
start "Motor de Distribuicao - API" cmd /k "cd /d %~dp0%API_DIR% && python api_server.py"

REM Aguardar um segundo para a API iniciar
timeout /t 2 /nobreak

REM Iniciar o frontend (assumindo que voce tem npm/node instalado)
echo Iniciando Frontend em http://localhost:5173
npm run dev

pause
