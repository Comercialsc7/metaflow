import { AlertTriangle, Lock, CheckCircle2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import ExcelGrid from '../components/ExcelGrid'
import { Divider } from '../components/divider'
import { redistribuirMetasParaVendedores } from '../services/distributionService'

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

const seedRows = []

function AlertModal({ open, onClose, diff }) {
  if (!open) return null
  const falta = diff < 0
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-100">
            <AlertTriangle size={20} className="text-rose-600" />
          </span>
          <div className="flex-1">
            <h2 className="text-base font-bold text-slate-900">Distribuicao incompleta</h2>
            <p className="mt-1 text-sm text-slate-600">
              A soma das metas ajustadas nao corresponde a meta total da equipe.{' '}
              {falta ? (
                <>
                  Faltam <span className="font-bold text-rose-600">{fmtBRL(Math.abs(diff))}</span> para atingir 100%.
                </>
              ) : (
                <>
                  Ha um excedente de <span className="font-bold text-rose-600">{fmtBRL(diff)}</span> acima da meta.
                </>
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

export default function ManagerAdjustPage() {
  const { records = [], equipes = [], selectedPeriod, setDistribuicao, distribuicao = [], fornecedorVendedorStats = {}, vendedores = [] } = useOutletContext()
  const navigate = useNavigate()
  const monthRef = `${selectedPeriod.year}-${String(selectedPeriod.month + 1).padStart(2, '0')}`
  const lockStorageKey = `metaflow:manager-lock:${monthRef}`

  // Mapear dados de vendedor (distribuicao) para rows agregados por equipe
  const initialRows = useMemo(() => {
    if (Array.isArray(distribuicao) && distribuicao.length > 0) {
      const distribuicaoDoMes = distribuicao.filter((d) => d.month === monthRef)
      if (distribuicaoDoMes.length > 0) {
        // Agregar vendedores por (fornecedor, equipe)
        const mapa = {}
        distribuicaoDoMes.forEach((row) => {
          const chave = `${row.supplier}#${row.team}`
          if (!mapa[chave]) {
            mapa[chave] = {
              month: row.month,
              supplier: row.supplier,
              team: row.team,
              history: 0,
              average: 0,
              initial: 0,
              adjusted: 0,
            }
          }
          // Soma historico/media e metas de cada vendedor → total da equipe
          mapa[chave].history += row.history || 0
          mapa[chave].average += row.average || 0
          // 'initial' é a meta distribuída pela API — imutável
          mapa[chave].initial += row.suggested || 0
          // 'adjusted' começa igual ao initial mas pode ser editado pelo gerente
          mapa[chave].adjusted += row.suggested || 0
        })
        const rows = Object.values(mapa)
        if (rows.length > 0) return rows
      }
    }

    // Fallback: gerar a partir de records
    const recordsOfMonth = (records || []).filter((record) => record.month === monthRef)
    if (recordsOfMonth.length === 0) return seedRows

    const teamsArray = equipes.length > 0 ? equipes : [{ id: 1, nome: 'Sem Equipe' }]
    const expanded = []
    recordsOfMonth.forEach((record) => {
      const initialPerTeam = record.initialTarget / teamsArray.length
      teamsArray.forEach((team) => {
        expanded.push({
          month: record.month || monthRef,
          supplier: record.supplierName,
          team: team.nome,
          history: record.historico / teamsArray.length,
          average: record.media / teamsArray.length,
          initial: initialPerTeam,
          adjusted: initialPerTeam,
        })
      })
    })
    return expanded.length > 0 ? expanded : seedRows
  }, [distribuicao, records, equipes, monthRef])

  const [rows, setRows] = useState(initialRows)
  const [visibleRows, setVisibleRows] = useState(initialRows)
  const [alertOpen, setAlertOpen] = useState(false)
  const [locked, setLocked] = useState(() => localStorage.getItem(lockStorageKey) === 'true')

  useEffect(() => {
    setRows(initialRows)
    setVisibleRows(initialRows)
  }, [initialRows])

  useEffect(() => {
    setLocked(localStorage.getItem(lockStorageKey) === 'true')
  }, [lockStorageKey])

  const groupedBySupplier = useMemo(() => {
    const supplierMap = new Map()
    rows.forEach((row) => {
      if (!supplierMap.has(row.supplier)) {
        supplierMap.set(row.supplier, { key: row.supplier, history: 0, average: 0, initial: 0, adjusted: 0 })
      }
      const entry = supplierMap.get(row.supplier)
      entry.history += row.history ?? 0
      entry.average += row.average ?? 0
      entry.initial += row.initial ?? 0
      entry.adjusted += row.adjusted ?? 0
    })
    const data = Array.from(supplierMap.values())
    const totals = data.reduce(
      (sum, r) => ({ key: 'TOTAL', history: sum.history + r.history, average: sum.average + r.average, initial: sum.initial + r.initial, adjusted: sum.adjusted + r.adjusted, isTotal: true }),
      { key: 'TOTAL', history: 0, average: 0, initial: 0, adjusted: 0, isTotal: true },
    )
    return [...data, totals]
  }, [rows])

  const groupedByTeam = useMemo(() => {
    const teamMap = new Map()
    rows.forEach((row) => {
      if (!teamMap.has(row.team)) {
        teamMap.set(row.team, { key: row.team, history: 0, average: 0, initial: 0, adjusted: 0 })
      }
      const entry = teamMap.get(row.team)
      entry.history += row.history ?? 0
      entry.average += row.average ?? 0
      entry.initial += row.initial ?? 0
      entry.adjusted += row.adjusted ?? 0
    })
    const data = Array.from(teamMap.values())
    const totals = data.reduce(
      (sum, r) => ({ key: 'TOTAL', history: sum.history + r.history, average: sum.average + r.average, initial: sum.initial + r.initial, adjusted: sum.adjusted + r.adjusted, isTotal: true }),
      { key: 'TOTAL', history: 0, average: 0, initial: 0, adjusted: 0, isTotal: true },
    )
    return [...data, totals]
  }, [rows])

  const supplierSummaryColumns = useMemo(
    () => [
      {
        headerName: 'Fornecedor',
        field: 'key',
        minWidth: 180,
        pinned: 'left',
        filter: 'agTextColumnFilter',
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
        headerName: 'Meta Inicial',
        field: 'initial',
        minWidth: 150,
        cellStyle: { backgroundColor: '#E5F0FF' },
        valueFormatter: (p) => fmtBRL(p.value),
        cellClass: (params) => params.data?.isTotal ? 'ag-cell-total' : '',
      },
      {
        headerName: 'Meta Ajustada',
        field: 'adjusted',
        minWidth: 160,
        cellClass: (params) => params.data?.isTotal ? 'ag-cell-total font-bold' : 'font-bold',
        valueFormatter: (p) => fmtBRL(p.value),
      },
      {
        headerName: 'Variacao',
        field: 'variation',
        minWidth: 110,
        cellRenderer: renderVariationCell,
        cellClass: (params) => params.data?.isTotal ? 'ag-cell-total' : '',
      },
    ],
    [],
  )

  const teamSummaryColumns = useMemo(
    () => [
      {
        headerName: 'Equipe',
        field: 'key',
        minWidth: 180,
        pinned: 'left',
        filter: 'agTextColumnFilter',
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
        headerName: 'Meta Inicial',
        field: 'initial',
        minWidth: 150,
        cellStyle: { backgroundColor: '#E5F0FF' },
        valueFormatter: (p) => fmtBRL(p.value),
        cellClass: (params) => params.data?.isTotal ? 'ag-cell-total' : '',
      },
      {
        headerName: 'Meta Ajustada',
        field: 'adjusted',
        minWidth: 160,
        cellClass: (params) => params.data?.isTotal ? 'ag-cell-total font-bold' : 'font-bold',
        valueFormatter: (p) => fmtBRL(p.value),
      },
      {
        headerName: 'Variacao',
        field: 'variation',
        minWidth: 110,
        cellRenderer: renderVariationCell,
        cellClass: (params) => params.data?.isTotal ? 'ag-cell-total' : '',
      },
    ],
    [],
  )

  const totalTarget = useMemo(() => visibleRows.reduce((sum, row) => sum + (row.initial ?? 0), 0), [visibleRows])
  const distributed = useMemo(() => visibleRows.reduce((sum, row) => sum + (row.adjusted ?? 0), 0), [visibleRows])
  const totalHistory = useMemo(() => visibleRows.reduce((sum, row) => sum + (row.history ?? 0), 0), [visibleRows])
  const totalAverage = useMemo(() => visibleRows.reduce((sum, row) => sum + (row.average ?? 0), 0), [visibleRows])
  const diff = distributed - totalTarget
  const pct = totalTarget > 0 ? Math.min(100, Math.round((distributed / totalTarget) * 100)) : 0
  const overallDiff = useMemo(
    () => rows.reduce((sum, row) => sum + (row.adjusted ?? 0) - (row.initial ?? 0), 0),
    [rows],
  )

  function syncVisibleRows(event) {
    const nextVisibleRows = []
    event.api.forEachNodeAfterFilterAndSort((node) => {
      if (node.data) nextVisibleRows.push(node.data)
    })
    setVisibleRows(nextVisibleRows)
  }

  function onCellValueChanged(e) {
    if (locked) return
    if (e.column.getColId() !== 'adjusted') return

    const applyValue = (val) => {
      setRows((prev) =>
        prev.map((r) =>
          r.supplier === e.data.supplier && r.team === e.data.team
            // Nunca sobrescreve 'initial' — apenas 'adjusted'
            ? { ...r, adjusted: val }
            : r,
        ),
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

  function handleConfirm() {
    if (Math.abs(overallDiff) > 0.01) {
      setAlertOpen(true)
      return
    }

    localStorage.setItem(lockStorageKey, 'true')
    setLocked(true)

    // Chama redistribuição de metas para vendedores usando stats individuais
    redistribuirMetasParaVendedores(rows, vendedores, fornecedorVendedorStats).then((result) => {
      if (result.sucesso) {
        // Transforma resultado da redistribuição para formato de exibição
        // resultado é { FORNECEDOR: [vendedores com meta_final] }
        // Queremos: [ { month, supplier, team, seller, history, average, suggested, adjusted } ]
        
        const distribuicaoFormatada = []
        Object.entries(result.distribuicao || {}).forEach(([fornecedor, entidades]) => {
          entidades.forEach((entidade) => {
            distribuicaoFormatada.push({
              month: monthRef,
              supplier: fornecedor,
              team: entidade.equipe,
              sellerCode: entidade.sellerCode || entidade.codigo || '',
              seller: entidade.seller || entidade.vendedor || '',
              area: entidade.area || entidade.seller || entidade.vendedor || '',
              history: entidade.historico || 0,
              average: entidade.media || 0,
              suggested: entidade.meta_final || 0,
              adjusted: entidade.meta_final || 0,
            })
          })
        })

        // Armazena no contexto
        setDistribuicao(distribuicaoFormatada)
        
        // Navega para próxima página (Supervisor)
        navigate('/supervisor')
      } else {
        alert(`Erro ao redistribuir metas: ${result.erro}`)
        setLocked(false)
        localStorage.removeItem(lockStorageKey)
      }
    })
  }

  const columnDefs = useMemo(
    () => [
      {
        headerName: 'Fornecedor',
        field: 'supplier',
        minWidth: 180,
        pinned: 'left',
        filter: 'agTextColumnFilter',
      },
      {
        headerName: 'Equipe',
        field: 'team',
        minWidth: 150,
        filter: 'agTextColumnFilter',
      },
      { headerName: 'Historico', field: 'history', minWidth: 140, valueFormatter: (p) => fmtBRL(p.value) },
      { headerName: 'Media', field: 'average', minWidth: 140, valueFormatter: (p) => fmtBRL(p.value) },
      {
        headerName: 'Meta Inicial',
        field: 'initial',
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
        valueGetter: (p) => (p.data?.adjusted ?? 0) - (p.data?.initial ?? 0),
        cellRenderer: (p) => {
          const diff = (p.data?.adjusted ?? 0) - (p.data?.initial ?? 0)
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
        field: 'variation',
        minWidth: 110,
        cellRenderer: renderVariationCell,
      },
    ],
    [locked],
  )

  return (
    <>
      <AlertModal open={alertOpen} onClose={() => setAlertOpen(false)} diff={overallDiff} />

      <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Ajuste de Metas entre as Equipes</h2>
            <p className="mt-2 text-slate-500">Distribua a meta total entre as equipes da gerencia.</p>
            <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Resumo por Fornecedor</p>
            <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
              <ExcelGrid rowData={groupedBySupplier} columnDefs={supplierSummaryColumns} height={240} />
            </div>
          </div>

          <Divider />

          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Resumo Geral por Equipe</p>
            <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
              <ExcelGrid rowData={groupedByTeam} columnDefs={teamSummaryColumns} height={240} />
            </div>
          </div>
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
                {fmtBRL(distributed)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <ExcelGrid
          rowData={rows}
          columnDefs={columnDefs}
          height={320}
          onCellValueChanged={onCellValueChanged}
          onModelUpdated={syncVisibleRows}
        />

        <div className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div className="w-full max-w-md">
            <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase text-slate-500">
              <span>Meta Distribuida</span>
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
                <p className="text-xs text-emerald-600">Nao e possivel realizar novos ajustes.</p>
              </div>
              <CheckCircle2 size={20} className="text-emerald-500 ml-2 shrink-0" />
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={handleConfirm}
                className="rounded-xl bg-[#4997D0] px-8 py-2.5 text-sm font-bold text-white hover:brightness-110"
              >
                Confirmar Metas da Equipe
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
    </>
  )
}
