"""
Simulador local para testar a distribuição de metas
Recebe dados parseados do frontend e retorna métricas
"""
import json
from distribuir_metas import distribuir_metas


def calcular_totais_por_fornecedor(fornecedores_raw):
    """
    Recebe lista de fornecedores com media/historico
    Retorna totais agregados
    """
    totais = {
        'fornecedores_unicos': 0,
        'media_total': 0.0,
        'historico_total': 0.0,
        'fornecedores': []
    }
    
    fornecedor_map = {}
    
    for fornecedor in fornecedores_raw:
        nome = fornecedor['nome']
        if nome not in fornecedor_map:
            fornecedor_map[nome] = {
                'nome': nome,
                'codigo': fornecedor['codigo'],
                'segmento': fornecedor.get('segmento', ''),
                'media': 0.0,
                'historico': 0.0,
            }
        
        fornecedor_map[nome]['media'] += fornecedor.get('media', 0)
        fornecedor_map[nome]['historico'] += fornecedor.get('historico', 0)
    
    # Calcular totais
    for nome, supplier_data in fornecedor_map.items():
        totais['media_total'] += supplier_data['media']
        totais['historico_total'] += supplier_data['historico']
        totais['fornecedores'].append({
            'nome': nome,
            'codigo': supplier_data['codigo'],
            'segmento': supplier_data['segmento'],
            'media': supplier_data['media'],
            'historico': supplier_data['historico'],
        })
    
    totais['fornecedores_unicos'] = len(fornecedor_map)
    return totais


def simular_distribuicao(fornecedores_raw, meta_total=1000000.0, peso_media=0.5, peso_historico=0.5):
    """
    Simula distribuição de metas para fornecedores
    Valida se totais de media + historico são coerentes
    """
    totais = calcular_totais_por_fornecedor(fornecedores_raw)
    
    # Preparar dados para o motor
    entidades = []
    nomes_fornecedores = []
    
    for supplier in totais['fornecedores']:
        entidades.append({
            'media': supplier['media'],
            'historico': supplier['historico'],
        })
        nomes_fornecedores.append(supplier['nome'])
    
    # Chamar motor
    resultado_motor = distribuir_metas(
        meta_total=meta_total,
        entidades=entidades,
        peso_media=peso_media,
        peso_historico=peso_historico,
        bloco=500
    )
    
    # Preparar resultado com nomes
    distribuicao_nomear = []
    for idx, resultado in enumerate(resultado_motor):
        distribuicao_nomear.append({
            'fornecedor': nomes_fornecedores[idx],
            'media': resultado.get('media', 0),
            'historico': resultado.get('historico', 0),
            'meta_final': resultado.get('meta_final', 0),
            'indice_pressao': resultado.get('indice_pressao', 0),
        })
    
    return {
        'status': 'success',
        'totais': totais,
        'meta_total': meta_total,
        'distribuicao': distribuicao_nomear,
        'validacao': {
            'fornecedores_processados': totais['fornecedores_unicos'],
            'media_encontrada': totais['media_total'],
            'historico_encontrado': totais['historico_total'],
            'media_por_fornecedor': totais['media_total'] / totais['fornecedores_unicos'] if totais['fornecedores_unicos'] > 0 else 0,
            'historico_por_fornecedor': totais['historico_total'] / totais['fornecedores_unicos'] if totais['fornecedores_unicos'] > 0 else 0,
            'soma_metas_distribuidas': sum(d['meta_final'] for d in distribuicao_nomear),
        }
    }


# Teste rápido com dados fake (simulando saída do frontend)
if __name__ == "__main__":
    dados_teste = [
        {
            'id': 1,
            'codigo': 'F1',
            'nome': 'BAUDUCCO',
            'pauta': 'D',
            'segmento': 'MP',
            'historico': 11800,
            'media': 12500,
        },
        {
            'id': 2,
            'codigo': 'F2',
            'nome': 'BENEVIA',
            'pauta': 'D',
            'segmento': 'MP',
            'historico': 9100,
            'media': 8300,
        },
    ]
    
    resultado = simular_distribuicao(dados_teste, meta_total=1000000.0)
    
    print("\n" + "="*80)
    print("RESULTADO DA SIMULAÇÃO")
    print("="*80)
    print(json.dumps(resultado, indent=2, default=str, ensure_ascii=False))
    print("\n" + "="*80)
    print("RESUMO")
    print("="*80)
    print(f"Fornecedores: {resultado['validacao']['fornecedores_processados']}")
    print(f"Média encontrada: R$ {resultado['validacao']['media_encontrada']:,.2f}")
    print(f"Histórico encontrado: R$ {resultado['validacao']['historico_encontrado']:,.2f}")
    print(f"Soma das metas distribuídas: R$ {resultado['validacao']['soma_metas_distribuidas']:,.2f}")
    print(f"Meta total: R$ {resultado['meta_total']:,.2f}")
