# Guia de Inicialização - Motor de Distribuição de Metas

## Pré-requisitos
- Node.js 16+ (para frontend)
- Python 3.8+ (para API)
- pip (gerenciador de pacotes Python)

## Instalação

### 1. Instalar dependências do Python (API)
```bash
cd ../API-motor-metas/API-motor-metas
pip install -r requirements.txt
```

### 2. Instalar dependências do Frontend
```bash
npm install
cp .env.example .env
```

## Execução

### Opção 1: Script automatizado (Windows)
```bash
start-dev.bat
```

### Opção 2: Script automatizado (Linux/Mac)
```bash
chmod +x start-dev.sh
./start-dev.sh
```

### Opção 3: Manual (Terminal 1 - API)
```bash
cd ../API-motor-metas/API-motor-metas
python api_server.py
# Ou em Linux/Mac:
python3 api_server.py
```

### Opção 3: Manual (Terminal 2 - Frontend)
```bash
npm run dev
```

## URLs
- Frontend: http://localhost:5173
- API Health: http://localhost:5000/api/health
- API Distribuir Metas: POST http://localhost:5000/api/distribuir-metas

A URL da API pode ser alterada em `.env` via `VITE_API_BASE_URL`.

## Troubleshooting

### Erro: "módulo 'distribuir_metas_por_fornecedor' não encontrado"
- Certifique-se de estar no diretório `../API-motor-metas/API-motor-metas`
- Verifique se `distribuir_metas_por_fornecedor.py` e `distribuir_metas.py` existem nessa pasta

### Erro: "Port 5000 already in use"
- A API já está rodando em outra instância
- Matando processo: `lsof -ti:5000 | xargs kill -9` (Linux/Mac) ou `netstat -ano | findstr :5000` (Windows)

### Erro: "Python not found"
- Instale Python de https://www.python.org/downloads/
- No Windows, marque "Add Python to PATH" durante instalação

## Estrutura da Distribuição

O fluxo de distribuição funciona assim:

1. **Frontend** monta a estrutura:
   ```
   {
     "FORNECEDOR_1": [
       { "media": 1000, "historico": 1200, "equipe": "EQ1", "vendedor": "V1" },
       { "media": 500, "historico": 600, "equipe": "EQ2", "vendedor": "V2" }
     ]
   }
   ```

2. **Frontend** monta metas por fornecedor:
   ```
   {
     "FORNECEDOR_1": 5000
   }
   ```

3. **Frontend** chama API POST `/api/distribuir-metas` com estrutura + metas

4. **API** processa usando o motor Python:
   - Calcula score baseado em média + histórico
   - Distribui proporcionalmente
   - Calcula índice de pressão
   - Retorna resultado

5. **Frontend** recebe resultado e navega para próxima etapa

## Próximos Passos

Após a distribuição:
- Resultado é exibido na página de Gerentes (ManagerAdjustPage)
- Gerentes ajustam as metas por equipe
- Depois supervisores ajustam por vendedor
- Tudo é consolidado no Dashboard
