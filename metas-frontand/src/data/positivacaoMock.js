/**
 * Dados fictícios de positivação para simulação de UI.
 * Mais adiante: trocar por CSV / API sem motor de rateio.
 */
export const POSITIVACAO_MOCK = [
  {
    supplier: 'NESTLE',
    team: 'Equipe Sul',
    seller: 'Ana Costa',
    sellerCode: '1001',
    clientesAtivos: 42,
    media4m: 38,
    metaAtual: 40,
  },
  {
    supplier: 'NESTLE',
    team: 'Equipe Sul',
    seller: 'Bruno Lima',
    sellerCode: '1002',
    clientesAtivos: 35,
    media4m: 33,
    metaAtual: 34,
  },
  {
    supplier: 'NESTLE',
    team: 'Equipe Norte',
    seller: 'Carla Dias',
    sellerCode: '1003',
    clientesAtivos: 28,
    media4m: 30,
    metaAtual: 30,
  },
  {
    supplier: 'UNILEVER',
    team: 'Equipe Sul',
    seller: 'Ana Costa',
    sellerCode: '1001',
    clientesAtivos: 51,
    media4m: 48,
    metaAtual: 50,
  },
  {
    supplier: 'UNILEVER',
    team: 'Equipe Norte',
    seller: 'Diego Alves',
    sellerCode: '1004',
    clientesAtivos: 22,
    media4m: 25,
    metaAtual: 26,
  },
  {
    supplier: 'P&G',
    team: 'Equipe Centro',
    seller: 'Elena Prado',
    sellerCode: '1005',
    clientesAtivos: 60,
    media4m: 55,
    metaAtual: 58,
  },
  {
    supplier: 'P&G',
    team: 'Equipe Centro',
    seller: 'Fábio Nunes',
    sellerCode: '1006',
    clientesAtivos: 18,
    media4m: 20,
    metaAtual: 20,
  },
  {
    supplier: 'AMBEV',
    team: 'Equipe Leste',
    seller: 'Gisele Rocha',
    sellerCode: '1007',
    clientesAtivos: 44,
    media4m: 41,
    metaAtual: 42,
  },
]

export function buildPositivacaoRows(monthRef, seed = POSITIVACAO_MOCK) {
  return seed.map((row, index) => ({
    rowId: `${monthRef}__${row.supplier}__${row.team}__${row.sellerCode}_${index}`,
    month: monthRef,
    supplier: row.supplier,
    team: row.team,
    seller: row.seller,
    sellerCode: row.sellerCode,
    clientesAtivos: row.clientesAtivos,
    media4m: row.media4m,
    metaAtual: row.metaAtual,
    // null = mantém meta atual (sem sugestão neste mês)
    sugestao: null,
  }))
}
