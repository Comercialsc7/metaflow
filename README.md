# API Motor Metas

API Flask para distribuição de metas por fornecedor, equipe e vendedor.

## Visão geral

Este serviço recebe uma estrutura de dados com a distribuição atual das metas e aplica a lógica de distribuição para retornar os resultados consolidados. A API foi organizada para manter compatibilidade com o frontend atual e também oferecer uma rota mais clara para uso interno.

## Estrutura do projeto

- `api_server.py`: ponto de entrada da aplicação Flask.
- `src/controllers/METAS.py`: controller responsável por validar e encaminhar o payload para o motor.
- `src/rotas/rotas_metas.py`: blueprint com a rota web da API.
- `src/helpers/`: módulos auxiliares para respostas, ambiente e logs.
- `distribuir_metas.py` e `distribuir_metas_por_fornecedor.py`: motor principal da distribuição.

## Endpoints

### 1. Saúde da API

- `GET /api/health`

Resposta esperada:

```json
{
  "sucesso": true,
  "mensagem": "API disponível",
  "dados": {
    "status": "ok",
    "servico": "Motor de Distribuicao de Metas"
  }
}
```

### 2. Distribuição de metas (rote legado)

- `POST /api/distribuir-metas`

### 3. Distribuição de metas (rota web)

- `POST /web/metas/distribuir`

## Payload esperado

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

## Exemplo de resposta

```json
{
  "sucesso": true,
  "mensagem": "Distribuição concluída com sucesso",
  "dados": {
    "distribuicao": {
      "FORNECEDOR_1": [
        {
          "vendedor": "V1",
          "equipe": "EQ1",
          "media": 1000,
          "historico": 1200,
          "meta_final": 3500,
          "indice_peso": 3.18
        }
      ]
    }
  },
  "distribuicao": {
    "FORNECEDOR_1": [
      {
        "vendedor": "V1",
        "equipe": "EQ1",
        "media": 1000,
        "historico": 1200,
        "meta_final": 3500,
        "indice_peso": 3.18
      }
    ]
  }
}
```

## Rodar localmente

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python api_server.py
```

A API sobe por padrão em `http://localhost:5000`.

## Variáveis de ambiente

Use o arquivo `.env` como referência.

- `HOST` (padrão: `0.0.0.0`)
- `PORT` (padrão: `5000`)
- `FLASK_DEBUG` (padrão: `false`)
- `CORS_ORIGINS` (padrão: `*`)

Exemplo no Windows PowerShell:

```powershell
$env:HOST="0.0.0.0"
$env:PORT="5000"
$env:FLASK_DEBUG="true"
$env:CORS_ORIGINS="http://localhost:5173"
python api_server.py
```

## Deploy

Este projeto já inclui `Procfile` para plataformas compatíveis com Gunicorn.

Também inclui:

- `render.yaml` para deploy no Render
- `.github/workflows/ci.yml` para validação automática no GitHub Actions
- `runtime.txt` para fixar a versão do Python

Comando web:

```bash
gunicorn api_server:app --bind 0.0.0.0:$PORT
```

## Validação

Os testes básicos da API podem ser executados com:

```bash
python -m unittest discover -s tests -v
```

## Observações

- A API mantém compatibilidade com o frontend antigo por meio da rota `/api/distribuir-metas`.
- A nova rota `/web/metas/distribuir` foi criada para oferecer uma estrutura mais organizada e clara.
- As respostas são retornadas em um formato padronizado com `sucesso`, `mensagem`, `dados` e, quando necessário, `distribuicao`.
