/**
 * Serviço de distribuição de metas
 * Constrói a estrutura esperada pela API e chama o motor de distribuição
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
const BLOCO_PADRAO = 100

/**
 * Monta mapa de metas mínimas: FORNECEDOR#EQUIPE#COD -> valor
 */
function montarMapaMetasMinimas(metasMinimas = []) {
  const mapa = {}
  ;(metasMinimas || []).forEach((row) => {
    const fornecedor = String(row.FORNECEDOR || '').trim()
    const equipe = String(row.EQUIPE || '').trim()
    const cod = String(row.COD || '').trim()
    if (!fornecedor || !equipe || !cod) return

    const key = `${fornecedor}#${equipe}#${cod}`
    const valor = Number(row.VALOR_NUM ?? row.VALOR ?? 0)
    if (!Number.isFinite(valor) || valor <= 0) return

    mapa[key] = (mapa[key] || 0) + valor
  })
  return mapa
}

/**
 * Monta a estrutura interna esperada pelo motor de distribuição
 * Usa stats individuais por vendedor (FORNECEDOR#EQUIPE#VENDEDOR_CODE)
 */
function montarEstrutura(records, vendedores, fornecedorVendedorStats = {}, metasMinimas = []) {
  const estrutura = {}
  const mapaMinimas = montarMapaMetasMinimas(metasMinimas)

  records.forEach((record) => {
    const fornecedor = record.supplierName || record.supplierCode || 'UNKNOWN'
    if (!estrutura[fornecedor]) estrutura[fornecedor] = []

    if (!vendedores || vendedores.length === 0) {
      estrutura[fornecedor].push({
        media: record.media || 0,
        historico: record.historico || 0,
        meta_minima: 0,
        equipe: 'Default',
        vendedor: '',
      })
      return
    }

    vendedores.forEach((vendedor) => {
      const statsKey = `${fornecedor}#${vendedor.equipe}#${vendedor.codigo}`
      const stats = fornecedorVendedorStats[statsKey] || { media: 0, historico: 0 }
      const metaMinima = mapaMinimas[statsKey] || 0
      estrutura[fornecedor].push({
        media: stats.media || 0,
        historico: stats.historico || 0,
        meta_minima: metaMinima,
        equipe: vendedor.equipe || 'Default',
        sellerCode: vendedor.codigo || '',
        seller: vendedor.nome || vendedor.codigo || '',
        vendedor: vendedor.nome || vendedor.codigo || '',
        area: vendedor.nome || '',
      })
    })
  })

  return estrutura
}

/**
 * Monta o dicionário de metas por fornecedor
 */
function montarMetas(records) {
  const metas = {}

  records.forEach((record) => {
    const fornecedor = record.supplierName || record.supplierCode || 'UNKNOWN'

    if (fornecedor && !metas[fornecedor]) {
      metas[fornecedor] = Number(record.initialTarget || 0)
    }
  })

  return metas
}

/**
 * Chama a API de distribuição de metas (1ª distribuição: Admin → Vendedores)
 * metasMinimas entram somente nesta chamada.
 */
export async function distribuirMetas(
  records,
  vendedores,
  opcoes = {},
  fornecedorVendedorStats = {},
  metasMinimas = []
) {
  const {
    peso_media = 0.5,
    peso_historico = 0.5,
    bloco = BLOCO_PADRAO,
  } = opcoes

  try {
    const estrutura = montarEstrutura(records, vendedores, fornecedorVendedorStats, metasMinimas)
    const metas = montarMetas(records)

    if (Object.keys(metas).length === 0 || Object.keys(estrutura).length === 0) {
      throw new Error('Nenhuma meta ou estrutura válida para distribuir')
    }

    const response = await fetch(`${API_BASE_URL}/api/distribuir-metas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        estrutura,
        metas,
        peso_media,
        peso_historico,
        bloco,
      }),
    })

    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status}`)
    }

    const data = await response.json()

    if (!data.sucesso) {
      throw new Error(data.erro || 'Erro desconhecido na distribuição')
    }

    return {
      sucesso: true,
      distribuicao: data.distribuicao,
      estrutura,
      metas,
    }
  } catch (error) {
    console.error('Erro ao distribuir metas:', error)
    return {
      sucesso: false,
      erro: error.message || 'Erro ao distribuir metas',
    }
  }
}

/**
 * Redistribui as metas ajustadas da equipe entre os vendedores.
 * Não reaplica metas mínimas — o piso já veio na 1ª distribuição.
 */
export async function redistribuirMetasParaVendedores(
  rowsAjustadas,
  vendedores,
  fornecedorVendedorStats = {},
  opcoes = {}
) {
  const {
    peso_media = 0.5,
    peso_historico = 0.5,
    bloco = BLOCO_PADRAO,
  } = opcoes

  try {
    const estrutura = {}
    const metas = {}

    rowsAjustadas.forEach((row) => {
      const fornecedor = row.supplier
      const equipe = row.team
      const chave = `${fornecedor}#${equipe}`

      estrutura[chave] = []
      metas[chave] = Number(row.adjusted)

      const vendedoresEquipe = vendedores.filter(
        (v) => v.equipe && v.equipe.toLowerCase() === equipe.toLowerCase()
      )

      if (vendedoresEquipe.length === 0) {
        estrutura[chave].push({
          media: 0,
          historico: 0,
          meta_minima: 0,
          equipe,
          vendedor: 'SEM_VENDEDOR',
        })
      } else {
        vendedoresEquipe.forEach((vendedor) => {
          const statsKey = `${fornecedor}#${equipe}#${vendedor.codigo}`
          const stats = fornecedorVendedorStats[statsKey] || { media: 0, historico: 0 }
          estrutura[chave].push({
            media: stats.media || 0,
            historico: stats.historico || 0,
            meta_minima: 0,
            equipe,
            sellerCode: vendedor.codigo || '',
            seller: vendedor.nome || vendedor.codigo || '',
            vendedor: vendedor.nome || vendedor.codigo || '',
            area: vendedor.nome || '',
          })
        })
      }
    })

    const response = await fetch(`${API_BASE_URL}/api/distribuir-metas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estrutura, metas, peso_media, peso_historico, bloco }),
    })

    if (!response.ok) throw new Error(`Erro na API: ${response.status}`)

    const data = await response.json()
    if (!data.sucesso) throw new Error(data.erro || 'Erro desconhecido na distribuição')

    const distribuicaoConvertida = {}
    Object.entries(data.distribuicao || {}).forEach(([chave, entidades]) => {
      const sepIdx = chave.indexOf('#')
      const fornecedor = chave.substring(0, sepIdx)
      const equipe = chave.substring(sepIdx + 1)
      if (!distribuicaoConvertida[fornecedor]) distribuicaoConvertida[fornecedor] = []
      entidades.forEach((e) => distribuicaoConvertida[fornecedor].push({ ...e, equipe }))
    })

    return { sucesso: true, distribuicao: distribuicaoConvertida }
  } catch (error) {
    console.error('Erro ao redistribuir metas para vendedores:', error)
    return { sucesso: false, erro: error.message || 'Erro ao redistribuir metas' }
  }
}

/**
 * Valida se a API está disponível
 */
export async function verificarAPIDisponivel() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`)
    return response.ok
  } catch (error) {
    console.error('API não disponível:', error)
    return false
  }
}
