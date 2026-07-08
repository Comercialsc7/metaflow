# API Motor Metas

API Flask para distribuicao de metas por fornecedor, equipe e vendedor.

## Endpoints

- `GET /api/health`
- `POST /api/distribuir-metas`

### Exemplo de payload

```json
{
  "estrutura": {
    "FORNECEDOR_1": [
      { "media": 1000, "historico": 1200, "equipe": "EQ1", "vendedor": "V1" },
      { "media": 500, "historico": 600, "equipe": "EQ2", "vendedor": "V2" }
    ]
  },
  "metas": {
    "FORNECEDOR_1": 5000
  },
  "peso_media": 0.5,
  "peso_historico": 0.5,
  "bloco": 500
}
```

## Rodar localmente

```bash
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
python api_server.py
```

A API sobe por padrao em `http://localhost:5000`.

## Variaveis de ambiente

Use o arquivo `.env.example` como referencia.

- `HOST` (default: `0.0.0.0`)
- `PORT` (default: `5000`)
- `FLASK_DEBUG` (default: `false`)
- `CORS_ORIGINS` (default: `*`)

Exemplo:

```bash
set HOST=0.0.0.0
set PORT=5000
set FLASK_DEBUG=true
set CORS_ORIGINS=http://localhost:5173
python api_server.py
```

## Deploy

Este projeto ja inclui `Procfile` para plataformas compativeis com `gunicorn`.

Tambem inclui:

- `render.yaml` para deploy no Render
- `.github/workflows/ci.yml` para validacao automatica no GitHub Actions
- `runtime.txt` para fixar versao de Python

Comando web:

```bash
gunicorn api_server:app --bind 0.0.0.0:$PORT
```

## Publicar no GitHub

```bash
git init
git add .
git commit -m "chore: bootstrap standalone API motor metas"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/API-motor-metas.git
git push -u origin main
```

## Deploy no Render

1. Crie um novo Web Service a partir do repositorio.
2. O Render detectara o `render.yaml` automaticamente.
3. Configure `CORS_ORIGINS` com a URL do frontend publicado.
4. Apos deploy, copie a URL da API e configure no frontend:

```bash
VITE_API_BASE_URL=https://seu-app.onrender.com
```
