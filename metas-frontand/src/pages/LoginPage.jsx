import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'

const ADMIN_EMAIL = 'admin@metaflow.com'
const ADMIN_PASSWORD = 'ADMIN'

function parseStoredUsers() {
  try {
    const raw = localStorage.getItem('usuarios')
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.')
      return
    }
    setIsLoading(true)
    setTimeout(() => {
      const users = parseStoredUsers()
      const matchedUser = users.find(
        (user) => String(user.email || '').toLowerCase() === email.toLowerCase()
          && String(user.senha || '') === password,
      )

      if (matchedUser || (email === ADMIN_EMAIL && password === ADMIN_PASSWORD)) {
        const currentUser = matchedUser || {
          id: 1,
          appCode: '20250502',
          login: 'ADMIN',
          nome: 'Administrador',
          email: ADMIN_EMAIL,
          nivel: 'ADMIN',
          senha: ADMIN_PASSWORD,
        }

        localStorage.setItem('isAuthenticated', 'true')
        localStorage.setItem('userEmail', email)
        localStorage.setItem('currentUser', JSON.stringify(currentUser))
        if (rememberMe) localStorage.setItem('rememberMe', 'true')
        navigate('/admin')
      } else {
        setError('Email ou senha incorretos.')
        setIsLoading(false)
      }
    }, 600)
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Painel esquerdo (azul) ── */}
      <div
        className="hidden lg:flex lg:w-[42%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0014A8 0%, #001580 50%, #000d5e 100%)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 z-10">
          <img src="/sorriso_dmuller.png" alt="MetaFlow" className="w-[50px] h-[50px] object-contain shrink-0" />
          <span className="text-white text-xl font-bold tracking-tight">MetaFlow</span>
        </div>

        {/* Conteúdo central */}
        <div className="z-10">
          <h1 className="text-5xl font-bold text-white leading-tight mb-6">
            Bem-vindo ao<br />MetaFlow
          </h1>
          <p className="text-white/70 text-lg leading-relaxed max-w-xs">
            Uma plataforma inteligente para distribuição de metas de forma limpa e simplificada.
          </p>
        </div>

        {/* Rodapé decorativo */}
        <div className="z-10 opacity-0 select-none text-xs">.</div>

        {/* Círculos decorativos */}
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full border border-white/10" />
        <div className="absolute -bottom-12 -right-12 w-52 h-52 rounded-full border border-white/10" />
        <div className="absolute top-1/3 -left-20 w-52 h-52 rounded-full bg-white/5" />
      </div>

      {/* ── Painel direito (branco) ── */}
      <div className="flex-1 flex items-center justify-center bg-white px-8 py-12">
        <div className="w-full max-w-[400px]">

          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <img src="/sorriso_dmuller.png" alt="MetaFlow" className="w-[50px] h-[50px] object-contain shrink-0" />
            <span className="text-[#0014A8] text-lg font-bold">MetaFlow</span>
          </div>

          {/* Cabeçalho */}
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Entrar</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Acesse sua conta para realizar a distribuição das suas metas financeiras.
            </p>
          </div>

          {/* Erro */}
          {error && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="email">
                Endereço de e-mail
              </label>
              <input
                autoComplete="email"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4997D0] focus:border-[#4997D0] transition-colors"
                id="email"
                placeholder="seu@exemplo.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-1">Teste: {ADMIN_EMAIL}</p>
            </div>

            {/* Senha */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-slate-700" htmlFor="password">
                  Senha
                </label>
                <button type="button" className="text-sm text-[#4997D0] hover:underline font-medium">
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <input
                  autoComplete="current-password"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4997D0] focus:border-[#4997D0] transition-colors pr-11"
                  id="password"
                  placeholder="••••••••"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  onClick={() => setShowPassword((v) => !v)}
                  type="button"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1">Teste: {ADMIN_PASSWORD}</p>
            </div>

            {/* Lembrar-me */}
            <div className="flex items-center gap-2">
              <input
                className="h-4 w-4 accent-[#4997D0] cursor-pointer"
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label className="text-sm text-slate-600 cursor-pointer select-none" htmlFor="remember-me">
                Manter conectado por 30 dias
              </label>
            </div>

            {/* Botão */}
            <button
              className="w-full py-3.5 bg-[#4997D0] hover:bg-[#3a84bb] text-white font-bold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Autenticando...' : 'Acessar Minhas Metas'}
            </button>
          </form>

          {/* Credenciais de teste */}
          <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg text-center">
            <p className="text-xs font-bold text-slate-700 mb-1">Credenciais de Teste:</p>
            <p className="text-xs text-slate-500">
              Email: <span className="text-[#4997D0] font-medium">{ADMIN_EMAIL}</span>
            </p>
            <p className="text-xs text-slate-500">
              Senha: <span className="text-slate-700 font-bold">{ADMIN_PASSWORD}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
