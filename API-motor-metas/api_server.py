from flask import Flask, request
from flask_cors import CORS
from src.controllers.METAS import rota_distribuir_metas
from src.helpers.ambiente import bool_ambiente, carregar_variavel
from src.helpers.log import registrar_log
from src.helpers.respostas import resposta_json

# Origins padrão para teste local (Vite). Nunca usar "*" em ambiente compartilhado.
CORS_ORIGINS_PADRAO = 'http://localhost:5173,http://127.0.0.1:5173'


def _resolver_origins_cors():
    """Lê CORS_ORIGINS e devolve lista explícita. Wildcard * é rejeitado."""
    bruto = (carregar_variavel('CORS_ORIGINS', CORS_ORIGINS_PADRAO) or '').strip()
    if not bruto or bruto == '*':
        if bruto == '*':
            registrar_log(
                'CORS_ORIGINS=* não é permitido. Usando origins locais padrão.',
                'warning',
            )
        return [o.strip() for o in CORS_ORIGINS_PADRAO.split(',') if o.strip()]

    origins = [origin.strip() for origin in bruto.split(',') if origin.strip()]
    if '*' in origins:
        registrar_log(
            'CORS_ORIGINS contém "*". Removendo wildcard; mantendo demais origins.',
            'warning',
        )
        origins = [origin for origin in origins if origin != '*']

    if not origins:
        return [o.strip() for o in CORS_ORIGINS_PADRAO.split(',') if o.strip()]

    return origins


def create_app():
    # Cria a aplicação Flask e configura o CORS para o frontend.
    app = Flask(__name__)

    origins = _resolver_origins_cors()
    registrar_log(f'CORS habilitado para: {", ".join(origins)}', 'info')
    CORS(
        app,
        resources={
            r"/api/*": {"origins": origins},
        },
    )


    @app.route('/api/distribuir-metas', methods=['POST'])
    def distribuir_metas_endpoint():
        """Endpoint legado compatível com o frontend atual."""
        try:
            data = request.get_json(silent=True) or {}

            registrar_log('Requisição recebida no endpoint legado de distribuição', 'info')
            resultados = rota_distribuir_metas(data)

            return resposta_json(
                True,
                'Distribuição concluída com sucesso',
                {'distribuicao': resultados},
                status_code=200,
                distribuicao=resultados,
            )

        except ValueError as error:
            registrar_log(f'Erro de validação no endpoint legado: {error}', 'warning')
            return resposta_json(
                False,
                str(error),
                erro=str(error),
                status_code=400,
            )
        except Exception as error:
            registrar_log(f'Erro ao processar requisição: {error}', 'error')
            return resposta_json(
                False,
                'Erro ao processar requisição',
                erro=str(error),
                status_code=500,
            )

    @app.route('/api/health', methods=['GET'])
    def health():
        return resposta_json(
            True,
            'API disponível',
            {
                'status': 'ok',
                'servico': 'Motor de Distribuicao de Metas',
            },
            status_code=200,
        )

    return app


app = create_app()


if __name__ == '__main__':
    host = carregar_variavel('HOST', '0.0.0.0')
    port = int(carregar_variavel('PORT', '5000'))
    debug = bool_ambiente('FLASK_DEBUG', False)
    registrar_log(f'Iniciando servidor de distribuicao de metas em {host}:{port}...', 'info')
    app.run(debug=debug, host=host, port=port)
