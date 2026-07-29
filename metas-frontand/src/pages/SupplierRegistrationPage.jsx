import { useEffect, useMemo, useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { Zap } from 'lucide-react'
import ExcelGrid from '../components/ExcelGrid'
import { MONTHS } from '../App'
import { distribuirMetas } from '../services/distributionService'

function toCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value)
}

function parseCurrencyInput(rawValue) {
  if (typeof rawValue === 'number') {
    return Number.isFinite(rawValue) ? rawValue : null
  }

  const text = String(rawValue ?? '').trim()
  if (!text) return 0

  const normalized = text
    .replace(/r\$\s?/gi, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim()

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function formatPercentChange(value) {
  if (!Number.isFinite(value)) return '-'
  return `${value >= 0 ? '+' : ''}${(value * 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`
}

export default function SupplierRegistrationPage() {
  const {
    selectedPeriod,
    fornecedores,
    equipes,
    vendedores,
    records,
    setRecords: setContextRecords,
    fornecedorVendedorStats,
    setDistribuicao,
  } = useOutletContext()
  const navigate = useNavigate()

  const monthRef = `${selectedPeriod.year}-${String(selectedPeriod.month + 1).padStart(2, '0')}`
  const monthLabel = `${MONTHS[selectedPeriod.month]} ${selectedPeriod.year}`

  const [distributeModalOpen, setDistributeModalOpen] = useState(false)
  const [isDistributing, setIsDistributing] = useState(false)

  useEffect(() => {
    setContextRecords((prev) => {
      const safePrev = Array.isArray(prev) ? prev : []
      const monthRows = safePrev.filter((row) => row.month === monthRef)
      const monthRowsByCode = new Map(
        monthRows
          .filter((row) => row?.supplierCode)
          .map((row) => [String(row.supplierCode), row]),
      )

      const autoRows = fornecedores.map((supplier) => {
        const code = String(supplier.codigo || '')
        const existing = monthRowsByCode.get(code)

        return {
          id: existing?.id ?? `${monthRef}-${code || supplier.nome}`,
          supplierCode: code,
          supplierName: supplier.nome,
          historico: Number(supplier.historico || 0),
          media: Number(supplier.media || 0),
          month: monthRef,
          initialTarget: Number(existing?.initialTarget || 0),
        }
      })

      const next = [
        ...safePrev.filter((row) => row.month !== monthRef),
        ...autoRows,
      ]

      const prevSerialized = JSON.stringify(safePrev)
      const nextSerialized = JSON.stringify(next)
      return prevSerialized === nextSerialized ? safePrev : next
    })
  }, [fornecedores, monthRef, setContextRecords])

  const filtered = useMemo(
    () => (Array.isArray(records) ? records : []).filter((r) => r.month === monthRef),
    [records, monthRef],
  )

  const totalTarget = useMemo(
    () => filtered.reduce((acc, row) => acc + row.initialTarget, 0),
    [filtered],
  )

  function handleDistribute() {
    if (filtered.length === 0) {
      alert('Cadastre pelo menos um fornecedor antes de distribuir.')
      return
    }
    setDistributeModalOpen(true)
  }

  function transformarDistribuicaoParaTela(distribuicao, selectedPeriod) {
    const monthRef = `${selectedPeriod.year}-${String(selectedPeriod.month + 1).padStart(2, '0')}`
    const resultado = []

    // distribuicao vem como { FORNECEDOR: [{ equipe, vendedor, media, historico, meta_final }] }
    // Manter 1 linha por vendedor (nível individual)
    Object.entries(distribuicao).forEach(([fornecedor, entidades]) => {
      entidades.forEach((entidade) => {
        resultado.push({
          month: monthRef,
          supplier: fornecedor,
          team: entidade.equipe,
          seller: entidade.vendedor,
          history: entidade.historico || 0,
          average: entidade.media || 0,
          suggested: entidade.meta_final || 0,
          adjusted: entidade.meta_final || 0,
          indice_pressao: entidade.indice_pressao || 0,
        })
      })
    })

    return resultado
}

  async function confirmDistribute() {
    setIsDistributing(true)
    try {
      const result = await distribuirMetas(filtered, vendedores, {}, fornecedorVendedorStats)

      if (!result.sucesso) {
        alert(`Erro ao distribuir: ${result.erro}`)
        return
      }

      // Transformar distribuição para o formato da tela e armazenar
      const distribuicaoFormatada = transformarDistribuicaoParaTela(result.distribuicao, selectedPeriod)
      setDistribuicao(distribuicaoFormatada)

      console.log('Distribuição bem-sucedida:', result.distribuicao)
      setDistributeModalOpen(false)
      navigate('/gerente')
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao distribuir metas. Verifique o console.')
    } finally {
      setIsDistributing(false)
    }
  }

  function handleCancelDistribute() {
    if (isDistributing) return
    setDistributeModalOpen(false)
  }

  function handleCellValueChanged(params) {
    const rowId = params.data?.id
    if (!rowId || params.colDef.field !== 'initialTarget') return

    const parsedValue = parseCurrencyInput(params.newValue)
    if (parsedValue == null || parsedValue < 0) {
      params.node.setDataValue('initialTarget', params.oldValue || 0)
      return
    }

    params.node.setDataValue('initialTarget', parsedValue)

    setContextRecords((prev) =>
      (Array.isArray(prev) ? prev : []).map((row) =>
        row.id === rowId ? { ...row, initialTarget: parsedValue } : row,
      ),
    )
  }

  const columnDefs = [
    { headerName: 'Mes', field: 'monthLabel', minWidth: 130, pinned: 'left' },
    {
      headerName: 'Fornecedor',
      field: 'supplierName',
      minWidth: 180,
      filter: 'agTextColumnFilter',
    },
    {
      headerName: 'Histórico L3M',
      field: 'historico',
      minWidth: 155,
      valueFormatter: (params) => toCurrency(params.value || 0),
    },
    {
      headerName: 'Média',
      field: 'media',
      minWidth: 140,
      valueFormatter: (params) => toCurrency(params.value || 0),
    },
    {
      headerName: 'Meta Inicial',
      field: 'initialTarget',
      minWidth: 150,
      editable: true,
      cellStyle: { backgroundColor: '#CCE0FF' },
      valueFormatter: (params) => toCurrency(params.value || 0),
    },
    {
      headerName: '% Hist.',
      minWidth: 160,
      valueGetter: (params) => {
        const meta = Number(params.data?.initialTarget ?? 0)
        const historico = Number(params.data?.historico ?? 0)
        if (historico <= 0) return null
        return meta / historico - 1
      },
      cellRenderer: (params) => {
        if (params.value == null) {
          return <span className="text-slate-400 font-semibold">-</span>
        }
        const cls = params.value >= 0 ? 'text-emerald-600' : 'text-rose-600'
        return <span className={`font-bold ${cls}`}>{formatPercentChange(params.value)}</span>
      },
    },
    {
      headerName: '% Méd.',
      minWidth: 160,
      valueGetter: (params) => {
        const meta = Number(params.data?.initialTarget ?? 0)
        const media = Number(params.data?.media ?? 0)
        if (media <= 0) return null
        return meta / media - 1
      },
      cellRenderer: (params) => {
        if (params.value == null) {
          return <span className="text-slate-400 font-semibold">-</span>
        }
        const cls = params.value >= 0 ? 'text-emerald-600' : 'text-rose-600'
        return <span className={`font-bold ${cls}`}>{formatPercentChange(params.value)}</span>
      },
    },
  ]

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-3xl font-bold text-slate-900">Cadastro de Metas Iniciais por Fornecedor</h2>
        <p className="mt-1 text-sm text-slate-500">
          Os fornecedores sao carregados automaticamente da base importada. Informe a meta inicial direto na tabela.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider font-bold text-slate-500">Fornecedores no mes</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{filtered.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider font-bold text-slate-500">Meta total cadastrada</p>
          <p className="mt-2 text-3xl font-bold text-[#4997D0]">{toCurrency(totalTarget)}</p>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-900">Fornecedores com Meta Inicial</h3>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm">Nenhum fornecedor encontrado na base importada para este mes.</div>
        ) : (
          <>
            <ExcelGrid
              rowData={filtered.map((row) => ({ ...row, monthLabel }))}
              columnDefs={columnDefs}
              height={600}
              onCellValueChanged={handleCellValueChanged}
            />
            <div className="p-4 border-t border-slate-100 bg-slate-50/40 flex justify-end">
              <button
                type="button"
                onClick={handleDistribute}
                className="inline-flex items-center gap-2 rounded-lg bg-[#4997D0] px-6 py-2 text-sm font-bold text-white hover:brightness-110 transition-all"
              >
                <Zap size={16} className="text-amber-400" />
                Distribuir Metas do Mês
              </button>
            </div>
          </>
        )}
      </section>

      <div
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${
          distributeModalOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleCancelDistribute}
      />

      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
          distributeModalOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
          <div>
            <h2 className="text-base font-bold text-slate-900">Distribuir Metas do Mês</h2>
            <p className="mt-1 text-sm text-slate-600">
              Será iniciada a distribuição de {filtered.length} fornecedor{filtered.length > 1 ? 'es' : ''} com meta de {toCurrency(totalTarget)} para {equipes.length} equipe{equipes.length > 1 ? 's' : ''} e {vendedores.length} representante{vendedores.length > 1 ? 's' : ''}.
            </p>
          </div>
          <div className="border-t border-slate-100 pt-4 mt-4 flex gap-3 justify-end">
            <button
              type="button"
              onClick={handleCancelDistribute}
              disabled={isDistributing}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmDistribute}
              disabled={isDistributing}
              className="inline-flex items-center gap-2 rounded-lg bg-[#4997D0] px-4 py-2 text-sm font-bold text-white hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap size={16} className="text-amber-400" />
              {isDistributing ? 'Distribuindo...' : 'Distribuir'}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
