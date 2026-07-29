/**
 * Serviço de distribuição de metas
 * Constrói a estrutura esperada pela API e chama o motor de distribuição
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

/**
 * Monta a estrutura interna esperada pelo motor de distribuição
 * Usa stats individuais por vendedor (FORNECEDOR#EQUIPE#VENDEDOR_CODE)
 * @param {Array} records - Records de metas (fornecedores com meta total)
 * @param {Array} vendedores - Lista de vendedores
 * @param {Object} fornecedorVendedorStats - Mapa { "FORNECEDOR#EQUIPE#VEND_CODE": { media, historico } }
 * @returns {Object} Estrutura no formato { FORNECEDOR: [entidades] }
 */
function montarEstrutura(records, vendedores, fornecedorVendedorStats = {}) {
  const estrutura = {}

  records.forEach((record) => {
    const fornecedor = record.supplierName || record.supplierCode || 'UNKNOWN'
    if (!estrutura[fornecedor]) estrutura[fornecedor] = []

    if (!vendedores || vendedores.length === 0) {
      // Sem vendedores: usa totais do fornecedor como entidade única
      estrutura[fornecedor].push({
        media: record.media || 0,
        historico: record.historico || 0,
        equipe: 'Default',
        vendedor: '',
      })
      return
    }

    // 1 entidade por vendedor com stats individuais do CSV
    vendedores.forEach((vendedor) => {
      const statsKey = `${fornecedor}#${vendedor.equipe}#${vendedor.codigo}`
      const stats = fornecedorVendedorStats[statsKey] || { media: 0, historico: 0 }
      estrutura[fornecedor].push({
        media: stats.media || 0,
        historico: stats.historico || 0,
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
 * @param {Array} records - Records de metas
 * @returns {Object} Dicionário { FORNECEDOR: metaTotal }
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
 * @param {Array} records - Records com metas por fornecedor
 * @param {Array} vendedores - Lista de vendedores individuais
 * @param {Object} opcoes - { peso_media, peso_historico, bloco }
 * @param {Object} fornecedorVendedorStats - Mapa { "FORNECEDOR#EQUIPE#VEND_CODE": { media, historico } }
 * @returns {Promise<Object>} Resultado da distribuição
 */
export async function distribuirMetas(
  records,
  vendedores,
  opcoes = {},
  fornecedorVendedorStats = {}
) {
  const {
    peso_media = 0.5,
    peso_historico = 0.5,
    bloco = 500,
  } = opcoes

  try {
    const estrutura = montarEstrutura(records, vendedores, fornecedorVendedorStats)
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
 * Redistribui as metas ajustadas da equipe entre os vendedores
 * Chamado pelo Gerente após ajustar as metas de equipe
 * @param {Array} rowsAjustadas - Rows com metas ajustadas por (fornecedor, equipe)
 * @param {Array} vendedores - Lista de vendedores
 * @param {Object} fornecedorEquipeStats - Mapa { "FORNECEDOR#EQUIPE": { media, historico } }
 * @param {Object} opcoes - { peso_media, peso_historico, bloco }
 * @returns {Promise<Object>} Resultado com distribuição por vendedor
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
    bloco = 500,
  } = opcoes

  try {
    // Chave por FORNECEDOR#EQUIPE para manter metas separadas por equipe
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
        estrutura[chave].push({ media: 0, historico: 0, equipe, vendedor: 'SEM_VENDEDOR' })
      } else {
        vendedoresEquipe.forEach((vendedor) => {
          // Usa stats individuais do vendedor (FORNECEDOR#EQUIPE#CODIGO)
          const statsKey = `${fornecedor}#${equipe}#${vendedor.codigo}`
          const stats = fornecedorVendedorStats[statsKey] || { media: 0, historico: 0 }
          estrutura[chave].push({
            media: stats.media || 0,
            historico: stats.historico || 0,
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

    // Converte chaves "FORNECEDOR#EQUIPE" de volta para { fornecedor, equipe }
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
 * @returns {Promise<boolean>}
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
