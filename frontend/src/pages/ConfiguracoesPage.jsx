import { useMemo, useState } from 'react'
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Download } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'

const MOTOR_HEADERS = ['EQUIPE', 'VEND', 'AREA', 'FORNECEDOR', 'TIPO', 'VALOR']
const VALID_TIPOS = new Set(['MEDIA', 'HISTORICO'])

function parseNumber(raw) {
  if (raw == null) return 0
  if (typeof raw === 'number') return raw
  const cleaned = String(raw)
    .replace(/r\$\s?/gi, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim()
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}

function parseStrictNumber(raw) {
  if (raw == null) return NaN
  const text = String(raw).trim()
  if (!text) return NaN

  const cleaned = text
    .replace(/r\$\s?/gi, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim()

  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : NaN
}

function parseCsvLine(line, delimiter) {
  const out = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    const next = line[i + 1]

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (!inQuotes && ch === delimiter) {
      out.push(current)
      current = ''
      continue
    }

    current += ch
  }

  out.push(current)
  return out.map((v) => v.trim())
}

function parseMotorBase(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l, idx) => (idx === 0 ? l.replace(/^\uFEFF/, '') : l))

  const nonEmptyLines = lines.filter((l) => l.trim() !== '')
  if (nonEmptyLines.length < 2) {
    throw new Error('Arquivo invalido: inclua cabecalho e ao menos uma linha de dados.')
  }

  const headerLine = nonEmptyLines[0]
  const headerParts = parseCsvLine(headerLine, ';').map((h) => String(h || '').trim().toUpperCase())
  const expected = MOTOR_HEADERS.join(';')
  const current = headerParts.join(';')

  if (headerParts.length !== MOTOR_HEADERS.length || current !== expected) {
    throw new Error(`Cabecalho invalido. Esperado: ${expected}`)
  }

  const rows = []
  const errors = []

  for (let i = 1; i < nonEmptyLines.length; i += 1) {
    const line = nonEmptyLines[i]
    const values = parseCsvLine(line, ';')
    const lineNumber = i + 1

    if (values.length < MOTOR_HEADERS.length) {
      errors.push(`Linha ${lineNumber}: quantidade de colunas invalida.`)
      continue
    }

    const row = {
      EQUIPE: String(values[0] ?? '').trim(),
      VEND: String(values[1] ?? '').trim(),
      AREA: String(values[2] ?? '').trim(),
      FORNECEDOR: String(values[3] ?? '').trim(),
      TIPO: String(values[4] ?? '').trim().toUpperCase(),
      VALOR: String(values[5] ?? '').trim(),
    }

    if (!row.EQUIPE || !row.VEND || !row.AREA || !row.FORNECEDOR || !row.TIPO || !row.VALOR) {
      errors.push(`Linha ${lineNumber}: campos obrigatorios nao preenchidos.`)
      continue
    }

    if (!VALID_TIPOS.has(row.TIPO)) {
      errors.push(`Linha ${lineNumber}: TIPO deve ser MEDIA ou HISTORICO.`)
      continue
    }

    const valorNum = parseStrictNumber(row.VALOR)
    if (!Number.isFinite(valorNum)) {
      errors.push(`Linha ${lineNumber}: VALOR invalido.`)
      continue
    }

    rows.push({
      ...row,
      VALOR_NUM: valorNum,
    })
  }

  if (errors.length > 0) {
    throw new Error(errors.slice(0, 8).join(' | '))
  }

  if (rows.length === 0) {
    throw new Error('Nenhuma linha valida encontrada no arquivo.')
  }

  return rows
}

