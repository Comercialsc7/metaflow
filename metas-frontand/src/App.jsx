import { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom'
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  LogOut,
  Shield,
  LayoutDashboard,
  Users,
  Package,
  UserCog,
  UserRound,
  ClipboardList,
  Target,
} from 'lucide-react'

import LoginPage from './pages/LoginPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import ManagerAdjustPage from './pages/ManagerAdjustPage'
import SupervisorFinalPage from './pages/SupervisorFinalPage'
import CadastrosPage from './pages/CadastrosPage'
import SupplierRegistrationPage from './pages/SupplierRegistrationPage'
import PositivacaoPage from './pages/positivacao/PositivacaoPage'

// ── Meses em português ───────────────────────────────────────────────────────
export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

// ── Abas de navegação ────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: 'Dashboard', path: '/admin', Icon: LayoutDashboard },
  { label: 'Fornecedores', path: '/fornecedores', Icon: Package },
  { label: 'Gerentes', path: '/gerente', Icon: UserCog },
  { label: 'Equipes', path: '/supervisor', Icon: Users },
  { label: 'Positivação', path: '/positivacao', Icon: Target },
  { label: 'Cadastros', path: '/cadastros', Icon: ClipboardList },
]

const ALL_APP_PAGES = NAV_ITEMS.map((item) => item.path)

const DEFAULT_USERS = [
  {
    id: 1,
    appCode: '20250502',
    login: 'ADMIN',
    nome: 'Administrador',
    email: 'admin@metaflow.com',
    nivel: 'ADMIN',
    senha: 'ADMIN',
  },
]

function parseStoredJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function roleLabel(level) {
  if (!level) return 'Usuário'
  const map = {
    ADMIN: 'Administrador',
    GERENTE: 'Gerente',
    SUPERVISOR: 'Supervisor',
    COMERCIAL: 'Comercial',
  }
  return map[level] || level
}

function normalizePermissions(rawPermissions, level) {
  const isAdmin = String(level || '').toUpperCase() === 'ADMIN'
  const defaultPermissions = {
    pages: isAdmin ? ALL_APP_PAGES : ['/admin'],
    allTeams: isAdmin,
    teams: [],
  }

  if (!rawPermissions || typeof rawPermissions !== 'object') {
    return defaultPermissions
  }

  const pages = Array.isArray(rawPermissions.pages) && rawPermissions.pages.length > 0
    ? rawPermissions.pages
    : defaultPermissions.pages

  // ADMIN sempre enxerga páginas novas do NAV (ex.: positivação)
  const pagesFinal = isAdmin
    ? Array.from(new Set([...pages, ...ALL_APP_PAGES]))
    : pages

  const allTeams = typeof rawPermissions.allTeams === 'boolean'
    ? rawPermissions.allTeams
    : defaultPermissions.allTeams

  const teams = Array.isArray(rawPermissions.teams)
    ? rawPermissions.teams.filter((team) => typeof team === 'string' && team.trim() !== '')
    : []

  return {
    pages: pagesFinal,
    allTeams,
    teams,
  }
}

