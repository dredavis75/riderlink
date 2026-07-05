'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { setWorkspaceId } from '@/lib/workspace'
import { Suspense } from 'react'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')

  useEffect(() => {
    async function handle() {
      try {
        // Handle PKCE code exchange if present
        const code = searchParams.get('code')
        if (code) {
          const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeErr) throw exchangeErr
        }

        // Give the session a moment to settle (handles hash-based flow too)
        await new Promise(r => setTimeout(r, 500))

        const { data: { session }, error: sessionErr } = await supabase.auth.getSession()
        if (sessionErr) throw sessionErr
        if (!session?.user?.email) throw new Error('No session found — link may have expired. Try signing in again.')

        const email = session.user.email.toLowerCase().trim()

        // Look up workspace by email
        const { data: ws } = await supabase
          .from('workspaces')
          .select('id')
          .eq('owner_email', email)
          .single()

        if (ws?.id) {
          setWorkspaceId(ws.id)
          router.replace('/')
        } else {
          // New user — send to join with email pre-filled
          router.replace(`/join?email=${encodeURIComponent(email)}`)
        }
      } catch (err: any) {
        setError(err.message ?? 'Login failed')
      }
    }

    handle()
  }, [router, searchParams])

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="bg-gray-900 border border-red-500/30 rounded-2xl p-8 max-w-sm w-full text-center">
          <AlertCircle size={36} className="text-red-400 mx-auto mb-3" />
          <h2 className="text-white font-black text-lg mb-2">Login failed</h2>
          <p className="text-sm text-gray-400 mb-5">{error}</p>
          <a href="/login" className="inline-block bg-amber-500 hover:bg-amber-400 text-gray-950 font-black text-sm px-6 py-3 rounded-xl transition-all">
            Try Again
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
      <Loader2 size={32} className="text-amber-500 animate-spin" />
      <p className="text-sm text-gray-400">Signing you in…</p>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 size={32} className="text-amber-500 animate-spin" />
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  )
}
