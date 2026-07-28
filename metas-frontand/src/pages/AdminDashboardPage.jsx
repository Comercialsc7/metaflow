import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  Banknote,
  TrendingUp,
  GitBranch,
  PieChart,
  ArrowRight,
  Search,
  ChevronDown,
  ChevronRight,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  CalendarCheck,
  Calendar,
} from 'lucide-react'
import { MONTHS } from '../App'
import ExcelGrid from '../components/ExcelGrid'


const suppliers = []

const teams = []

const farolUsers = []

const statusConfig = {
  concluido:    { label: 'Concluído',     dot: 'bg-emerald-500', Icon: CheckCircle2,  iconClass: 'text-emerald-500' },
  pendente:     { label: 'Pendente',      dot: 'bg-amber-400',   Icon: Clock,          iconClass: 'text-amber-400' },
  atrasado:     { label: 'Atrasado',      dot: 'bg-rose-500',    Icon: AlertTriangle,  iconClass: 'text-rose-500' },
  nao_iniciado: { label: 'Não Iniciado',  dot: 'bg-slate-400',   Icon: XCircle,        iconClass: 'text-slate-400' },
}

function parseMoney(value) {
  if (typeof value === 'number') return value
  if (value == null) return 0
  const text = String(value)
    .replace(/R\$\s?/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim()

  if (!text) return 0
  if (/k$/i.test(text)) return (parseFloat(text.replace(/k$/i, '')) || 0) * 1000
  if (/m$/i.test(text)) return (parseFloat(text.replace(/m$/i, '')) || 0) * 1000000
  return parseFloat(text) || 0
}

function getDiffPct(distributed, target) {
  if (!target) return null
  return ((distributed - target) / target) * 100
}

function fmtBRL(value) {
  const n = Number(value ?? 0)
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Drawer lateral ──────────────────────────────────────────────────────────
function FarolDrawer({ open, onClose }) {
  const total     = farolUsers.length
  const concluidos = farolUsers.filter((u) => u.status === 'concluido').length
  const progressPct = total > 0 ? Math.round((concluidos / total) * 100) : 0

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Painel lateral */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-white shadow-2xl flex flex-col
          transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header do drawer */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">Farol de Progresso</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {concluidos} de {total} concluídos
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Barra de progresso geral */}
        <div className="px-5 py-3 border-b border-slate-100">
          <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1.5">
            <span>Progresso geral</span>
            <span>{progressPct}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#4997D0] rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Lista de usuários */}
        <ul className="flex-1 overflow-y-auto divide-y divide-slate-50 px-2 py-2">
          {farolUsers.map((user) => {
            const cfg = statusConfig[user.status]
            return (
              <li
                key={user.id}
                className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-50 transition-colors"
              >
                {/* Bolinha de status */}
                <span
                  className={`size-2.5 rounded-full shrink-0 ${cfg.dot} ${
                    user.status === 'concluido' ? '' : 'opacity-80'
                  }`}
                />

                {/* Iniciais */}
                <div className="size-8 rounded-full bg-[#4997D0]/10 border border-[#4997D0]/20 flex items-center justify-center text-[#4997D0] font-bold text-xs shrink-0">
                  {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </div>

                {/* Nome + data */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
                  {user.completedAt ? (
                    <div className="flex items-center gap-1 mt-0.5 text-emerald-600">
                      <CalendarCheck size={11} className="shrink-0" />
                      <span className="text-xs">{formatDate(user.completedAt)}</span>
                    </div>
                  ) : (
                    <p className={`text-xs mt-0.5 ${cfg.iconClass}`}>{cfg.label}</p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Fechar
          </button>
        </div>
      </aside>
    </>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [expandedSuppliers, setExpandedSuppliers] = useState(() => new Set())
  const [expandedTeams, setExpandedTeams] = useState(() => new Set())
  const { selectedPeriod, distribuicao = [], ajustes = [], mediaEncontrada = 0, historicoEncontrado = 0 } = useOutletContext()
  const monthRef = `${selectedPeriod.year}-${String(selectedPeriod.month + 1).padStart(2, '0')}`

  const summarySource = useMemo(() => {
    const ajustesDoMes = ajustes.filter((row) => row.month === monthRef)
    if (ajustesDoMes.length > 0) {
      return ajustesDoMes.map((row) => ({
        supplier: row.supplier || 'Sem fornecedor',
        team: row.team || 'Sem equipe',
        seller: row.seller || 'Sem vendedor',
        history: Number(row.history ?? 0),
        average: Number(row.average ?? 0),
        target: Number(row.suggested ?? row.adjusted ?? 0),
        distributed: Number(row.adjusted ?? 0),
      }))
    }

    const distribuicaoDoMes = distribuicao.filter((row) => row.month === monthRef)
    if (distribuicaoDoMes.length > 0) {
      return distribuicaoDoMes.map((row) => ({
        supplier: row.supplier || 'Sem fornecedor',
        team: row.team || 'Sem equipe',
        seller: null,
        history: Number(row.history ?? 0),
        average: Number(row.average ?? 0),
        target: Number(row.initial ?? row.adjusted ?? 0),
        distributed: Number(row.adjusted ?? 0),
      }))
    }

    return suppliers.map((row) => ({
      supplier: row.name || 'Sem fornecedor',
      team: row.segment || 'Sem equipe',
      seller: null,
      history: parseMoney(row.history),
      average: parseMoney(row.history),
      target: parseMoney(row.target),
      distributed: parseMoney(row.distributed),
    }))
  }, [ajustes, distribuicao, monthRef])

  const filteredSummarySource = useMemo(() => {
    const term = searchText.trim().toLowerCase()
    if (!term) return summarySource
    return summarySource.filter(
      (row) =>
        row.supplier.toLowerCase().includes(term) ||
        row.team.toLowerCase().includes(term) ||
        (row.seller || '').toLowerCase().includes(term),
    )
  }, [summarySource, searchText])

  const groupedSummary = useMemo(() => {
    const supplierMap = new Map()

    filteredSummarySource.forEach((row) => {
      const supplierGroup = supplierMap.get(row.supplier) ?? {
        supplier: row.supplier,
        history: 0,
        average: 0,
        target: 0,
        distributed: 0,
        teams: new Map(),
      }

      const teamGroup = supplierGroup.teams.get(row.team) ?? {
        team: row.team,
        history: 0,
        average: 0,
        target: 0,
        distributed: 0,
        sellers: new Map(),
      }

      teamGroup.history += row.history
      teamGroup.average += row.average
      teamGroup.target += row.target
      teamGroup.distributed += row.distributed

      if (row.seller) {
        const sellerGroup = teamGroup.sellers.get(row.seller) ?? {
          seller: row.seller,
          history: 0,
          average: 0,
          target: 0,
          distributed: 0,
        }

        sellerGroup.history += row.history
        sellerGroup.average += row.average
        sellerGroup.target += row.target
        sellerGroup.distributed += row.distributed

        teamGroup.sellers.set(row.seller, sellerGroup)
      }

      supplierGroup.history += row.history
      supplierGroup.average += row.average
      supplierGroup.target += row.target
      supplierGroup.distributed += row.distributed

      supplierGroup.teams.set(row.team, teamGroup)
      supplierMap.set(row.supplier, supplierGroup)
    })

    return Array.from(supplierMap.values())
      .sort((a, b) => a.supplier.localeCompare(b.supplier))
      .map((supplier) => ({
        ...supplier,
        teams: Array.from(supplier.teams.values())
          .sort((a, b) => a.team.localeCompare(b.team))
          .map((team) => ({
            ...team,
            sellers: Array.from(team.sellers.values()).sort((a, b) => a.seller.localeCompare(b.seller)),
          })),
      }))
  }, [filteredSummarySource])

  const drillRows = useMemo(() => {
    const rows = []

    groupedSummary.forEach((supplier) => {
      const supplierKey = supplier.supplier
      const isSupplierExpanded = expandedSuppliers.has(supplierKey)

      rows.push({
        id: `supplier-${supplier.supplier}`,
        rowType: 'supplier',
        supplier,
        label: supplier.supplier,
        history: supplier.history,
        average: supplier.average,
        target: supplier.target,
        distributed: supplier.distributed,
      })

      if (isSupplierExpanded) {
        supplier.teams.forEach((team) => {
          const teamKey = `${supplier.supplier}__${team.team}`
          const hasSellers = team.sellers.length > 0
          const isTeamExpanded = expandedTeams.has(teamKey)

          rows.push({
            id: `team-${supplier.supplier}-${team.team}`,
            rowType: 'team',
            supplier,
            team,
            teamKey,
            hasSellers,
            label: team.team,
            history: team.history,
            average: team.average,
            target: team.target,
            distributed: team.distributed,
          })

          if (hasSellers && isTeamExpanded) {
            team.sellers.forEach((seller) => {
              rows.push({
                id: `seller-${supplier.supplier}-${team.team}-${seller.seller}`,
                rowType: 'seller',
                supplier,
                team,
                label: seller.seller,
                history: seller.history,
                average: seller.average,
                target: seller.target,
                distributed: seller.distributed,
              })
            })
          }
        })
      }
    })

    const total = filteredSummarySource.reduce(
      (acc, row) => ({
        history: acc.history + row.history,
        average: acc.average + row.average,
        target: acc.target + row.target,
        distributed: acc.distributed + row.distributed,
      }),
      { history: 0, average: 0, target: 0, distributed: 0 },
    )

    rows.push({
      id: 'total-geral',
      rowType: 'total',
      label: 'TOTAL GERAL',
      history: total.history,
      average: total.average,
      target: total.target,
      distributed: total.distributed,
    })

    return rows
  }, [filteredSummarySource, groupedSummary, expandedSuppliers, expandedTeams])

  function toggleSupplier(supplierName) {
    setExpandedSuppliers((prev) => {
      const next = new Set(prev)
      if (next.has(supplierName)) next.delete(supplierName)
      else next.add(supplierName)
      return next
    })
  }

  function toggleTeam(teamKey) {
    setExpandedTeams((prev) => {
      const next = new Set(prev)
      if (next.has(teamKey)) next.delete(teamKey)
      else next.add(teamKey)
      return next
    })
  }

  const supplierColumns = useMemo(
    () => [
      {
        headerName: 'Resumo',
        field: 'label',
        pinned: 'left',
        minWidth: 320,
        filter: 'agTextColumnFilter',
        cellRenderer: (params) => (
          <div className="flex h-full items-center">
            {params.data.rowType === 'supplier' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleSupplier(params.data.supplier.supplier)
                }}
                className="mr-2 inline-flex size-6 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                {expandedSuppliers.has(params.data.supplier.supplier) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            )}
            {params.data.rowType === 'team' && (
              <>
                <span className="mr-2 w-8" />
                {params.data.hasSellers ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleTeam(params.data.teamKey)
                    }}
                    className="mr-2 inline-flex size-6 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    {expandedTeams.has(params.data.teamKey) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                ) : (
                  <span className="mr-2 w-6" />
                )}
              </>
            )}
            {params.data.rowType === 'seller' && <span className="mr-2 w-16" />}
            <div className="flex flex-col">
              <span
                className={`text-sm ${
                  params.data.rowType === 'total'
                    ? 'font-extrabold text-slate-900'
                    : params.data.rowType === 'supplier'
                      ? 'font-bold text-slate-900'
                      : params.data.rowType === 'team'
                        ? 'font-semibold text-slate-800'
                        : 'font-medium text-slate-700'
                }`}
              >
                {params.value}
              </span>
              {params.data.rowType === 'supplier' && (
                <span className="text-[11px] uppercase tracking-wide text-slate-400">Fornecedor</span>
              )}
              {params.data.rowType === 'team' && (
                <span className="text-[11px] uppercase tracking-wide text-slate-400">Equipe</span>
              )}
              {params.data.rowType === 'seller' && (
                <span className="text-[11px] uppercase tracking-wide text-slate-400">Vendedor</span>
              )}
              {params.data.rowType === 'total' && (
                <span className="text-[11px] uppercase tracking-wide text-slate-500">Resumo consolidado</span>
              )}
            </div>
          </div>
        ),
      },
      {
        headerName: 'Historico',
        field: 'history',
        minWidth: 140,
        valueFormatter: (p) => p.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      },
      {
        headerName: 'Media',
        field: 'average',
        minWidth: 140,
        valueFormatter: (p) => p.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      },
      {
        headerName: 'Meta Total',
        field: 'target',
        minWidth: 150,
        valueFormatter: (p) => p.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      },
      {
        headerName: 'Distribuido',
        field: 'distributed',
        minWidth: 150,
        valueFormatter: (p) => p.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      },
      {
        headerName: 'Dif. %',
        minWidth: 120,
        valueGetter: (params) => getDiffPct(params.data?.distributed ?? 0, params.data?.target ?? 0),
        cellRenderer: (params) => {
          const value = params.value
          if (value == null) return <span className="text-slate-400 font-semibold">-</span>

          const rounded = Math.round(value * 10) / 10
          const cls = rounded > 0 ? 'text-emerald-600' : rounded < 0 ? 'text-rose-600' : 'text-slate-500'
          const signal = rounded > 0 ? '+' : ''

          return <span className={`font-bold ${cls}`}>{`${signal}${rounded.toLocaleString('pt-BR')}%`}</span>
        },
      },
    ],
    [expandedSuppliers, expandedTeams],
  )

  const kpiTotals = useMemo(() => {
    return summarySource.reduce(
      (acc, row) => ({
        history: acc.history + (row.history ?? 0),
        average: acc.average + (row.average ?? 0),
        target: acc.target + (row.target ?? 0),
        distributed: acc.distributed + (row.distributed ?? 0),
      }),
      { history: 0, average: 0, target: 0, distributed: 0 },
    )
  }, [summarySource])

  const progressPct = kpiTotals.target > 0 ? Math.min(100, Math.round((kpiTotals.distributed / kpiTotals.target) * 100)) : 0
  const missingTotal = Math.max(kpiTotals.target - kpiTotals.distributed, 0)

  return (
    <>
      <FarolDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />


      {/* ── Main ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Banner do período selecionado */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Calendar size={15} className="text-[#4997D0]" />
          <span>Exibindo dados de <span className="font-bold text-slate-700">{MONTHS[selectedPeriod.month]} {selectedPeriod.year}</span></span>
        </div>

        {/* KPI Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <div className="bg-white p-7 rounded-xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-medium text-slate-500">Meta Total</p>
              <span className="bg-slate-100 p-2 rounded-lg text-slate-600"><Banknote size={20} /></span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2 leading-tight break-words">{fmtBRL(kpiTotals.target)}</h3>
            <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
              <TrendingUp size={14} /><span>Valor consolidado</span>
            </div>
          </div>

          <div className="bg-white p-7 rounded-xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-medium text-slate-500">Distribuído</p>
              <span className="bg-slate-100 p-2 rounded-lg text-slate-600"><GitBranch size={20} /></span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2 leading-tight break-words">{fmtBRL(kpiTotals.distributed)}</h3>
            <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
              <TrendingUp size={14} /><span>{progressPct}% da meta</span>
            </div>
          </div>

          <div className="bg-white p-7 rounded-xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-medium text-slate-500">Historico Total</p>
              <span className="bg-slate-100 p-2 rounded-lg text-slate-600"><CalendarCheck size={20} /></span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2 leading-tight break-words">{fmtBRL(historicoEncontrado)}</h3>
            <div className="flex items-center gap-1 text-slate-500 text-sm font-medium">
              <span>Acumulado do periodo</span>
            </div>
          </div>

          <div className="bg-white p-7 rounded-xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-medium text-slate-500">Media Total</p>
              <span className="bg-slate-100 p-2 rounded-lg text-slate-600"><Calendar size={20} /></span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2 leading-tight break-words">{fmtBRL(mediaEncontrada)}</h3>
            <div className="flex items-center gap-1 text-slate-500 text-sm font-medium">
              <span>Consolidado da media</span>
            </div>
          </div>
        </section>

        {/* Barra de progresso discreta em largura total */}
        <section className="rounded-xl border border-slate-100 bg-white px-6 py-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="bg-[#4997D0]/10 p-1.5 rounded-md text-[#4997D0]"><PieChart size={16} /></span>
              <span className="font-semibold">Progresso da Distribuição</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-bold text-slate-900">{progressPct}%</span>
              <span className="text-slate-400">Faltam {fmtBRL(missingTotal)}</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#4997D0] h-full rounded-full" style={{ width: `${progressPct}%` }} />
          </div>
        </section>

        {/* Farol de Progresso por Equipe */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">Farol de Progresso por Equipe</h2>
            <button
              onClick={() => setDrawerOpen(true)}
              className="text-[#4997D0] text-sm font-bold flex items-center gap-1 hover:underline"
            >
              Ver relatórios detalhados <ArrowRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {teams.map((team) => (
              <div key={team.name} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`size-3 rounded-full ${team.dotClass}`} />
                  <div>
                    <p className="text-sm font-bold text-slate-900">{team.name}</p>
                    <p className="text-xs text-slate-500 uppercase tracking-tight">{team.status}</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-slate-900">{team.pct}%</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tabela de Distribuição por Fornecedor */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Resumo de Metas (Fornecedores, Equipes e Vendedores)</h2>
              <p className="text-sm text-slate-500">Clique no fornecedor para abrir as equipes e, em seguida, clique na equipe para abrir os vendedores.</p>
            </div>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4997D0] w-full md:w-64"
                placeholder="Buscar fornecedor, equipe ou vendedor..."
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
          </div>

          <ExcelGrid
            rowData={drillRows}
            columnDefs={supplierColumns}
            height={420}
            getRowId={(params) => params.data.id}
            getRowClass={(params) => {
              if (params.data?.rowType === 'total') return 'bg-slate-100'
              if (params.data?.rowType === 'team') return 'bg-slate-50'
              return ''
            }}
          />

         
        </section>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 py-8 mt-8 border-t border-slate-200 text-center">
        <p className="text-slate-500 text-sm">Plataforma de Distribuição MetaFlow © 2026. Todos os direitos reservados.</p>
      </footer>
    </>
  )
}
