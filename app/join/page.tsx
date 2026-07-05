'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Music2, ArrowRight } from 'lucide-react'
import { setWorkspaceId, getWorkspaceId } from '@/lib/workspace'

function JoinForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [companyName, setCompanyName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [claiming, setClaiming] = useState(false)

  useEffect(() => {
    // ?w=workspaceId — direct claim
    const w = searchParams.get('w')
    if (w) {
      setClaiming(true)
      setWorkspaceId(w)
      router.replace('/')
      return
    }
    // Pre-fill email from auth callback
    const emailParam = searchParams.get('email')
    if (emailParam) setOwnerEmail(decodeURIComponent(emailParam))
    // Already has a workspace — go home
    if (getWorkspaceId()) {
      router.replace('/')
    }
  }, [router, searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!companyName.trim()) { setError('Enter your touring company name'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/create-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, ownerName, ownerEmail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create workspace')
      setWorkspaceId(data.id)
      router.push('/')
    } catch (err: any) {
      setError(err.message)
      setSaving(false)
    }
  }

  if (claiming) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 size={32} className="text-amber-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      {/* Dot grid background */}
      <div className="fixed inset-0 dot-grid opacity-40 pointer-events-none" />

      <div className="relative w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <img src="/logo.png" alt="RiderLink" className="w-12 h-12 rounded-xl shadow-lg shadow-amber-500/30 object-cover" />
          <div>
            <div className="text-xl font-black text-white tracking-tight">RiderLink</div>
            <div className="text-xs font-bold text-amber-500 tracking-widest uppercase">Touring Platform</div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-2xl font-black text-white mb-1">Get Started</h1>
          <p className="text-sm text-gray-400 mb-7">Your workspace is private — only you see your shows and riders.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                Touring Company Name <span className="text-amber-500">*</span>
              </label>
              <input
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="e.g. Blue Alley Touring"
                className="w-full bg-gray-800 border border-white/10 text-white placeholder-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                Your Name <span className="text-gray-600">(optional)</span>
              </label>
              <input
                value={ownerName}
                onChange={e => setOwnerName(e.target.value)}
                placeholder="Tour Director"
                className="w-full bg-gray-800 border border-white/10 text-white placeholder-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                Email <span className="text-gray-600">(optional — for future recovery)</span>
              </label>
              <input
                type="email"
                value={ownerEmail}
                onChange={e => setOwnerEmail(e.target.value)}
                placeholder="you@yourcompany.com"
                className="w-full bg-gray-800 border border-white/10 text-white placeholder-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 font-medium">{error}</p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-950 font-black text-sm px-6 py-3.5 rounded-xl transition-all shadow-lg shadow-amber-500/25 mt-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <><ArrowRight size={16} /> Create My Workspace</>}
            </button>
          </form>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-3 text-center">
          {[
            { emoji: '🎤', label: 'Artist Riders' },
            { emoji: '📲', label: 'Buyer Delivery' },
            { emoji: '📸', label: 'Shared Photo Library' },
          ].map(f => (
            <div key={f.label} className="bg-gray-900/60 border border-white/5 rounded-xl p-3">
              <div className="text-xl mb-1">{f.emoji}</div>
              <div className="text-xs text-gray-400 font-medium">{f.label}</div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Built for the touring industry · Powered by Blue Alley Touring LLC
        </p>
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 size={32} className="text-amber-500 animate-spin" />
      </div>
    }>
      <JoinForm />
    </Suspense>
  )
}
