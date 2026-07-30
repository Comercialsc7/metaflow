import { CheckCircle2, Lock, Target, Info } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import ExcelGrid from '../../components/ExcelGrid'
import { Divider } from '../../components/divider'
import { buildPositivacaoRows } from '../../data/positivacaoMock'

const fmtInt = (v) => {
  if (v == null || (typeof v === 'number' && Number.isNaN(v))) return '—'
  return Number(v).toLocaleString('pt-BR')
}

const fmtPct = (v) => {
  if (v == null || !Number.isFinite(v)) return '—'
  return `${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}

function calcCobertura(metaAtual, clientesAtivos) {
  const clientes = Number(clientesAtivos)
  const meta = Number(metaAtual)
  if (!clientes || !Number.isFinite(clientes) || !Number.isFinite(meta)) return null
  return (meta / clientes) * 100
}

function renderCoberturaCell(params) {
  const v = params.value
  if (v == null || !Number.isFinite(v)) {
    return <span className="font-semibold text-slate-400">—</span>
  }
  const cls = v < 70 ? 'text-rose-600' : 'text-emerald-600'
  return <span className={`font-semibold text-sm ${cls}`}>{fmtPct(v)}</span>
}

function parseIntSafe(raw) {
  if (raw === '' || raw == null) return null
  const n = parseInt(String(raw).replace(/\D/g, ''), 10)
  return Number.isFinite(n) ? n : null
}

function getVariationLabel(sugestao, metaAtual) {
  if (sugestao == null || sugestao === '') return '—'
  if (!metaAtual) return '—'
  const delta = ((Number(sugestao) - Number(metaAtual)) / Number(metaAtual)) * 100
  const rounded = Math.round(delta)
  if (rounded === 0) return '—'
  return `${rounded > 0 ? '^' : 'v'}${Math.abs(rounded)}%`
}

function renderVariationCell(params) {
  const trend = getVariationLabel(params.data?.sugestao, params.data?.metaAtual)
  const cls = trend.startsWith('^')
    ? 'text-emerald-600'
    : trend.startsWith('v')
      ? 'text-rose-600'
      : 'text-slate-400'
  return <span className={`${cls} font-bold text-sm`}>{trend}</span>
}

function MetaEfetivaCell({ data }) {
  const efetiva = data?.sugestao != null ? data.sugestao : data?.metaAtual
  const manteve = data?.sugestao == null
  return (
    <span className={`font-bold text-sm ${manteve ? 'text-slate-700' : 'text-[#4997D0]'}`}>
      {fmtInt(efetiva)}
      {manteve ? (
        <span className="ml-1 text-[10px] font-semibold uppercase text-slate-400">meta</span>
      ) : (
        <span className="ml-1 text-[10px] font-semibold uppercase text-[#4997D0]">sugestão</span>
      )}
    </span>
  )
}

export default function PositivacaoPage() {
  const {
    selectedPeriod,
    setPositivacaoRows,
    currentUser,
  } = useOutletContext()

  const monthRef = `${selectedPeriod.year}-${String(selectedPeriod.month + 1).padStart(2, '0')}`
  const lockStorageKey = `metaflow:positivacao-lock:${monthRef}`
  const dataStorageKey = `metaflow:positivacao-data:${monthRef}`

  const [locked, setLocked] = useState(() => localStorage.getItem(lockStorageKey) === 'true')
  const [rows, setRows] = useState(() => {
    try {
      const raw = localStorage.getItem(dataStorageKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {
      /* ignore */
    }
    return buildPositivacaoRows(monthRef)
  })

  useEffect(() => {
    setLocked(localStorage.getItem(lockStorageKey) === 'true')
    try {
      const raw = localStorage.getItem(dataStorageKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRows(parsed)
          return
        }
      }
    } catch {
      /* ignore */
    }
    const seed = buildPositivacaoRows(monthRef)
    setRows(seed)
  }, [monthRef, lockStorageKey, dataStorageKey])

  useEffect(() => {
    if (typeof setPositivacaoRows === 'function') {
      setPositivacaoRows(rows)
    }
  }, [rows, setPositivacaoRows])

  const podeEditar = !locked && ['ADMIN', 'GERENTE', 'SUPERVISOR'].includes(
    String(currentUser?.nivel || '').toUpperCase(),
  )

  const totais = useMemo(() => {
    const clientesAtivos = rows.reduce((s, r) => s + (r.clientesAtivos ?? 0), 0)
    const media4m = rows.reduce((s, r) => s + (r.media4m ?? 0), 0)
    const metaAtual = rows.reduce((s, r) => s + (r.metaAtual ?? 0), 0)
    const comSugestao = rows.filter((r) => r.sugestao != null && r.sugestao !== r.metaAtual)
    const mantidas = rows.length - comSugestao.length
    return {
      clientesAtivos,
      media4m,
      metaAtual,
      sugestoes: comSugestao.length,
      mantidas,
    }
  }, [rows])

  const groupedBySupplier = useMemo(() => {
    const map = new Map()
    rows.forEach((row) => {
      const key = row.supplier
      const cur = map.get(key) || {
        supplier: key,
        clientesAtivos: 0,
        media4m: 0,
        metaAtual: 0,
        sugestaoSoma: 0,
        sugestaoCount: 0,
      }
      cur.clientesAtivos += row.clientesAtivos ?? 0
      cur.media4m += row.media4m ?? 0
      cur.metaAtual += row.metaAtual ?? 0
      if (row.sugestao != null) {
        cur.sugestaoSoma += row.sugestao
        cur.sugestaoCount += 1
      } else {
        cur.sugestaoSoma += row.metaAtual ?? 0
      }
      map.set(key, cur)
    })
    const list = [...map.values()].map((g) => ({
      ...g,
      sugestao: g.sugestaoSoma,
      hasAnySuggestion: g.sugestaoCount > 0,
    }))
    list.push({
      supplier: 'TOTAL',
      clientesAtivos: totais.clientesAtivos,
      media4m: totais.media4m,
      metaAtual: totais.metaAtual,
      sugestao: rows.reduce((s, r) => s + (r.sugestao ?? r.metaAtual ?? 0), 0),
      isTotal: true,
    })
    return list
  }, [rows, totais])

  const groupedByTeam = useMemo(() => {
    const map = new Map()
    rows.forEach((row) => {
      const key = row.team || 'Sem equipe'
      const cur = map.get(key) || {
        team: key,
        clientesAtivos: 0,
        media4m: 0,
        metaAtual: 0,
        sugestaoSoma: 0,
      }
      cur.clientesAtivos += row.clientesAtivos ?? 0
      cur.media4m += row.media4m ?? 0
      cur.metaAtual += row.metaAtual ?? 0
      cur.sugestaoSoma += row.sugestao ?? row.metaAtual ?? 0
      map.set(key, cur)
    })
    const list = [...map.values()]
      .map((g) => ({
        team: g.team,
        clientesAtivos: g.clientesAtivos,
        media4m: g.media4m,
        metaAtual: g.metaAtual,
        sugestao: g.sugestaoSoma,
      }))
      .sort((a, b) => String(a.team).localeCompare(String(b.team), 'pt-BR'))

    list.push({
      team: 'TOTAL',
      clientesAtivos: totais.clientesAtivos,
      media4m: totais.media4m,
      metaAtual: totais.metaAtual,
      sugestao: rows.reduce((s, r) => s + (r.sugestao ?? r.metaAtual ?? 0), 0),
      isTotal: true,
    })
    return list
  }, [rows, totais])

  function onCellValueChanged(e) {
    if (!podeEditar) return
    if (e.column.getColId() !== 'sugestao') return
    const rowId = e.data?.rowId
    if (!rowId) return

    let next = e.newValue
    if (typeof next !== 'number') {
      const parsed = parseIntSafe(next)
      next = parsed
    }

    setRows((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, sugestao: next } : r)),
    )
  }

  function handleClearSuggestions() {
    if (!podeEditar) return
    setRows((prev) => prev.map((r) => ({ ...r, sugestao: null })))
  }

  function handleValidate() {
    localStorage.setItem(dataStorageKey, JSON.stringify(rows))
    localStorage.setItem(lockStorageKey, 'true')
    setLocked(true)
    if (typeof setPositivacaoRows === 'function') {
      setPositivacaoRows(rows)
    }
    alert('Positivação validada para o período. Metas sem sugestão permanecem iguais.')
  }

  function handleUnlock() {
    if (String(currentUser?.nivel || '').toUpperCase() !== 'ADMIN') {
      alert('Apenas ADMIN pode reabrir o período.')
      return
    }
    localStorage.removeItem(lockStorageKey)
    setLocked(false)
  }

  const supplierSummaryColumns = useMemo(
    () => [
      {
        headerName: 'Fornecedor',
        field: 'supplier',
        minWidth: 180,
        cellClass: (p) => (p.data?.isTotal ? 'ag-cell-total' : ''),
      },
      {
        headerName: 'Clientes ativos',
        field: 'clientesAtivos',
        minWidth: 140,
        valueFormatter: (p) => fmtInt(p.value),
        cellClass: (p) => (p.data?.isTotal ? 'ag-cell-total' : ''),
      },
      {
        headerName: 'Média 4m',
        field: 'media4m',
        minWidth: 120,
        valueFormatter: (p) => fmtInt(p.value),
        cellClass: (p) => (p.data?.isTotal ? 'ag-cell-total' : ''),
      },
      {
        headerName: 'Meta atual',
        field: 'metaAtual',
        minWidth: 120,
        valueFormatter: (p) => fmtInt(p.value),
        cellClass: (p) => (p.data?.isTotal ? 'ag-cell-total' : ''),
      },
      {
        headerName: 'Efetiva',
        field: 'sugestao',
        minWidth: 140,
        valueFormatter: (p) => fmtInt(p.value),
        cellStyle: { backgroundColor: '#E5F0FF' },
        cellClass: (p) => (p.data?.isTotal ? 'ag-cell-total' : ''),
      },
    ],
    [],
  )

  const teamSummaryColumns = useMemo(
    () => [
      {
        headerName: 'Equipe',
        field: 'team',
        minWidth: 180,
        cellClass: (p) => (p.data?.isTotal ? 'ag-cell-total' : ''),
      },
      {
        headerName: 'Clientes ativos',
        field: 'clientesAtivos',
        minWidth: 140,
        valueFormatter: (p) => fmtInt(p.value),
        cellClass: (p) => (p.data?.isTotal ? 'ag-cell-total' : ''),
      },
      {
        headerName: 'Média 4m',
        field: 'media4m',
        minWidth: 120,
        valueFormatter: (p) => fmtInt(p.value),
        cellClass: (p) => (p.data?.isTotal ? 'ag-cell-total' : ''),
      },
      {
        headerName: 'Meta atual',
        field: 'metaAtual',
        minWidth: 120,
        valueFormatter: (p) => fmtInt(p.value),
        cellClass: (p) => (p.data?.isTotal ? 'ag-cell-total' : ''),
      },
      {
        headerName: 'Efetiva',
        field: 'sugestao',
        minWidth: 140,
        valueFormatter: (p) => fmtInt(p.value),
        cellStyle: { backgroundColor: '#E5F0FF' },
        cellClass: (p) => (p.data?.isTotal ? 'ag-cell-total' : ''),
      },
    ],
    [],
  )

  const columnDefs = useMemo(
    () => [
      {
        headerName: 'Fornecedor',
        field: 'supplier',
        minWidth: 150,
        pinned: 'left',
        filter: 'agTextColumnFilter',
      },
      {
        headerName: 'Equipe',
        field: 'team',
        minWidth: 140,
        filter: 'agTextColumnFilter',
      },
      {
        headerName: 'Vendedor',
        field: 'seller',
        minWidth: 150,
        filter: 'agTextColumnFilter',
      },
      {
        headerName: 'Clientes ativos',
        field: 'clientesAtivos',
        minWidth: 140,
        valueFormatter: (p) => fmtInt(p.value),
      },
      {
        headerName: 'Positivação 4m (média)',
        field: 'media4m',
        minWidth: 170,
        valueFormatter: (p) => fmtInt(p.value),
      },
      {
        headerName: 'Meta atual',
        field: 'metaAtual',
        minWidth: 120,
        cellStyle: { backgroundColor: '#f1f5f9' },
        valueFormatter: (p) => fmtInt(p.value),
      },
      {
        headerName: '% Cobertura',
        minWidth: 130,
        valueGetter: (p) => calcCobertura(p.data?.metaAtual, p.data?.clientesAtivos),
        cellRenderer: (params) => renderCoberturaCell(params),
      },
      {
        headerName: locked ? 'Sugestão 🔒' : 'Sugestão',
        field: 'sugestao',
        minWidth: 130,
        editable: podeEditar,
        cellStyle: podeEditar
          ? { backgroundColor: '#CCE0FF' }
          : { background: '#f8fafc', cursor: 'not-allowed' },
        valueFormatter: (p) => (p.value == null ? '' : fmtInt(p.value)),
        cellClass: 'font-bold',
      },
      {
        headerName: 'Meta efetiva',
        minWidth: 140,
        cellRenderer: (p) => <MetaEfetivaCell data={p.data} />,
      },
      {
        headerName: 'Variação',
        minWidth: 110,
        cellRenderer: (params) => renderVariationCell(params),
      },
    ],
    [locked, podeEditar],
  )

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[#4997D0]">
            <Target size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">Positivação</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900">Metas de positivação</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Meta atual já existe e costuma se manter. Sugestão é opcional (gerente/supervisor).
            Sem sugestão, a meta segue igual.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 self-start rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
          <Info size={13} />
          Dados de simulação (mock)
        </span>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Clientes ativos</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{fmtInt(totais.clientesAtivos)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Meta atual (soma)</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{fmtInt(totais.metaAtual)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Com sugestão</p>
          <p className="mt-1 text-2xl font-bold text-[#4997D0]">{fmtInt(totais.sugestoes)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Mantidas (sem alteração)</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{fmtInt(totais.mantidas)}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-bold text-slate-800">Resumo por fornecedor</h3>
        </div>
        <ExcelGrid
          rowData={groupedBySupplier}
          columnDefs={supplierSummaryColumns}
          height={220}
        />
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-bold text-slate-800">Resumo por equipe</h3>
        </div>
        <ExcelGrid
          rowData={groupedByTeam}
          columnDefs={teamSummaryColumns}
          height={220}
        />
      </section>

      <Divider />

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-bold text-slate-800">Detalhe fornecedor · equipe · vendedor</h3>
          <p className="text-xs text-slate-500">
            Edite só a coluna Sugestão quando houver proposta. Vazio = mantém meta atual.
          </p>
        </div>
        <ExcelGrid
          rowData={rows}
          columnDefs={columnDefs}
          height={400}
          onCellValueChanged={onCellValueChanged}
        />

        <div className="flex flex-col gap-4 bg-slate-50 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-slate-500 max-w-md">
            Validação trava o período. Alteração costuma ser pontual (ex.: meses específicos);
            vários supervisores mantêm a mesma meta por meses.
          </p>

          {locked ? (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-2.5">
                <Lock size={16} className="shrink-0 text-emerald-600" />
                <div>
                  <p className="text-sm font-bold text-emerald-800">Período validado</p>
                  <p className="text-xs text-emerald-600">Sugestões bloqueadas neste mês.</p>
                </div>
                <CheckCircle2 size={20} className="ml-1 shrink-0 text-emerald-500" />
              </div>
              {String(currentUser?.nivel || '').toUpperCase() === 'ADMIN' && (
                <button
                  type="button"
                  onClick={handleUnlock}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
                >
                  Reabrir (ADMIN)
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleClearSuggestions}
                className="rounded-xl border border-slate-300 px-6 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100"
              >
                Limpar sugestões
              </button>
              <button
                type="button"
                onClick={handleValidate}
                className="rounded-xl bg-[#4997D0] px-8 py-2.5 text-sm font-bold text-white hover:brightness-110"
              >
                Validar período
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
