# MetaFlow

Aplicação para gestão e distribuição de metas de vendas.

## Estrutura

| Pasta | Descrição |
|-------|-----------|
| `API-motor-metas/API-motor-metas/` | API Flask — motor de distribuição de metas |
| `metas-frontand/` | Interface React/Vite (na raiz do monorepo) |

## API Motor

```bash
cd API-motor-metas/API-motor-metas
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
python api_server.py
```

Health check: `GET /api/health`

## Metas Front

```bash
cd metas-frontand
npm install
npm run dev
```

Configure a URL da API no `.env` local (não versionado).

## Status

Projeto concluído.
