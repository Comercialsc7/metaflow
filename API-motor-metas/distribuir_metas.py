def distribuir_metas(
    meta_total: float,
    entidades: list,
    peso_media: float = 0.5,
    peso_historico: float = 0.5,
    bloco: int = 500
):

    if meta_total <= 0 or not entidades:
        for e in entidades:
            e["meta_final"] = 0.0
            e["indice_pressao"] = 0.0
        return entidades

    # Normalizar pesos
    soma_pesos = peso_media + peso_historico
    if soma_pesos > 0:
        peso_media /= soma_pesos
        peso_historico /= soma_pesos

    validas = []
    for e in entidades:
        if e["media"] > 0 or e["historico"] > 0:
            validas.append(e)
        else:
            e["meta_final"] = 0.0
            e["indice_pressao"] = 0.0

    if not validas:
        return entidades

    for e in validas:
        e["score"] = (
            max(e["media"], 0) * peso_media +
            max(e["historico"], 0) * peso_historico
        )

    soma_score = sum(e["score"] for e in validas)

    for e in validas:
        proporcao = e["score"] / soma_score if soma_score else 0
        e["meta_final"] = round((proporcao * meta_total) / bloco) * bloco

    soma_atual = sum(e["meta_final"] for e in validas)
    diferenca = meta_total - soma_atual

    i = 0
    max_iter = 10000

    while abs(diferenca) >= bloco and validas and i < max_iter:
        ajuste = bloco if diferenca > 0 else -bloco
        e = validas[i % len(validas)]

        if e["meta_final"] + ajuste >= 0:
            e["meta_final"] += ajuste
            diferenca -= ajuste

        i += 1

    # Índice de press?o
    for e in entidades:
        e["meta_final"] = max(0.0, e.get("meta_final", 0.0))
        e.pop("score", None)

        if e["meta_final"] > 0:
            base = (
                max(e["media"], 0) * peso_media +
                max(e["historico"], 0) * peso_historico
            )

            e["indice_pressao"] = round(
                e["meta_final"] / base, 2
            ) if base > 0 else 0.0
        else:
            e["indice_pressao"] = 0.0

    return entidades