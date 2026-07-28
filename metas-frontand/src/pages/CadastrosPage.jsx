

import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  Package,
  Users,
  User,
  Shield,
  FileSpreadsheet,
  UserRound,
  SlidersHorizontal,
  KeyRound,
  Trash2,
  Plus,
  Search,
  Save,
  X
} from 'lucide-react'
import ExcelGrid from '../components/ExcelGrid'
import ConfiguracoesPage from './ConfiguracoesPage'

// ── Tabs ───────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'base-metas', label: 'Base de Metas', Icon: FileSpreadsheet },
  { id: 'fornecedores', label: 'Fornecedores', Icon: Package },
  { id: 'gerentes', label: 'Gerentes', Icon: Shield },
  { id: 'equipes', label: 'Equipes', Icon: Users },
  { id: 'vendedores', label: 'Vendedores', Icon: User },
  { id: 'usuarios', label: 'Usuarios', Icon: UserRound },
  { id: 'acessos', label: 'Acessos', Icon: SlidersHorizontal },
]

const SCREEN_OPTIONS = [
  { path: '/admin', label: 'Dashboard' },
  { path: '/fornecedores', label: 'Fornecedores' },
  { path: '/gerente', label: 'Gerentes' },
  { path: '/supervisor', label: 'Equipes' },
  { path: '/cadastros', label: 'Cadastros' },
]

function getDefaultPermissions(level) {
  const isAdmin = String(level || '').toUpperCase() === 'ADMIN'
  return {
    pages: isAdmin ? SCREEN_OPTIONS.map((screen) => screen.path) : ['/admin'],
    allTeams: isAdmin,
    teams: [],
  }
}

function resolvePermissions(user) {
  const defaults = getDefaultPermissions(user?.nivel)
  const raw = user?.permissoes

  if (!raw || typeof raw !== 'object') return defaults

  return {
    pages: Array.isArray(raw.pages) && raw.pages.length > 0 ? raw.pages : defaults.pages,
    allTeams: typeof raw.allTeams === 'boolean' ? raw.allTeams : defaults.allTeams,
    teams: Array.isArray(raw.teams) ? raw.teams : defaults.teams,
  }
}

