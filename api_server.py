import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from distribuir_metas_por_fornecedor import distribuir_metas_por_fornecedor


def _bool_env(name, default=False):
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def create_app():
    app = Flask(__name__)

    allowed_origins = os.getenv("CORS_ORIGINS", "*")
    if allowed_origins.strip() == "*":
        CORS(app)
    else:
        origins = [origin.strip() for origin in allowed_origins.split(",") if origin.strip()]
        CORS(app, resources={r"/api/*": {"origins": origins}})


    @app.route('/api/distribuir-metas', methods=['POST'])
    def distribuir_metas_endpoint():
        """
        Distribui metas usando o motor de distribuição.
        """
        try:
            data = request.get_json(silent=True) or {}

            estrutura = data.get('estrutura')
            metas = data.get('metas')

            peso_media = float(data.get('peso_media', 0.5))
            peso_historico = float(data.get('peso_historico', 0.5))
            bloco = int(data.get('bloco', 500))

            if not estrutura or not metas:
                return jsonify({
                    "sucesso": False,
                    "erro": "estrutura e metas sao obrigatorios"
                }), 400

            resultados = distribuir_metas_por_fornecedor(
                estrutura,
                metas,
                peso_media,
                peso_historico,
                bloco
            )

            return jsonify({
                "sucesso": True,
                "distribuicao": resultados
            }), 200

        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({
                "sucesso": False,
                "erro": str(e)
            }), 500


    @app.route('/api/health', methods=['GET'])
    def health():
        return jsonify({
            "status": "ok",
            "servico": "Motor de Distribuicao de Metas"
        }), 200

    return app


app = create_app()


if __name__ == '__main__':
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "5000"))
    debug = _bool_env("FLASK_DEBUG", default=False)
    print(f"Iniciando servidor de distribuicao de metas em {host}:{port}...")
    app.run(debug=debug, host=host, port=port)
