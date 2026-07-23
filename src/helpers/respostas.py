from flask import jsonify


def resposta_json(sucesso, mensagem, dados=None, erro=None, status_code=200, distribuicao=None):
    """Gera uma resposta JSON padronizada para a API."""
    payload = {
        'sucesso': sucesso,
        'mensagem': mensagem,
    }

    if dados is not None:
        payload['dados'] = dados

    if distribuicao is not None:
        payload['distribuicao'] = distribuicao

    if erro is not None:
        payload['erro'] = erro

    return jsonify(payload), status_code
