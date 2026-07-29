from distribuir_metas_por_fornecedor import distribuir_metas_por_fornecedor


# Controller simples responsável por encaminhar a distribuição de metas para o motor principal.
def extrair_payload_distribuicao(dados):
    """Extrai e valida os dados de entrada para a distribuição de metas."""
    estrutura = dados.get('estrutura')
    metas = dados.get('metas')
    peso_media = float(dados.get('peso_media', 0.5))
    peso_historico = float(dados.get('peso_historico', 0.5))
    bloco = int(dados.get('bloco', 100))

    if not estrutura or not metas:
        raise ValueError('estrutura e metas sao obrigatorios')

    return {
        'estrutura': estrutura,
        'metas': metas,
        'peso_media': peso_media,
        'peso_historico': peso_historico,
        'bloco': bloco,
    }


def rota_distribuir_metas(dados):
    """Processa a distribuição de metas e devolve o resultado para a rota."""
    payload = extrair_payload_distribuicao(dados or {})
    return distribuir_metas_por_fornecedor(
        payload['estrutura'],
        payload['metas'],
        payload['peso_media'],
        payload['peso_historico'],
        payload['bloco'],
    )
