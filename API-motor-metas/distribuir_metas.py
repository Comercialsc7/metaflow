def _para_int(valor):
    try:
        return int(round(float(valor or 0)))
    except (TypeError, ValueError):
        return 0


def _arredondar_bloco(valor, bloco):
    valor = _para_int(valor)
    if bloco <= 0:
        return valor
    return int(round(valor / bloco) * bloco)


def _aplicar_metas_minimas(validas, meta_total, bloco):
    """
    Reserva o piso (meta_minima) antes da distribuicao do restante.
    Se a soma dos pisos passar do total, corta na proporcao (inteiros).
    Retorna o valor ainda disponivel para distribuir por score.
    """
    meta_total = _para_int(meta_total)

    for e in validas:
        minima = max(_para_int(e.get('meta_minima')), 0)
        e['meta_minima_aplicada'] = minima

    soma_minimas = sum(e['meta_minima_aplicada'] for e in validas)

    if soma_minimas <= 0:
        return meta_total

    if soma_minimas > meta_total:
        for e in validas:
            e['meta_minima_aplicada'] = int(e['meta_minima_aplicada'] * meta_total // soma_minimas)

        soma_minimas = sum(e['meta_minima_aplicada'] for e in validas)
        diferenca = meta_total - soma_minimas
        i = 0
        max_iter = max(len(validas) * 2, 1) + abs(diferenca)

        while diferenca > 0 and validas and i < max_iter:
            e = validas[i % len(validas)]
            e['meta_minima_aplicada'] += 1
            diferenca -= 1
            i += 1

        return 0

    return meta_total - soma_minimas


def _distribuir_disponivel(validas, disponivel, peso_media, peso_historico, bloco):
    """Distribui o restante (apos o piso) por score media/historico, em blocos."""
    disponivel = _para_int(disponivel)
    bloco = _para_int(bloco) or 100

    for e in validas:
        media = max(_para_int(e.get('media')), 0)
        historico = max(_para_int(e.get('historico')), 0)
        # score intermediario pode ser float; meta final sempre int
        e['score'] = (media * peso_media) + (historico * peso_historico)
        e['meta_final'] = _para_int(e.get('meta_minima_aplicada'))

    if disponivel <= 0:
        return

    com_score = [e for e in validas if e['score'] > 0]
    alvo = com_score if com_score else validas
    if not alvo:
        return

    soma_score = sum(e['score'] for e in alvo)

    for e in alvo:
        if soma_score > 0:
            proporcao = e['score'] / soma_score
        else:
            proporcao = 1 / len(alvo)
        extra = _arredondar_bloco(proporcao * disponivel, bloco)
        e['meta_final'] = _para_int(e['meta_final']) + extra

    meta_alvo = sum(_para_int(e.get('meta_minima_aplicada')) for e in validas) + disponivel
    soma_atual = sum(_para_int(e['meta_final']) for e in validas)
    diferenca = meta_alvo - soma_atual

    i = 0
    max_iter = 10000

    while abs(diferenca) >= bloco and alvo and i < max_iter:
        ajuste = bloco if diferenca > 0 else -bloco
        e = alvo[i % len(alvo)]
        piso = _para_int(e.get('meta_minima_aplicada'))
        novo_valor = _para_int(e['meta_final']) + ajuste

        if novo_valor >= piso:
            e['meta_final'] = novo_valor
            diferenca -= ajuste

        i += 1


def distribuir_metas(
    meta_total,
    entidades: list,
    peso_media=0.5,
    peso_historico=0.5,
    bloco: int = 100,
):
    meta_total = _para_int(meta_total)
    bloco = _para_int(bloco) or 100

    if meta_total <= 0 or not entidades:
        for e in entidades:
            e['meta_final'] = 0
            e['indice_pressao'] = 0
            e.pop('meta_minima_aplicada', None)
            e.pop('score', None)
        return entidades

    soma_pesos = peso_media + peso_historico
    if soma_pesos > 0:
        peso_media /= soma_pesos
        peso_historico /= soma_pesos

    validas = []
    for e in entidades:
        media = max(_para_int(e.get('media')), 0)
        historico = max(_para_int(e.get('historico')), 0)
        minima = max(_para_int(e.get('meta_minima')), 0)

        e['media'] = media
        e['historico'] = historico
        e['meta_minima'] = minima

        if media > 0 or historico > 0 or minima > 0:
            validas.append(e)
        else:
            e['meta_final'] = 0
            e['indice_pressao'] = 0

    if not validas:
        return entidades

    disponivel = _aplicar_metas_minimas(validas, meta_total, bloco)
    _distribuir_disponivel(validas, disponivel, peso_media, peso_historico, bloco)

    for e in entidades:
        e['meta_final'] = max(0, _para_int(e.get('meta_final')))
        if 'meta_minima_aplicada' in e:
            e['meta_minima_aplicada'] = _para_int(e.get('meta_minima_aplicada'))
        e.pop('score', None)

        if e['meta_final'] > 0:
            base = (
                max(_para_int(e.get('media')), 0) * peso_media
                + max(_para_int(e.get('historico')), 0) * peso_historico
            )
            e['indice_pressao'] = (
                _para_int(e['meta_final'] / base) if base > 0 else 0
            )
        else:
            e['indice_pressao'] = 0

    return entidades
