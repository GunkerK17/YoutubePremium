// src/views/LoginView.jsx
import { useState } from 'react'
import { AlertCircle, Eye, EyeOff, Play } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function LoginView() {
  const { signInWithEmail, signInWithGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    const { error: err } = await signInWithEmail(email, password)
    if (err) setError(err.message)

    setLoading(false)
  }

  const handleGoogle = async () => {
    setError('')
    const { error: err } = await signInWithGoogle()
    if (err) setError(err.message)
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden relative px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(220,38,38,0.18),transparent_35%)]" />
      <div className="absolute top-[-120px] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-red-600/10 blur-3xl rounded-full" />
      <div className="absolute bottom-[-150px] right-[-100px] w-[400px] h-[400px] bg-red-900/10 blur-3xl rounded-full" />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }}
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="relative w-20 h-20 mx-auto mb-5">
            <div className="absolute inset-0 bg-red-600 rounded-3xl blur-xl opacity-40" />
            <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-red-500 to-red-800 flex items-center justify-center border border-white/10 shadow-2xl">
              <Play size={30} className="text-white fill-white ml-1" />
            </div>
          </div>

          <h1 className="text-4xl font-black tracking-tight text-white">
            YTB Premium
          </h1>
          <p className="text-zinc-500 mt-2 text-sm tracking-wide">
            Secure Admin Dashboard
          </p>
        </div>

        <div className="backdrop-blur-2xl bg-white/[0.03] border border-white/10 rounded-3xl p-8 shadow-[0_0_80px_rgba(0,0,0,0.6)]">
          <div className="mb-6">
            <h2 className="text-white text-xl font-semibold">
              Welcome back
            </h2>
            <p className="text-zinc-500 text-sm mt-1">
              Đăng nhập để tiếp tục quản lý hệ thống
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-2xl text-sm">
              <AlertCircle size={17} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-zinc-500 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                className="w-full h-12 rounded-2xl bg-white/[0.04] border border-white/10 px-4 text-white placeholder:text-zinc-600 outline-none focus:border-red-500/50 focus:bg-white/[0.06] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-zinc-500 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full h-12 rounded-2xl bg-white/[0.04] border border-white/10 px-4 pr-12 text-white placeholder:text-zinc-600 outline-none focus:border-red-500/50 focus:bg-white/[0.06] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition"
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold transition-all duration-300 shadow-lg shadow-red-900/40 hover:scale-[1.02] active:scale-[0.99] flex items-center justify-center gap-2"
            >
              {loading && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-zinc-600 text-xs uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <button
            onClick={handleGoogle}
            className="w-full h-12 rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 text-white font-medium transition-all flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </div>

        <p className="text-center text-zinc-700 text-xs mt-6 tracking-wide">
          YTB Premium Manager © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
