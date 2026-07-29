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

Configure a URL da API no `.env` local (não versionado):

```bash
cp metas-frontand/.env.example metas-frontand/.env
```

## Git (repositório único)

Este diretório (`API-motor-metas/`) é o **único repositório git** do MetaFlow.

| Pasta | Papel |
|-------|-------|
| `API-motor-metas/` (este repo) | Commit, push e histórico |
| `metas-frontand/` | Frontend versionado aqui dentro |
| `../metas-frontand/` (junction) | Atalho local para a mesma pasta do frontend |

**Fluxo de trabalho:**

```bash
# Clone
git clone https://github.com/Comercialsc7/metaflow.git API-motor-metas
cd API-motor-metas

# Frontend (pode abrir metas-frontand/ ou ../metas-frontand/ via junction)
cd metas-frontand && npm install && npm run dev

# Commit e push (sempre na raiz do repo)
cd ..
git add .
git commit -m "sua mensagem"
git push origin main
```

> Não use `.git` separado em `metas-frontand/`. A pasta na raiz do monorepo (`project_Metas/metas-frontand`) é apenas um junction para facilitar o acesso local.