function downloadModelFile() {
  const modelContent = [
    MOTOR_HEADERS.join(';'),
    'EQUIPE NORTE;3231;MP;BAUDUCCO;MEDIA;12500',
    'EQUIPE NORTE;3231;MP;BAUDUCCO;HISTORICO;11800',
    'EQUIPE SUL;4120;MP;BENEVIA;MEDIA;8300',
    'EQUIPE SUL;4120;MP;BENEVIA;HISTORICO;9100',
  ].join('\n')

  const blob = new Blob([modelContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'base_modelo_metas.csv'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function fmtBRL(value) {
  const n = Number(value ?? 0)
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function calcularTotaisMediaHistorico(fornecedores) {
  const totais = {
    media_total: 0,
    historico_total: 0,
    media_count: 0,
    historico_count: 0,
  }

  fornecedores.forEach((f) => {
    totais.media_total += f.media || 0
    totais.historico_total += f.historico || 0
    if ((f.media || 0) > 0) totais.media_count += 1
    if ((f.historico || 0) > 0) totais.historico_count += 1
  })

  return totais
}

function toCsvField(value) {
  const str = String(value ?? '')
  return /[;"\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

function buildVendedorMaps(vendedores) {
  const codeToName = new Map()
  const nameToCode = new Map()
  ;(vendedores || []).forEach((v) => {
    const code = String(v.codigo || '').trim()
    const name = String(v.nome || '').trim()
    if (code) codeToName.set(code, name || code)
    if (name) nameToCode.set(name, code)
  })
  return { codeToName, nameToCode }
}

function buildMetasRows(sourceData, maps, formattedDate) {
  const { codeToName, nameToCode } = maps
  return sourceData.map((item) => {
    const equipe = item.team ?? ''
    const fornecedor = item.supplier ?? ''

    let vend = item.sellerCode || item.vend || ''
    let area = item.area || item.seller || ''

    if (!vend && area && nameToCode.has(String(area).trim())) {
      vend = nameToCode.get(String(area).trim())
    }

    if (vend && codeToName.has(String(vend).trim())) {
      area = codeToName.get(String(vend).trim())
    }

    const metaRaw = item.adjusted ?? item.suggested ?? item.meta_final ?? 0
    const metaFormatted = Math.round(Number(metaRaw) || 0).toLocaleString('pt-BR')

    return [formattedDate, equipe, fornecedor, vend, area, metaFormatted].map(toCsvField).join(';')
  })
}

function downloadCsv(filename, content) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export default function ConfiguracoesPage({ embedded = false }) {
  const {
    selectedPeriod,
    vendedores = [],
    distribuicao = [],
    ajustes = [],
    setFornecedores,
    setGerentes,
    setEquipes,
    setVendedores,
    setRecords,
    setDistribuicao,
    setAjustes,
    setMediaEncontrada,
    setHistoricoEncontrado,
    setFornecedorEquipeStats,
    setFornecedorVendedorStats,
  } = useOutletContext()

  function exportMetasCsv() {
    const year = selectedPeriod?.year ?? new Date().getFullYear()
    const monthIndex = selectedPeriod?.month ?? new Date().getMonth()
    const monthStr = String(monthIndex + 1).padStart(2, '0')
    const monthRef = `${year}-${monthStr}`
    const formattedDate = `01/${monthStr}/${year}`

    let sourceData = (ajustes || []).filter((item) => item.month === monthRef)
    if (sourceData.length === 0) {
      sourceData = (distribuicao || []).filter((item) => item.month === monthRef)
    }
    if (sourceData.length === 0) {
      alert('Nenhuma meta distribuída ou ajustada foi encontrada para o período selecionado.')
      return
    }

    const maps = buildVendedorMaps(vendedores)
    const rows = buildMetasRows(sourceData, maps, formattedDate)
    const csvContent = ['DATA;EQUIPE;FORNECEDOR;VEND;AREA;META', ...rows].join('\n')

    downloadCsv(`metas_distribuidas_${year}_${monthStr}.csv`, csvContent)
  }

  const [file, setFile] = useState(null)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState(null)

  const acceptedFormats = useMemo(() => '.csv,.txt', [])

  async function readFileContent(selectedFile) {
    const text = await selectedFile.text()
    return parseMotorBase(text)
  }

  function mapRowsToState(rawRows) {
    const fornecedoresMap = new Map()
    const equipesMap = new Map()
    const vendedoresMap = new Map()
    const supplierStatsMap = new Map()
    const fornecedorEquipeStatsMap = new Map() // mapa por (fornecedor, equipe)
    const fornecedorVendedorStatsMap = new Map() // mapa por (fornecedor, equipe, vendedor)

    rawRows.forEach((row, idx) => {
      const teamName = String(row.EQUIPE).trim()
      const sellerCode = String(row.VEND).trim()
      const supplierName = String(row.FORNECEDOR).trim()
      const area = String(row.AREA).trim()
      const tipo = String(row.TIPO).trim().toUpperCase()
      const valor = parseNumber(row.VALOR_NUM)

      if (teamName && !equipesMap.has(teamName)) {
        equipesMap.set(teamName, {
          id: Date.now() + 100000 + idx,
          codigo: `EQ${idx + 1}`,
          nome: teamName,
          gerente: '',
        })
      }

      if (sellerCode) {
        const vendedorKey = `${sellerCode}__${teamName}`
        if (!vendedoresMap.has(vendedorKey)) {
          vendedoresMap.set(vendedorKey, {
            id: Date.now() + 150000 + idx,
            codigo: sellerCode,
            nome: area,
            area: area,
            equipe: teamName,
          })
        }
      }

      // Agregar dados por (fornecedor, equipe)
      const equipeStatKey = `${supplierName}#${teamName}`
      const equipeStats = fornecedorEquipeStatsMap.get(equipeStatKey) ?? { media: 0, historico: 0 }
      if (tipo === 'MEDIA') equipeStats.media += valor
      else if (tipo === 'HISTORICO') equipeStats.historico += valor
      fornecedorEquipeStatsMap.set(equipeStatKey, equipeStats)

      // Agregar dados por (fornecedor, equipe, vendedor) — nível individual
      const vendedorStatKey = `${supplierName}#${teamName}#${sellerCode}`
      const vendedorStats = fornecedorVendedorStatsMap.get(vendedorStatKey) ?? { media: 0, historico: 0 }
      if (tipo === 'MEDIA') vendedorStats.media += valor
      else if (tipo === 'HISTORICO') vendedorStats.historico += valor
      fornecedorVendedorStatsMap.set(vendedorStatKey, vendedorStats)

      const supplierStat = supplierStatsMap.get(supplierName) ?? {
        code: `F${supplierStatsMap.size + 1}`,
        name: supplierName,
        segment: area,
        mediaSum: 0,
        historicoSum: 0,
      }

      if (tipo === 'MEDIA') {
        supplierStat.mediaSum += valor
      }

      if (tipo === 'HISTORICO') {
        supplierStat.historicoSum += valor
      }

      supplierStatsMap.set(supplierName, supplierStat)
    })

    supplierStatsMap.forEach((stat, idx) => {
      fornecedoresMap.set(stat.name, {
        id: Date.now() + idx,
        codigo: stat.code,
        nome: stat.name,
        pauta: 'D',
        segmento: stat.segment,
        historico: stat.historicoSum,
        media: stat.mediaSum,
      })
    })

    return {
      fornecedores: Array.from(fornecedoresMap.values()),
      gerentes: [],
      equipes: Array.from(equipesMap.values()),
      vendedores: Array.from(vendedoresMap.values()),
      records: [],
      totalRows: rawRows.length,
      fornecedorEquipeStats: Object.fromEntries(fornecedorEquipeStatsMap),
      fornecedorVendedorStats: Object.fromEntries(fornecedorVendedorStatsMap),
    }
  }

  async function handleImport() {
    if (!file) {
      setError('Selecione um arquivo para importar.')
      return
    }

    setIsImporting(true)
    setError('')

    try {
      const rawRows = await readFileContent(file)
      if (!Array.isArray(rawRows) || rawRows.length === 0) {
        throw new Error('O arquivo não possui linhas válidas para importação.')
      }

      const mapped = mapRowsToState(rawRows)

      setFornecedores(mapped.fornecedores)
      setGerentes(mapped.gerentes)
      setEquipes(mapped.equipes)
      setVendedores(mapped.vendedores)
      setRecords(mapped.records)
      setFornecedorEquipeStats(mapped.fornecedorEquipeStats)
      setFornecedorVendedorStats(mapped.fornecedorVendedorStats)

      // Reinicia estágios posteriores após uma nova carga de base
      setDistribuicao([])
      setAjustes([])

      const totaisMetricas = calcularTotaisMediaHistorico(mapped.fornecedores)

      // Atualizar estado global
      setMediaEncontrada(totaisMetricas.media_total)
      setHistoricoEncontrado(totaisMetricas.historico_total)

      setSummary({
        rows: mapped.totalRows,
        fornecedores: mapped.fornecedores.length,
        gerentes: mapped.gerentes.length,
        equipes: mapped.equipes.length,
        vendedores: mapped.vendedores.length,
        records: mapped.records.length,
        fileName: file.name,
        media_encontrada: totaisMetricas.media_total,
        historico_encontrado: totaisMetricas.historico_total,
      })
    } catch (e) {
      setError(e.message || 'Falha ao importar arquivo.')
      setSummary(null)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <main className={embedded ? 'space-y-4' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6'}>
      {!embedded && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">Configuracoes e Importacao de Dados</h2>
          <p className="mt-1 text-sm text-slate-500">

          </p>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <FileSpreadsheet size={18} className="text-[#4997D0]" />
          <h3 className="text-lg font-bold text-slate-900">Arquivo de carga (Base Motor)</h3>
        </div>

        <div className="mb-4 flex justify-end gap-3 flex-wrap">
          <button
            type="button"
            onClick={downloadModelFile}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <FileSpreadsheet size={16} />
            Baixar Modelo
          </button>
          <button
            type="button"
            onClick={exportMetasCsv}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            <Download size={16} className="text-emerald-600" />
            Extrair Metas (CSV)
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Selecionar arquivo</label>
            <input
              type="file"
              accept={acceptedFormats}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            />
            <p className="mt-2 text-xs text-slate-500">
              Cabecalho obrigatorio (ordem exata): EQUIPE;VEND;AREA;FORNECEDOR;TIPO;VALOR. TIPO deve ser MEDIA ou HISTORICO.
            </p>
          </div>

          <button
            type="button"
            onClick={handleImport}
            disabled={isImporting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#4997D0] px-5 py-2.5 text-sm font-bold text-white hover:brightness-110 transition-all disabled:opacity-60"
          >
            <Upload size={16} />
            {isImporting ? 'Importando...' : 'Importar e Aplicar'}
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {summary && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4">
            <div className="flex items-center gap-2 text-emerald-700 mb-2">
              <CheckCircle2 size={16} />
              <p className="text-sm font-bold">Importacao concluida: {summary.fileName}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
              <div className="rounded-md bg-white/70 px-3 py-2"><span className="text-slate-500">Linhas</span><p className="font-bold text-slate-900">{summary.rows}</p></div>
              <div className="rounded-md bg-white/70 px-3 py-2"><span className="text-slate-500">Fornecedores</span><p className="font-bold text-slate-900">{summary.fornecedores}</p></div>
              <div className="rounded-md bg-white/70 px-3 py-2"><span className="text-slate-500">Média</span><p className="font-bold text-slate-900">{fmtBRL(summary.media_encontrada)}</p></div>
              <div className="rounded-md bg-white/70 px-3 py-2"><span className="text-slate-500">Histórico</span><p className="font-bold text-slate-900">{fmtBRL(summary.historico_encontrado)}</p></div>
              <div className="rounded-md bg-white/70 px-3 py-2"><span className="text-slate-500">Equipes</span><p className="font-bold text-slate-900">{summary.equipes}</p></div>
              <div className="rounded-md bg-white/70 px-3 py-2"><span className="text-slate-500">Vendedores</span><p className="font-bold text-slate-900">{summary.vendedores}</p></div>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
