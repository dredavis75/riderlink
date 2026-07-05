'use client'

import { useState } from 'react'
import { Loader2, Mail, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://riderlink.vercel.app'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setError('Enter your email address'); return }
    setLoading(true)
    setError('')
    const { error: authErr } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${APP_URL}/auth/callback` },
    })
    if (authErr) {
      setError(authErr.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      <div className="fixed inset-0 dot-grid opacity-40 pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <img src="/logo.png" alt="RiderLink" className="w-12 h-12 rounded-xl shadow-lg shadow-amber-500/30 object-cover" />
          <div>
            <div className="text-xl font-black text-white tracking-tight">RiderLink</div>
            <div className="text-xs font-bold text-amber-500 tracking-widest uppercase">Touring Platform</div>
          </div>
        </div>

        <div className="bg-gray-900 border border-white/10 rounded-2xl p-8 shadow-2xl">
          {sent ? (
            <div className="text-center py-4">
              <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-4" />
              <h2 className="text-lg font-black text-white mb-2">Check your email</h2>
              <p className="text-sm text-gray-400 leading-relaxed">
                We sent a login link to <span className="text-white font-semibold">{email}</span>.<br />
                Click it to sign in — no password needed.
              </p>
              <button
                onClick={() => { setSent(false); setEmail('') }}
                className="mt-6 text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-black text-white mb-1">Sign in</h1>
              <p className="text-sm text-gray-400 mb-7">Enter your email and we'll send you a link — no password needed.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@yourcompany.com"
                      className="w-full bg-gray-800 border border-white/10 text-white placeholder-gray-600 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                      autoFocus
                    />
                  </div>
                </div>

                {error && <p className="text-xs text-red-400 font-medium">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-950 font-black text-sm px-6 py-3.5 rounded-xl transition-all shadow-lg shadow-amber-500/25"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : 'Send Login Link'}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-white/5 text-center">
                <p className="text-xs text-gray-500">
                  First time?{' '}
                  <a href="/join" className="text-amber-400 hover:text-amber-300 font-semibold transition-colors">
                    Create a workspace
                  </a>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
