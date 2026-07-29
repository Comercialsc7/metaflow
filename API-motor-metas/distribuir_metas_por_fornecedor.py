from distribuir_metas import distribuir_metas


def distribuir_metas_por_fornecedor(estrutura, metas, peso_media=0.5, peso_historico=0.5, bloco=100):
    resultados = {}

    for fornecedor, entidades in estrutura.items():
        meta_total = int(round(float(metas.get(fornecedor, 0) or 0)))

        entidades_processadas = distribuir_metas(
            meta_total,
            entidades,
            peso_media=peso_media,
            peso_historico=peso_historico,
            bloco=int(bloco or 100),
        )

        resultados[fornecedor] = entidades_processadas

    return resultados