export default function CadastrosPage() {
  const [activeTab, setActiveTab] = useState('base-metas')

  // ── Puxando do Contexto Global (App.jsx) ─────────────────────────────────
  const {
    fornecedores, setFornecedores,
    gerentes, setGerentes,
    equipes, setEquipes,
    vendedores, setVendedores,
    usuarios, setUsuarios
  } = useOutletContext()

  // ── Funções de Adição ────────────────────────────────────────────────────
  const handleAdd = (setter) => (novoRegistro) => {
    setter((prev) => [...prev, { id: Date.now(), ...novoRegistro }])
  }

  const handleDelete = (setter) => (id) => {
    setter((prev) => prev.filter(item => item.id !== id))
  }

  const handleUpdate = (setter) => (id, changes) => {
    setter((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item)))
  }

  const handleResetPassword = (setter) => (id) => {
    setter((prev) => prev.map((item) => (item.id === id ? { ...item, senha: 'mu123456' } : item)))
  }

  const handleAddUser = (novoRegistro) => {
    const now = Date.now()
    setUsuarios((prev) => [
      ...prev,
      {
        id: now,
        appCode: String(now).slice(-8),
        login: String(novoRegistro.login || '').trim().toUpperCase(),
        nome: String(novoRegistro.nome || '').trim(),
        email: String(novoRegistro.email || '').trim().toLowerCase(),
        nivel: novoRegistro.nivel,
        senha: novoRegistro.senha,
        permissoes: getDefaultPermissions(novoRegistro.nivel),
      },
    ])
  }

  // ── Renderização das Abas ────────────────────────────────────────────────
  function renderTabContent() {
    switch (activeTab) {
      case 'base-metas':
        return <ConfiguracoesPage embedded />

      case 'fornecedores':
        return (
          <CadastroSection
            title="Fornecedores"
            description="Gerencie os fornecedores e suas pautas de distribuição"
            columns={[
              { key: 'codigo', label: 'Código' },
              { key: 'nome', label: 'Nome do Fornecedor' },
              { key: 'pauta', label: 'Pauta (D/M)' },
            ]}
            data={fornecedores}
            onDelete={handleDelete(setFornecedores)}
            onSave={handleAdd(setFornecedores)}
            onUpdate={handleUpdate(setFornecedores)}
            formFields={[
              { name: 'codigo', label: 'Código', placeholder: 'Ex: 82360' },
              { name: 'nome', label: 'Nome', placeholder: 'Nome do fornecedor' },
              { name: 'pauta', label: 'Pauta', type: 'select', options: [{ value: 'D', label: 'Pauta D' }, { value: 'M', label: 'Pauta M' }] },
            ]}
          />
        )

      case 'gerentes':
        return (
          <CadastroSection
            title="Gerentes"
            description="Cadastre os gerentes responsáveis pelas equipes"
            columns={[
              { key: 'nome', label: 'Nome do Gerente' },
              { key: 'pauta', label: 'Pauta (D/M)' },
            ]}
            data={gerentes}
            onDelete={handleDelete(setGerentes)}
            onSave={handleAdd(setGerentes)}
            onUpdate={handleUpdate(setGerentes)}
            formFields={[
              { name: 'nome', label: 'Nome', placeholder: 'Nome completo' },
              { name: 'pauta', label: 'Pauta', type: 'select', options: [{ value: 'D', label: 'Pauta D' }, { value: 'M', label: 'Pauta M' }] },
            ]}
          />
        )

      case 'equipes':
        return (
          <CadastroSection
            title="Equipes"
            description="Configure as equipes de vendas e seus gerentes"
            columns={[
              { key: 'codigo', label: 'Código' },
              { key: 'nome', label: 'Nome da Equipe' },
              { key: 'gerente', label: 'Gerente' },
            ]}
            data={equipes}
            onDelete={handleDelete(setEquipes)}
            onSave={handleAdd(setEquipes)}
            onUpdate={handleUpdate(setEquipes)}
            formFields={[
              { name: 'codigo', label: 'Código', placeholder: 'Ex: 14' },
              { name: 'nome', label: 'Nome', placeholder: 'Ex: Equipe Sul' },
              { name: 'gerente', label: 'Gerente', type: 'select', options: gerentes.map(g => ({ value: g.nome, label: g.nome })) },
            ]}
          />
        )

      case 'vendedores':
        return (
          <CadastroSection
            title="Vendedores"
            description="Cadastre os vendedores e associe-os às equipes"
            columns={[
              { key: 'codigo', label: 'Código' },
              { key: 'nome', label: 'Nome do Vendedor' },
              { key: 'equipe', label: 'Equipe' },
            ]}
            data={vendedores}
            onDelete={handleDelete(setVendedores)}
            onSave={handleAdd(setVendedores)}
            onUpdate={handleUpdate(setVendedores)}
            formFields={[
              { name: 'codigo', label: 'Código', placeholder: 'Ex: VEND-001' },
              { name: 'nome', label: 'Nome', placeholder: 'Nome completo' },
              { name: 'equipe', label: 'Equipe', type: 'select', options: equipes.map(e => ({ value: e.nome, label: e.nome })) },
            ]}
          />
        )

      case 'usuarios':
        return (
          <CadastroSection
            title="Usuarios"
            description="Cadastre os usuários que acessam a plataforma e defina o nível hierárquico"
            columns={[
              { key: 'login', label: 'Login' },
              { key: 'nome', label: 'Nome' },
              { key: 'email', label: 'E-mail' },
              { key: 'nivel', label: 'Nível Hierárquico' },
            ]}
            data={usuarios}
            onDelete={handleDelete(setUsuarios)}
            onSave={handleAddUser}
            onUpdate={handleUpdate(setUsuarios)}
            enableUserActions
            onResetPassword={handleResetPassword(setUsuarios)}
            formFields={[
              { name: 'login', label: 'Login', placeholder: 'Ex: ADM.COMERCIAL' },
              { name: 'nome', label: 'Nome', placeholder: 'Nome completo' },
              { name: 'email', label: 'E-mail', placeholder: 'usuario@empresa.com' },
              {
                name: 'nivel',
                label: 'Nível Hierárquico',
                type: 'select',
                options: [
                  { value: 'ADMIN', label: 'Administrador' },
                  { value: 'GERENTE', label: 'Gerente' },
                  { value: 'SUPERVISOR', label: 'Supervisor' },
                ],
              },
              { name: 'senha', label: 'Senha', type: 'password', placeholder: 'Defina uma senha inicial' },
            ]}
          />
        )

      case 'acessos':
        return (
          <UserAccessSection
            usuarios={usuarios}
            setUsuarios={setUsuarios}
            equipes={equipes}
          />
        )

      default:
        return null
    }
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* Header e Abas Laterais Mobile / Topo Desktop */}
      <div className="flex flex-col md:flex-row gap-6">

        {/* Menu Lateral de Abas */}
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-bold text-slate-900">Módulos de Cadastro</h2>
              <p className="text-xs text-slate-500 mt-1">Selecione o que deseja gerenciar</p>
            </div>
            <nav className="p-2 flex flex-col gap-1">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${isActive
                      ? 'bg-[#4997D0]/10 text-[#4997D0]'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                  >
                    <tab.Icon size={18} className={isActive ? 'text-[#4997D0]' : 'text-slate-400'} />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Área de Conteúdo */}
        <div className="flex-1">
          {renderTabContent()}
        </div>

      </div>
    </main>
  )
}

