import { AlertTriangle, Lock, CheckCircle2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import ExcelGrid from '../components/ExcelGrid'
import { Divider } from '../components/divider'

const fmtBRL = (v) => {
  if (v == null || (typeof v === 'number' && isNaN(v))) return ''
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function parseBRL(raw) {
  const n = parseFloat(
    String(raw)
      .replace(/R\$\s?/g, '')
      .replace(/\./g, '')
      .replace(',', '.')
      .trim(),
  )
  return isNaN(n) ? null : n
}

function getVariationLabel(adjusted, average) {
  if (!average) return '-'
  const delta = ((adjusted - average) / average) * 100
  const rounded = Math.round(delta)
  if (rounded === 0) return '-'
  return `${rounded > 0 ? '^' : 'v'}${Math.abs(rounded)}%`
}

function renderVariationCell(params) {
  const trend = getVariationLabel(params.data?.adjusted ?? 0, params.data?.average ?? 0)
  const cls = trend.startsWith('^')
    ? 'text-emerald-600'
    : trend.startsWith('v')
      ? 'text-rose-600'
      : 'text-slate-400'
  return <span className={`${cls} font-bold text-sm`}>{trend}</span>
}

// ── Modal de alerta ──────────────────────────────────────────────────────────
function AlertModal({ open, onClose, diff }) {
  if (!open) return null
  const falta = diff < 0
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay — não fecha ao clicar fora, forçando o usuário a ajustar */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      {/* Painel */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-100">
            <AlertTriangle size={20} className="text-rose-600" />
          </span>
          <div className="flex-1">
            <h2 className="text-base font-bold text-slate-900">Distribuição incompleta</h2>
            <p className="mt-1 text-sm text-slate-600">
              A soma das metas dos vendedores não corresponde à meta da equipe.{' '}
              {falta ? (
                <>Faltam <span className="font-bold text-rose-600">{fmtBRL(Math.abs(diff))}</span> para atingir 100% do objetivo.</>
              ) : (
                <>Há um excedente de <span className="font-bold text-rose-600">{fmtBRL(diff)}</span> acima da meta permitida.</>
              )}{' '}
              Ajuste os valores antes de finalizar.
            </p>
          </div>
        </div>
        <div className="flex justify-end border-t border-slate-100 pt-4">
          <button
            onClick={onClose}
            className="rounded-xl bg-[#4997D0] px-6 py-2 text-sm font-bold text-white hover:brightness-110 transition-all"
          >
            Voltar e Ajustar
          </button>
        </div>
      </div>
    </div>
  )
}

const seedSellers = []

export default function SupervisorFinalPage() {
  const { distribuicao = [], selectedPeriod, setAjustes } = useOutletContext()
  const monthRef = `${selectedPeriod.year}-${String(selectedPeriod.month + 1).padStart(2, '0')}`
  const lockStorageKey = `metaflow:supervisor-lock:${monthRef}`

  // Dados já chegam em nível de vendedor (campo 'seller' preenchido)
  const initialSellers = useMemo(() => {
    const distribuicaoDoMes = (distribuicao || []).filter((dist) => dist.month === monthRef)
    if (distribuicaoDoMes.length === 0) return seedSellers

    return distribuicaoDoMes.map((dist, index) => ({
      rowId: `${dist.month || monthRef}__${dist.supplier}__${dist.team}__${dist.sellerCode || dist.seller || 'SEM'}_${index}`,
      month: dist.month || monthRef,
      supplier: dist.supplier,
      team: dist.team,
      seller: dist.seller || 'Sem vendedor',
      sellerCode: dist.sellerCode || dist.seller || 'SEM_VENDEDOR',
      area: dist.area || dist.seller || '',
      history: dist.history || 0,
      average: dist.average || 0,
      suggested: dist.suggested || 0,
      adjusted: dist.adjusted || 0,
    }))
  }, [distribuicao, monthRef])

  const [sellers, setSellers] = useState(initialSellers)
  const [visibleRows, setVisibleRows] = useState(initialSellers)
  const [alertOpen, setAlertOpen] = useState(false)
  const [locked, setLocked] = useState(() => localStorage.getItem(lockStorageKey) === 'true')

  useEffect(() => {
    setSellers(initialSellers)
    setVisibleRows(initialSellers)
  }, [initialSellers])

  useEffect(() => {
    setLocked(localStorage.getItem(lockStorageKey) === 'true')
  }, [lockStorageKey])

  function syncVisibleRows(params) {
    const allRows = []
    params.api.forEachNodeAfterFilter((node) => {
      allRows.push(node.data)
    })
    setVisibleRows(allRows)
  }

  const distributed = useMemo(
    () => sellers.reduce((sum, s) => sum + (s.adjusted ?? 0), 0),
    [sellers],
  )

  const overallTarget = useMemo(
    () => sellers.reduce((sum, s) => sum + (s.suggested ?? 0), 0),
    [sellers],
  )

  const visibleDistributed = useMemo(
    () => visibleRows.reduce((sum, s) => sum + (s.adjusted ?? 0), 0),
    [visibleRows],
  )

  const totalTarget = useMemo(
    () => visibleRows.reduce((sum, s) => sum + (s.suggested ?? 0), 0),
    [visibleRows],
  )

  const totalHistory = useMemo(
    () => sellers.reduce((sum, s) => sum + (s.history ?? 0), 0),
    [sellers],
  )

  const totalAverage = useMemo(
    () => sellers.reduce((sum, s) => sum + (s.average ?? 0), 0),
    [sellers],
  )

  const groupedBySupplier = useMemo(() => {
    return sellers.reduce((acc, seller) => {
      const key = seller.supplier
      const existing = acc.find((g) => g.supplier === key)
      if (existing) {
        existing.history += seller.history ?? 0
        existing.average += seller.average ?? 0
        existing.suggested += seller.suggested ?? 0
        existing.adjusted += seller.adjusted ?? 0
      } else {
        acc.push({
          supplier: key,
          history: seller.history ?? 0,
          average: seller.average ?? 0,
          suggested: seller.suggested ?? 0,
          adjusted: seller.adjusted ?? 0,
        })
      }
      return acc
    }, []).concat([{
      supplier: 'TOTAL',
      history: sellers.reduce((sum, s) => sum + (s.history ?? 0), 0),
      average: sellers.reduce((sum, s) => sum + (s.average ?? 0), 0),
      suggested: visibleRows.reduce((sum, s) => sum + (s.suggested ?? 0), 0),
      adjusted: visibleRows.reduce((sum, s) => sum + (s.adjusted ?? 0), 0),
      isTotal: true,
    }])
  }, [sellers, visibleRows])

  const groupedBySeller = useMemo(() => {
    const sellerRows = visibleRows.map((seller) => ({ ...seller }))
    const totals = {
      seller: 'TOTAL',
      supplier: '',
      team: '',
      history: sellers.reduce((sum, s) => sum + (s.history ?? 0), 0),
      average: sellers.reduce((sum, s) => sum + (s.average ?? 0), 0),
      suggested: visibleRows.reduce((sum, s) => sum + (s.suggested ?? 0), 0),
      adjusted: visibleRows.reduce((sum, s) => sum + (s.adjusted ?? 0), 0),
      isTotal: true,
    }
    return [...sellerRows, totals]
  }, [sellers, visibleRows])

  const diff = visibleDistributed - totalTarget
  const pct = totalTarget > 0 ? Math.min(100, Math.round((visibleDistributed / totalTarget) * 100)) : 0
  const overallDiff = distributed - overallTarget

  function onCellValueChanged(e) {
    if (locked) return
    if (e.column.getColId() !== 'adjusted') return
    const rowId = e.data?.rowId
    if (!rowId) return

    const applyValue = (val) => {
      setSellers((prev) =>
        // Nunca sobrescreve 'suggested' — apenas 'adjusted'
        prev.map((s) => (s.rowId === rowId ? { ...s, adjusted: val } : s)),
      )
    }

    if (typeof e.newValue === 'number') {
      applyValue(e.newValue)
      return
    }
    const parsed = parseBRL(String(e.newValue ?? ''))
    if (parsed != null) {
      e.node.setDataValue('adjusted', parsed)
      applyValue(parsed)
    }
  }

  function handleSave() {
    if (Math.abs(diff) > 0.01) {
      setAlertOpen(true)
    } else {
      // Salva ajustes no contexto
      setAjustes(sellers.map((seller) => ({ ...seller, month: seller.month || monthRef })))
      // Bloqueia edições
      localStorage.setItem(lockStorageKey, 'true')
      setLocked(true)
      // Mostra feedback
      alert('✓ Metas finalizadas com sucesso!')
    }
  }

  const supplierSummaryColumns = useMemo(
    () => [
      {
        headerName: 'Fornecedor',
        field: 'supplier',
        minWidth: 200,
        cellClass: (params) => params.data?.isTotal ? 'ag-cell-total' : '',
      },
      {
        headerName: 'Historico',
        field: 'history',
        minWidth: 140,
        valueFormatter: (p) => fmtBRL(p.value),
        cellClass: (params) => params.data?.isTotal ? 'ag-cell-total' : '',
      },
      {
        headerName: 'Media',
        field: 'average',
        minWidth: 140,
        valueFormatter: (p) => fmtBRL(p.value),
        cellClass: (params) => params.data?.isTotal ? 'ag-cell-total' : '',
      },
      {
        headerName: 'Meta Sugerida',
        field: 'suggested',
        minWidth: 150,
        cellStyle: { backgroundColor: '#E5F0FF' },
        valueFormatter: (p) => fmtBRL(p.value),
        cellClass: (params) => params.data?.isTotal ? 'ag-cell-total' : '',
      },
      {
        headerName: 'Meta Ajustada',
        field: 'adjusted',
        minWidth: 160,
        valueFormatter: (p) => fmtBRL(p.value),
        cellClass: (params) => params.data?.isTotal ? 'ag-cell-total font-bold' : 'font-bold',
      },
      {
        headerName: 'Variacao',
        minWidth: 110,
        cellRenderer: (params) => renderVariationCell(params),
        cellClass: (params) => params.data?.isTotal ? 'ag-cell-total' : '',
      },
    ],
    [],
  )

  const sellerSummaryColumns = useMemo(
    () => [
      {
        headerName: 'Vendedor',
        field: 'seller',
        minWidth: 200,
        cellClass: (params) => params.data?.isTotal ? 'ag-cell-total' : '',
      },
      {
        headerName: 'Historico',
        field: 'history',
        minWidth: 140,
        valueFormatter: (p) => fmtBRL(p.value),
        cellClass: (params) => params.data?.isTotal ? 'ag-cell-total' : '',
      },
      {
        headerName: 'Media',
        field: 'average',
        minWidth: 140,
        valueFormatter: (p) => fmtBRL(p.value),
        cellClass: (params) => params.data?.isTotal ? 'ag-cell-total' : '',
      },
      {
        headerName: 'Meta Sugerida',
        field: 'suggested',
        minWidth: 150,
        cellStyle: { backgroundColor: '#E5F0FF' },
        valueFormatter: (p) => fmtBRL(p.value),
        cellClass: (params) => params.data?.isTotal ? 'ag-cell-total' : '',
      },
      {
        headerName: 'Meta Ajustada',
        field: 'adjusted',
        minWidth: 160,
        valueFormatter: (p) => fmtBRL(p.value),
        cellClass: (params) => params.data?.isTotal ? 'ag-cell-total font-bold' : 'font-bold',
      },
      {
        headerName: 'Variacao',
        minWidth: 110,
        cellRenderer: (params) => renderVariationCell(params),
        cellClass: (params) => params.data?.isTotal ? 'ag-cell-total' : '',
      },
    ],
    [],
  )

  const columnDefs = useMemo(
    () => [
      {
        headerName: 'Fornecedor',
        field: 'supplier',
        minWidth: 170,
        pinned: 'left',
        filter: 'agTextColumnFilter',
      },
      {
        headerName: 'Equipe',
        field: 'team',
        minWidth: 150,
        filter: 'agTextColumnFilter',
      },
      { headerName: 'Vendedor', field: 'seller', minWidth: 170 },
      { headerName: 'Historico (L3M)', field: 'history', minWidth: 150, valueFormatter: (p) => fmtBRL(p.value) },
      { headerName: 'Media', field: 'average', minWidth: 130, valueFormatter: (p) => fmtBRL(p.value) },
      {
        headerName: 'Meta Sugerida',
        field: 'suggested',
        minWidth: 150,
        editable: false,
        cellStyle: { backgroundColor: '#E5F0FF' },
        valueFormatter: (p) => fmtBRL(p.value),
      },
      {
        headerName: locked ? 'Meta Ajustada 🔒' : 'Meta Ajustada',
        field: 'adjusted',
        minWidth: 160,
        editable: !locked,
        cellClass: locked ? 'font-bold text-slate-400' : 'font-bold',
        cellStyle: locked
          ? { cursor: 'not-allowed', background: '#f8fafc' }
          : { backgroundColor: '#CCE0FF' },
        valueFormatter: (p) => fmtBRL(p.value),
      },
      {
        headerName: 'Diferença',
        minWidth: 140,
        valueGetter: (p) => (p.data?.adjusted ?? 0) - (p.data?.suggested ?? 0),
        cellRenderer: (p) => {
          const diff = (p.data?.adjusted ?? 0) - (p.data?.suggested ?? 0)
          if (diff === 0) return <span className="text-slate-400 text-sm">—</span>
          const positive = diff > 0
          return (
            <span className={`font-bold text-sm ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {positive ? '+' : ''}{fmtBRL(diff)}
            </span>
          )
        },
      },
      {
        headerName: 'Variacao',
        minWidth: 110,
        cellRenderer: (params) => renderVariationCell(params),
      },
    ],
    [locked],
  )

  return (
    <>
      <AlertModal
        open={alertOpen}
        onClose={() => setAlertOpen(false)}
        diff={overallDiff}
      />

      <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-slate-900">Ajuste de Metas dos Vendedores</h2>

        <section className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <ExcelGrid
              rowData={groupedBySupplier}
              columnDefs={supplierSummaryColumns}
              height={200}
            />
          </div>

          <Divider />

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <ExcelGrid
              rowData={groupedBySeller}
              columnDefs={sellerSummaryColumns}
              height={280}
            />
          </div>
        </section>

        <section className="flex flex-col gap-4 md:items-end">
          <div className="flex flex-wrap justify-end gap-3">
            <div className="flex gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Historico total</p>
                <p className="text-xl font-bold text-slate-900">{fmtBRL(totalHistory)}</p>
              </div>
              <div className="w-px bg-slate-200" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Media total</p>
                <p className="text-xl font-bold text-slate-900">{fmtBRL(totalAverage)}</p>
              </div>
            </div>

            <div className="flex gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Meta total equipe</p>
                <p className="text-xl font-bold text-slate-900">{fmtBRL(totalTarget)}</p>
              </div>
              <div className="w-px bg-slate-200" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Distribuido</p>
                <p className={`text-xl font-bold ${Math.abs(diff) < 0.01 ? 'text-emerald-600' : 'text-[#4997D0]'}`}>
                  {fmtBRL(visibleDistributed)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <ExcelGrid
            rowData={sellers}
            columnDefs={columnDefs}
            height={340}
            onCellValueChanged={onCellValueChanged}
            onModelUpdated={syncVisibleRows}
          />

          <div className="flex flex-col gap-4 bg-slate-50 px-6 py-4 md:flex-row md:items-center md:justify-between">
            <div className="w-full max-w-md">
              <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase text-slate-500">
                <span>Meta Distribuída</span>
                <span className={pct >= 100 ? 'text-emerald-600' : 'text-slate-900'}>{pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full transition-all ${pct >= 100 ? 'bg-emerald-500' : 'bg-[#4997D0]'}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
            {locked ? (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-2.5">
                <Lock size={16} className="text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-emerald-800">Metas finalizadas e bloqueadas</p>
                  <p className="text-xs text-emerald-600">Não é possível realizar novos ajustes.</p>
                </div>
                <CheckCircle2 size={20} className="text-emerald-500 ml-2 shrink-0" />
              </div>
            ) : (
              <div className="flex gap-3">
                <button className="rounded-xl border border-slate-300 px-6 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100">
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="rounded-xl bg-[#4997D0] px-8 py-2.5 text-sm font-bold text-white hover:brightness-110"
                >
                  Salvar e Finalizar
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  )
}
