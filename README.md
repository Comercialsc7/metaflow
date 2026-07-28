# MetaFlow

Aplicação para gestão e distribuição de metas de vendas com frontend React/Vite e motor Python (API Flask).

## Estrutura

| Pasta | Descrição |
|-------|-----------|
| `/` (raiz) | API Flask — motor de distribuição de metas |
| `frontend/` | Interface React/Vite (MetaFlow) |

## API (raiz)

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
python api_server.py
```

Health check: `GET /api/health`

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Configure a URL da API no ambiente do frontend (arquivo `.env` local — não versionado).

## Status

Projeto concluído.