function UserAccessSection({ usuarios, setUsuarios, equipes }) {
  const [selectedUserId, setSelectedUserId] = useState('')
  const [pages, setPages] = useState([])
  const [allTeams, setAllTeams] = useState(false)
  const [linkedTeams, setLinkedTeams] = useState([])

  useEffect(() => {
    if (usuarios.length > 0 && !selectedUserId) {
      setSelectedUserId(String(usuarios[0].id))
    }
  }, [usuarios, selectedUserId])

  const selectedUser = useMemo(
    () => usuarios.find((user) => String(user.id) === selectedUserId) || null,
    [usuarios, selectedUserId],
  )

  useEffect(() => {
    if (!selectedUser) return
    const resolved = resolvePermissions(selectedUser)
    setPages(resolved.pages)
    setAllTeams(resolved.allTeams)
    setLinkedTeams(resolved.teams)
  }, [selectedUser])

  const availableTeams = useMemo(
    () => Array.from(new Set(equipes.map((team) => team.nome).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [equipes],
  )

  const rulesPreview = useMemo(() => {
    if (!selectedUser) return []

    const teamValue = allTeams
      ? 'TODAS AS EQUIPES'
      : linkedTeams.length > 0
        ? linkedTeams.join(', ')
        : 'SEM EQUIPE VINCULADA'

    return pages.map((path) => {
      const screen = SCREEN_OPTIONS.find((item) => item.path === path)
      return {
        path,
        usuario: selectedUser.login || selectedUser.nome,
        tela: screen?.label || path,
        condicao: allTeams ? 'SEM FILTRO' : 'EQUIPE IN',
        valor: teamValue,
        ligacao: 'AND',
      }
    })
  }, [selectedUser, pages, allTeams, linkedTeams])

  function togglePage(path) {
    setPages((prev) => (prev.includes(path) ? prev.filter((item) => item !== path) : [...prev, path]))
  }

  function toggleTeam(teamName) {
    setLinkedTeams((prev) => (prev.includes(teamName) ? prev.filter((item) => item !== teamName) : [...prev, teamName]))
  }

  function handleSave() {
    if (!selectedUser) return

    if (pages.length === 0) {
      alert('Selecione ao menos uma tela para o usuário.')
      return
    }

    if (!allTeams && linkedTeams.length === 0) {
      alert('Selecione ao menos uma equipe vinculada ou marque acesso a todas equipes.')
      return
    }

    setUsuarios((prev) => prev.map((user) => {
      if (user.id !== selectedUser.id) return user
      return {
        ...user,
        permissoes: {
          pages,
          allTeams,
          teams: allTeams ? [] : linkedTeams,
        },
      }
    }))

    alert('Permissões atualizadas com sucesso.')
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-col lg:flex-row min-h-[520px]">
        <aside className="w-full lg:w-[320px] border-r border-slate-200 bg-slate-50/50 p-5 space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Filtros</h2>
            <p className="text-xs text-slate-500 mt-1">Defina visões e escopo por usuário.</p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Usuário</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#4997D0] focus:outline-none"
            >
              {usuarios.map((user) => (
                <option key={user.id} value={String(user.id)} className="text-slate-900">
                  {user.login} - {user.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-xs font-bold uppercase text-slate-500 mb-2">Lista de Views</p>
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {SCREEN_OPTIONS.map((screen) => (
                <label key={screen.path} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={pages.includes(screen.path)}
                    onChange={() => togglePage(screen.path)}
                    className="h-4 w-4 accent-[#4997D0]"
                  />
                  <span>{screen.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase text-slate-500 mb-2">Filtro por Equipe</p>
            <label className="mb-2 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={allTeams}
                onChange={(e) => setAllTeams(e.target.checked)}
                className="h-4 w-4 accent-[#4997D0]"
              />
              <span>Visualizar todas</span>
            </label>

            {!allTeams && (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {availableTeams.length === 0 ? (
                  <p className="text-xs text-slate-500">Nenhuma equipe cadastrada.</p>
                ) : (
                  availableTeams.map((teamName) => (
                    <label key={teamName} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={linkedTeams.includes(teamName)}
                        onChange={() => toggleTeam(teamName)}
                        className="h-4 w-4 accent-[#4997D0]"
                      />
                      <span>{teamName}</span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="w-full rounded-lg bg-[#4997D0] px-4 py-2.5 text-sm font-bold text-white hover:brightness-110 transition-all"
          >
            Adicionar Filtro
          </button>
        </aside>

        <section className="flex-1 p-5 bg-white">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Regras de Acesso</h3>
              <p className="text-sm text-slate-500">Visualização das regras que serão aplicadas ao usuário selecionado.</p>
            </div>
            {selectedUser && (
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700">
                {selectedUser.login}
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold uppercase text-xs">Usuário</th>
                    <th className="px-4 py-3 text-left font-bold uppercase text-xs">Visão</th>
                    <th className="px-4 py-3 text-left font-bold uppercase text-xs">Condição</th>
                    <th className="px-4 py-3 text-left font-bold uppercase text-xs">Valor</th>
                    <th className="px-4 py-3 text-left font-bold uppercase text-xs">Ligação</th>
                    <th className="px-4 py-3 text-center font-bold uppercase text-xs">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {rulesPreview.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                        Nenhuma regra configurada para exibir.
                      </td>
                    </tr>
                  ) : (
                    rulesPreview.map((rule) => (
                      <tr key={rule.path} className="border-t border-slate-100">
                        <td className="px-4 py-3 text-slate-800">{rule.usuario}</td>
                        <td className="px-4 py-3 text-slate-800">{rule.tela}</td>
                        <td className="px-4 py-3 text-slate-800">{rule.condicao}</td>
                        <td className="px-4 py-3 text-slate-800">{rule.valor}</td>
                        <td className="px-4 py-3 text-slate-800">{rule.ligacao}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => togglePage(rule.path)}
                            title="Remover regra"
                            className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

// ── Componente Reutilizável de Seção de Cadastro ────────────────────────────
function CadastroSection({
  title,
  description,
  columns,
  data,
  formFields,
  onSave,
  onDelete,
  onUpdate,
  enableUserActions = false,
  onResetPassword,
}) {
  const [isAdding, setIsAdding] = useState(false)
  const [formData, setFormData] = useState({})
  const [searchTerm, setSearchTerm] = useState('')

  // Controla o input dos dados do form
  function handleChange(name, value) {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Controle do submit
  function handleSubmit() {
    // Validação basicona: vê se preencheu todos os campos
    const isValid = formFields.every(field => formData[field.name]?.trim())
    if (!isValid) return alert("Por favor, preencha todos os campos antes de continuar.")

    onSave(formData)
    setFormData({}) // Reseta
    setIsAdding(false)
  }

  // Filtrar os dados pra busca
  const filteredData = data.filter((item) =>
    Object.values(item).some((val) =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  function getFieldConfig(key) {
    return formFields.find((field) => field.name === key)
  }

  function handleCellValueChanged(params) {
    const { data: row, colDef, newValue, oldValue } = params
    const field = colDef.field

    if (!row?.id || !field) return
    if (newValue === oldValue) return

    const fieldConfig = getFieldConfig(field)
    const normalizedValue = typeof newValue === 'string' ? newValue.trim() : newValue

    if (fieldConfig?.type === 'select') {
      const allowedValues = fieldConfig.options.map((option) => option.value)
      if (!allowedValues.includes(normalizedValue)) {
        params.node.setDataValue(field, oldValue)
        return
      }
    }

    if (normalizedValue == null || normalizedValue === '') {
      params.node.setDataValue(field, oldValue)
      return
    }

    onUpdate(row.id, { [field]: normalizedValue })
  }

  const columnDefs = [
    ...columns.map((col) => ({
      headerName: col.label,
      field: col.key,
      minWidth: col.key === 'nome' ? 220 : 140,
      filter:
        col.label === 'Fornecedor' || col.label === 'Equipe' || col.key === 'equipe'
          ? 'agTextColumnFilter'
          : true,
      cellRenderer:
        col.key === 'pauta'
          ? (params) => {
            const isD = params.value === 'D'
            const cls = isD ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'
            const label = isD ? 'Pauta D' : 'Pauta M'
            return (
              <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold ${cls}`}>
                {label}
              </span>
            )
          }
          : undefined,
      editable: true,
      cellEditor: getFieldConfig(col.key)?.type === 'select' ? 'agSelectCellEditor' : 'agTextCellEditor',
      cellEditorParams: getFieldConfig(col.key)?.type === 'select'
        ? { values: getFieldConfig(col.key).options.map((option) => option.value) }
        : undefined,
      cellClass: col.key === 'codigo' ? 'font-bold text-slate-900' : undefined,
      pinned: col.key === 'codigo' ? 'left' : undefined,
    })),
  ]

  if (enableUserActions) {
    columnDefs.push({
      headerName: 'Ações',
      minWidth: 110,
      maxWidth: 130,
      pinned: 'right',
      sortable: false,
      filter: false,
      editable: false,
      cellRenderer: (params) => (
        <div className="h-full flex items-center justify-center gap-2">
          <button
            type="button"
            title="Resetar senha"
            onClick={() => onResetPassword?.(params.data.id)}
            className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-500 hover:bg-amber-50 hover:text-amber-600 transition-colors"
          >
            <KeyRound size={15} />
          </button>
          <button
            type="button"
            title="Excluir usuário"
            onClick={() => onDelete?.(params.data.id)}
            className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    })
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">

      {/* Cabeçalho da Seção */}
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/30">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500 mt-1">{description}</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-[#4997D0] text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:brightness-110 transition-all shrink-0"
          >
            <Plus size={16} />
            Novo Cadastro
          </button>
        )}
      </div>

      {/* Formulário de Inserção (Condicional) */}
      {isAdding && (
        <div className="p-6 bg-[#4997D0]/5 border-b border-[#4997D0]/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#4997D0] flex items-center gap-2">
              <Plus size={18} /> Adicionando {title.slice(0, -1)}
            </h3>
            <button onClick={() => { setIsAdding(false); setFormData({}); }} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {formFields.map((f) => (
              <div key={f.name}>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{f.label}</label>
                {f.type === 'select' ? (
                  <select
                    value={formData[f.name] || ''}
                    onChange={(e) => handleChange(f.name, e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4997D0]"
                  >
                    <option value="">Selecione...</option>
                    {f.options.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : f.type === 'password' ? (
                  <input
                    type="password"
                    value={formData[f.name] || ''}
                    onChange={(e) => handleChange(f.name, e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4997D0]"
                    placeholder={f.placeholder}
                  />
                ) : (
                  <input
                    type="text"
                    value={formData[f.name] || ''}
                    onChange={(e) => handleChange(f.name, e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4997D0]"
                    placeholder={f.placeholder}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-3 justify-end">
            <button
              onClick={() => { setIsAdding(false); setFormData({}); }}
              className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 rounded-lg bg-[#4997D0] text-white text-sm font-bold hover:brightness-110 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Save size={16} />
              Salvar Registro
            </button>
          </div>
        </div>
      )}

      {/* Barra de Busca */}
      <div className="p-4 border-b border-slate-100 bg-white flex justify-between items-center">
        <div className="relative max-w-sm w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#4997D0]"
          />
        </div>
        <span className="text-xs font-semibold text-slate-500">{filteredData.length} registros • duplo clique para editar</span>
      </div>

      {/* Tabela de Dados */}
      {filteredData.length > 0 ? (
        <ExcelGrid rowData={filteredData} columnDefs={columnDefs} height={360} onCellValueChanged={handleCellValueChanged} />
      ) : (
        <div className="py-8 text-center text-sm text-slate-500 border-t border-slate-100">
          Nenhum registro encontrado.
        </div>
      )}

    </div>
  )
}
