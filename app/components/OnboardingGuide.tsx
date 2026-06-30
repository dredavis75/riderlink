'use client'

import { useState, useEffect } from 'react'
import { X, ChevronRight, ChevronLeft, FileText, Music, Calendar, Send, CheckCircle2 } from 'lucide-react'

const STEPS = [
  {
    id: 'welcome',
    icon: '🎤',
    title: 'Welcome to RiderLink',
    body: 'RiderLink is your central hub for managing artist riders and sending them to venue buyers. Follow these steps to get started — you can always come back to this guide.',
    color: 'bg-amber-400',
    rotate: '-rotate-1',
    page: null,
  },
  {
    id: 'artists',
    icon: <Music size={20} className="text-amber-900" />,
    title: 'Step 1 — Add Your Artists',
    body: 'Go to Rider Library (top right menu). Click "Add Artist" to enter your artist\'s name and photo. You can also add management contacts for each artist here.',
    color: 'bg-yellow-300',
    rotate: 'rotate-1',
    page: '/riders',
    cta: 'Go to Rider Library →',
  },
  {
    id: 'rider',
    icon: <FileText size={20} className="text-amber-900" />,
    title: 'Step 2 — Build or Upload a Rider',
    body: 'From the Rider Library, click your artist then "New Rider." You can upload a PDF and we\'ll extract the items automatically, or build one item by item.',
    color: 'bg-lime-300',
    rotate: '-rotate-1',
    page: '/riders',
    cta: 'Go to Rider Library →',
  },
  {
    id: 'show',
    icon: <Calendar size={20} className="text-amber-900" />,
    title: 'Step 3 — Create a Show',
    body: 'Back on the main dashboard, click the + button to add a show. Enter the artist, venue, city, and date. Then attach the rider you built — all items carry over automatically.',
    color: 'bg-sky-300',
    rotate: 'rotate-1',
    page: '/',
    cta: 'Go to Dashboard →',
  },
  {
    id: 'send',
    icon: <Send size={20} className="text-amber-900" />,
    title: 'Step 4 — Send to Your Buyer',
    body: 'Open a show and click "Send to Buyer." Enter the buyer\'s name, email, and phone. They\'ll get a professional email + SMS with a link to review and confirm every rider item.',
    color: 'bg-violet-300',
    rotate: '-rotate-1',
    page: null,
  },
  {
    id: 'done',
    icon: <CheckCircle2 size={20} className="text-emerald-800" />,
    title: "You're All Set",
    body: 'Buyers can confirm, flag, or substitute items — and message you directly through the rider link. You\'ll see all updates live on your dashboard.',
    color: 'bg-emerald-300',
    rotate: 'rotate-1',
    page: null,
  },
]

const STORAGE_KEY = 'riderlink_onboarding_dismissed'

interface Props {
  /** Force-show even if user dismissed before (e.g. from a Help button) */
  forceOpen?: boolean
  onClose?: () => void
}

export default function OnboardingGuide({ forceOpen, onClose }: Props) {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (forceOpen) { setVisible(true); setStep(0); return }
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (!dismissed) setVisible(true)
  }, [forceOpen])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
    onClose?.()
  }

  if (!visible) return null

  const current = STEPS[step]
  const isFirst = step === 0
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`relative w-full max-w-sm ${current.rotate} transition-transform duration-300`}>
        {/* Sticky note shadow */}
        <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-2xl bg-black/20" />

        <div className={`relative ${current.color} rounded-2xl p-6 shadow-2xl`}>
          {/* Close */}
          <button onClick={dismiss}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-black/10 transition-colors">
            <X size={16} className="text-amber-900/70" />
          </button>

          {/* Step dots */}
          <div className="flex gap-1.5 mb-4">
            {STEPS.map((_, i) => (
              <button key={i} onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all ${i === step ? 'w-5 bg-amber-900' : 'w-1.5 bg-amber-900/30'}`} />
            ))}
          </div>

          {/* Icon */}
          <div className="w-10 h-10 rounded-xl bg-white/40 flex items-center justify-center mb-3 text-xl">
            {typeof current.icon === 'string' ? current.icon : current.icon}
          </div>

          {/* Content */}
          <h2 className="text-base font-black text-amber-950 mb-2">{current.title}</h2>
          <p className="text-sm text-amber-900 leading-relaxed mb-5">{current.body}</p>

          {/* Actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-2">
              {!isFirst && (
                <button onClick={() => setStep(s => s - 1)}
                  className="flex items-center gap-1 text-xs font-bold text-amber-900/70 hover:text-amber-950 transition-colors">
                  <ChevronLeft size={14} /> Back
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {current.cta && current.page && (
                <a href={current.page}
                  className="text-xs font-bold text-amber-950 underline underline-offset-2 hover:opacity-70 transition-opacity">
                  {current.cta}
                </a>
              )}
              {!isLast ? (
                <button onClick={() => setStep(s => s + 1)}
                  className="flex items-center gap-1 bg-amber-950 text-amber-100 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-amber-900 transition-colors">
                  Next <ChevronRight size={13} />
                </button>
              ) : (
                <button onClick={dismiss}
                  className="flex items-center gap-1 bg-amber-950 text-amber-100 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-amber-900 transition-colors">
                  Get Started
                </button>
              )}
            </div>
          </div>

          {/* Skip */}
          {!isLast && (
            <div className="text-center mt-3">
              <button onClick={dismiss} className="text-xs text-amber-900/50 hover:text-amber-900 transition-colors">
                Skip guide
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
