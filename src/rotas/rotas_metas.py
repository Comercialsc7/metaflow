from flask import Blueprint, request
from src.controllers.METAS import rota_distribuir_metas
from src.helpers.log import registrar_log
from src.helpers.respostas import resposta_json

rotas_metas = Blueprint('rotas_metas', __name__)


@rotas_metas.route('/web/metas/distribuir', methods=['POST'])
def rota_web_distribuir_metas():
    """Rota nova no padrão da documentação para distribuição de metas."""
    try:
        data = request.get_json(silent=True) or {}
        resultados = rota_distribuir_metas(data)

        return resposta_json(
            True,
            'Distribuição concluída com sucesso',
            {'distribuicao': resultados},
            status_code=200,
            distribuicao=resultados,
        )

    except ValueError as erro:
        registrar_log(f'Erro de validação na rota de distribuição: {erro}', 'warning')
        return resposta_json(
            False,
            str(erro),
            erro=str(erro),
            status_code=400,
        )
    except Exception as erro:
        registrar_log(f'Erro inesperado na rota de distribuição: {erro}', 'error')
        return resposta_json(
            False,
            'Erro ao processar requisição',
            erro=str(erro),
            status_code=500,
        )