// ── Seletor de Mês/Ano ───────────────────────────────────────────────────────
function MonthYearPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(value.year)
  const ref = useRef(null)

  useEffect(() => {
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  function selectMonth(monthIndex) {
    onChange({ month: monthIndex, year: pickerYear })
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setPickerYear(value.year); setOpen((o) => !o) }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors shadow-sm"
      >
        <Calendar size={15} className="text-[#4997D0]" />
        <span>{MONTHS[value.month]} {value.year}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-4 w-64">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setPickerYear((y) => y - 1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-bold text-slate-900">{pickerYear}</span>
            <button onClick={() => setPickerYear((y) => y + 1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {MONTHS.map((m, i) => {
              const isActive = i === value.month && pickerYear === value.year
              return (
                <button
                  key={m}
                  onClick={() => selectMonth(i)}
                  className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${isActive ? 'bg-[#4997D0] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  {m.slice(0, 3)}
                </button>
              )
            })}
          </div>

          <button
            onClick={() => { const n = new Date(); onChange({ month: n.getMonth(), year: n.getFullYear() }); setOpen(false) }}
            className="mt-3 w-full py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
          >
            Mês atual
          </button>
        </div>
      )}
    </div>
  )
}

// ── Menu do Usuário ──────────────────────────────────────────────────────────
function UserMenu({ currentUser, setCurrentUser, usuarios, setUsuarios }) {
  const [open, setOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [form, setForm] = useState({
    nome: '',
    novaSenha: '',
    confirmarSenha: '',
  })
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  useEffect(() => {
    if (!profileOpen) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [profileOpen])

  const displayName = currentUser?.nome || currentUser?.login || 'Usuário'
  const role = roleLabel(currentUser?.nivel)
  const initials = displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  const handleLogout = () => {
    setOpen(false)
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('currentUser')
    navigate('/login')
  }

  const handleOpenProfile = () => {
    setOpen(false)
    setProfileOpen(true)
    setForm({
      nome: currentUser?.nome || '',
      novaSenha: '',
      confirmarSenha: '',
    })
  }

  const handleSaveProfile = () => {
    if (!currentUser) return

    const nextName = form.nome.trim()
    if (!nextName) {
      alert('Informe o nome completo.')
      return
    }

    if (form.novaSenha || form.confirmarSenha) {
      if (form.novaSenha.length < 6) {
        alert('A nova senha deve ter pelo menos 6 caracteres.')
        return
      }
      if (form.novaSenha !== form.confirmarSenha) {
        alert('A confirmação de senha não confere.')
        return
      }
    }

    const changes = {
      nome: nextName,
      ...(form.novaSenha ? { senha: form.novaSenha } : {}),
    }

    const updatedUsers = usuarios.map((user) => {
      if (user.id === currentUser.id) {
        return { ...user, ...changes }
      }
      return user
    })

    const updatedCurrentUser = { ...currentUser, ...changes }
    setUsuarios(updatedUsers)
    setCurrentUser(updatedCurrentUser)
    localStorage.setItem('currentUser', JSON.stringify(updatedCurrentUser))
    setProfileOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`size-10 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all ${open ? 'border-[#4997D0] bg-[#4997D0] text-white' : 'border-[#4997D0] bg-[#4997D0]/10 text-[#4997D0] hover:bg-[#4997D0]/20'
          }`}
        title={displayName}
      >
        {initials}
      </button>

      <div className={`absolute right-0 top-full mt-2 z-50 w-56 bg-white border border-slate-200 rounded-xl shadow-xl
        transition-all duration-200 origin-top-right ${open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}
      >
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-[#4997D0] flex items-center justify-center text-white font-bold text-sm shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{displayName}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Shield size={11} className="text-[#4997D0] shrink-0" />
                <p className="text-xs text-slate-500 truncate">{role}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-2">
          <button
            onClick={handleOpenProfile}
            className="mb-1 w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <UserRound size={16} />
            Meu Perfil
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </div>

      {profileOpen && createPortal(
        <>
          <div
            onClick={() => setProfileOpen(false)}
            className="fixed inset-0 z-[9998] bg-black/30 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto p-4 sm:justify-end sm:pt-20 sm:pr-6">
            <div className="w-full max-w-md max-h-[90vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl flex flex-col">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="text-xl font-bold text-slate-900">Olá, {displayName}</h3>
                <p className="text-sm text-slate-500">Gerencie os dados do usuário logado.</p>
              </div>

              <div className="space-y-4 overflow-y-auto px-5 py-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500">Nome completo</label>
                  <input
                    type="text"
                    value={form.nome}
                    onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#4997D0] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-500">Digite a nova senha</label>
                  <div className="relative mt-1">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={form.novaSenha}
                      onChange={(e) => setForm((prev) => ({ ...prev, novaSenha: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 pr-10 text-sm focus:border-[#4997D0] focus:outline-none"
                      placeholder="Digite a nova senha"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-500">Confirme a nova senha</label>
                  <div className="relative mt-1">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={form.confirmarSenha}
                      onChange={(e) => setForm((prev) => ({ ...prev, confirmarSenha: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 pr-10 text-sm focus:border-[#4997D0] focus:outline-none"
                      placeholder="Confirme a nova senha"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setProfileOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="rounded-lg bg-[#4997D0] px-4 py-2 text-sm font-bold text-white hover:brightness-110"
                >
                  Alterar
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body,
      )}
    </div>
  )
}

// ── Layout compartilhado ─────────────────────────────────────────────────────
function AppLayout() {
  const now = new Date()
  const [selectedPeriod, setSelectedPeriod] = useState({
    month: now.getMonth(),
    year: now.getFullYear(),
  })

  // ── Estados Globais (Vazios para entrada manual) ──────────────────────────
  const [fornecedores, setFornecedores] = useState([])
  const [gerentes, setGerentes] = useState([])
  const [equipes, setEquipes] = useState([])
  const [vendedores, setVendedores] = useState([])
  const [usuarios, setUsuarios] = useState(() => {
    const parsed = parseStoredJson('usuarios', null)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_USERS
  })
  const [currentUser, setCurrentUser] = useState(() => parseStoredJson('currentUser', DEFAULT_USERS[0]))

  // ── Estados de Distribuição de Metas ─────────────────────────────────────
  const [records, setRecords] = useState([])
  const [distribuicao, setDistribuicao] = useState([])
  const [ajustes, setAjustes] = useState([])

  // ── Estados de Métrica (Média e Histórico) ───────────────────────────────
  const [mediaEncontrada, setMediaEncontrada] = useState(0)
  const [historicoEncontrado, setHistoricoEncontrado] = useState(0)

  // Mapa de Dados por Equipe e Fornecedor
  // Formato: { "FORNECEDOR#EQUIPE": { media, historico } }
  const [fornecedorEquipeStats, setFornecedorEquipeStats] = useState({})

  // Mapa de Dados por Vendedor Individual
  // Formato: { "FORNECEDOR#EQUIPE#VENDEDOR_CODE": { media, historico } }
  const [fornecedorVendedorStats, setFornecedorVendedorStats] = useState({})

  // Metas mínimas (válidas para todos os meses)
  // Formato: [{ EQUIPE, COD, AREA, FORNECEDOR, VALOR, VALOR_NUM }]
  const [metasMinimas, setMetasMinimas] = useState(() => parseStoredJson('metasMinimas', []))

  // Positivação (domínio separado das metas financeiras)
  const [positivacaoRows, setPositivacaoRows] = useState([])

  const userPermissions = useMemo(
    () => normalizePermissions(currentUser?.permissoes, currentUser?.nivel),
    [currentUser],
  )

  const allowedPages = userPermissions.pages
  const allowedTeams = userPermissions.allTeams ? null : userPermissions.teams

  const filteredNavItems = useMemo(
    () => NAV_ITEMS.filter((item) => allowedPages.includes(item.path)),
    [allowedPages],
  )

  const scopedEquipes = useMemo(
    () => (allowedTeams ? equipes.filter((equipe) => allowedTeams.includes(equipe.nome)) : equipes),
    [equipes, allowedTeams],
  )

  const scopedVendedores = useMemo(
    () => (allowedTeams ? vendedores.filter((vendedor) => allowedTeams.includes(vendedor.equipe)) : vendedores),
    [vendedores, allowedTeams],
  )

  const scopedDistribuicao = useMemo(
    () => (allowedTeams ? distribuicao.filter((row) => allowedTeams.includes(row.team)) : distribuicao),
    [distribuicao, allowedTeams],
  )

  const scopedAjustes = useMemo(
    () => (allowedTeams ? ajustes.filter((row) => allowedTeams.includes(row.team)) : ajustes),
    [ajustes, allowedTeams],
  )

  useEffect(() => {
    localStorage.setItem('usuarios', JSON.stringify(usuarios))
  }, [usuarios])

  useEffect(() => {
    localStorage.setItem('metasMinimas', JSON.stringify(metasMinimas))
  }, [metasMinimas])

  useEffect(() => {
    if (!currentUser) return

    const latest = usuarios.find((u) => u.id === currentUser.id)
      || usuarios.find((u) => u.email === currentUser.email)
      || usuarios.find((u) => u.login === currentUser.login)

    if (!latest) return

    const changed = JSON.stringify(latest) !== JSON.stringify(currentUser)
    if (changed) {
      setCurrentUser(latest)
      localStorage.setItem('currentUser', JSON.stringify(latest))
    }
  }, [usuarios, currentUser])

  // Contexto completo
  const contextValue = {
    selectedPeriod, setSelectedPeriod,
    fornecedores, setFornecedores,
    gerentes, setGerentes,
    equipes: scopedEquipes, setEquipes,
    vendedores: scopedVendedores, setVendedores,
    usuarios, setUsuarios,
    currentUser, setCurrentUser,
    userPermissions,
    // Estados de distribuição
    records, setRecords,
    distribuicao: scopedDistribuicao, setDistribuicao,
    ajustes: scopedAjustes, setAjustes,
    // Estados de métrica
    mediaEncontrada, setMediaEncontrada,
    historicoEncontrado, setHistoricoEncontrado,
    // Mapa de dados por equipe
    fornecedorEquipeStats, setFornecedorEquipeStats,
    // Mapa de dados por vendedor individual
    fornecedorVendedorStats, setFornecedorVendedorStats,
    // Metas mínimas (todos os meses)
    metasMinimas, setMetasMinimas,
    // Positivação (separado de financeiro)
    positivacaoRows, setPositivacaoRows,
  }

  return (
    <div className="min-h-screen bg-[#f8f6f6] text-slate-900">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-white/40 backdrop-blur-md border-b border-slate-200 shadow-sm">
        {/* Barra superior: Logo + Data + Usuário */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img src="/sorriso_dmuller.png" alt="MetaFlow" className="w-[50px] h-[50px] object-contain shrink-0" />
              <h1 className="text-xl font-bold tracking-tight text-slate-900">MetaFlow</h1>
            </div>

            {/* Direita: seletor de período + usuário */}
            <div className="flex items-center gap-4">
              <div className="hidden md:block">
                <MonthYearPicker value={selectedPeriod} onChange={setSelectedPeriod} />
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-slate-900 leading-none">{currentUser?.nome || 'Usuário'}</p>
                  <p className="text-xs text-slate-500">{roleLabel(currentUser?.nivel)}</p>
                </div>
                <UserMenu
                  currentUser={currentUser}
                  setCurrentUser={setCurrentUser}
                  usuarios={usuarios}
                  setUsuarios={setUsuarios}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Barra de navegação */}
        <div className="bg-slate-50 border-t border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex items-center justify-center gap-4 overflow-x-auto">
              {filteredNavItems.map(({ label, path, Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${isActive
                      ? 'border-[#4997D0] text-[#4997D0]'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
                    }`
                  }
                >
                  <Icon size={15} />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Conteúdo da rota atual */}
      <Outlet context={contextValue} />
    </div>
  )
}

// ── Componente para proteção de rotas ────────────────────────────────────────
function ProtectedRoute({ children }) {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

// ── Roteador principal ───────────────────────────────────────────────────────
export default function App() {
  const usersFromStorage = parseStoredJson('usuarios', DEFAULT_USERS)
  const currentUserFromStorage = parseStoredJson('currentUser', DEFAULT_USERS[0])

  const effectiveCurrentUser = usersFromStorage.find((user) => user.id === currentUserFromStorage?.id)
    || usersFromStorage.find((user) => user.email === currentUserFromStorage?.email)
    || usersFromStorage.find((user) => user.login === currentUserFromStorage?.login)
    || currentUserFromStorage
    || DEFAULT_USERS[0]

  const permissions = normalizePermissions(effectiveCurrentUser?.permissoes, effectiveCurrentUser?.nivel)
  const fallbackPath = permissions.pages[0] || '/admin'
  const canAccess = (path) => permissions.pages.includes(path)

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/admin" element={canAccess('/admin') ? <AdminDashboardPage /> : <Navigate to={fallbackPath} replace />} />
        <Route path="/fornecedores" element={canAccess('/fornecedores') ? <SupplierRegistrationPage /> : <Navigate to={fallbackPath} replace />} />
        <Route path="/gerente" element={canAccess('/gerente') ? <ManagerAdjustPage /> : <Navigate to={fallbackPath} replace />} />
        <Route path="/supervisor" element={canAccess('/supervisor') ? <SupervisorFinalPage /> : <Navigate to={fallbackPath} replace />} />
        <Route path="/positivacao" element={canAccess('/positivacao') ? <PositivacaoPage /> : <Navigate to={fallbackPath} replace />} />
        <Route path="/cadastros" element={canAccess('/cadastros') ? <CadastrosPage /> : <Navigate to={fallbackPath} replace />} />
        <Route path="/configuracoes" element={<Navigate to="/cadastros" replace />} />
        <Route path="/" element={<Navigate to={fallbackPath} replace />} />
        <Route path="*" element={<Navigate to={fallbackPath} replace />} />
      </Route>
    </Routes>
  )
}
