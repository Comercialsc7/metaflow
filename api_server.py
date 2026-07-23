from flask import Flask, request
from flask_cors import CORS
from src.controllers.METAS import rota_distribuir_metas
from src.helpers.ambiente import bool_ambiente, carregar_variavel
from src.helpers.log import registrar_log
from src.helpers.respostas import resposta_json
from src.rotas.rotas_metas import rotas_metas


def create_app():
    # Cria a aplicação Flask e configura o CORS para o frontend.
    app = Flask(__name__)
    app.register_blueprint(rotas_metas)

    allowed_origins = carregar_variavel('CORS_ORIGINS', '*')
    if allowed_origins.strip() == "*":
        CORS(app)
    else:
        origins = [origin.strip() for origin in allowed_origins.split(",") if origin.strip()]
        CORS(app, resources={r"/api/*": {"origins": origins}})


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
