'use client'

import { useState, useEffect } from 'react'

const ARTIST_COLORS: Record<string, string> = {
  'G Herbo':     'bg-emerald-500',
  'SKRILLA':     'bg-violet-500',
  'Keyshia Cole':'bg-rose-500',
  'Flo Milli':   'bg-amber-400',
  'K. Michelle': 'bg-teal-500',
  'RL':          'bg-blue-500',
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

// Module-level cache — survives re-renders, shared across all instances
const imgCache: Record<string, string | null | 'loading'> = {}
const listeners: Record<string, Array<(url: string | null) => void>> = {}

function resolve(artist: string, cb: (url: string | null) => void) {
  const cached = imgCache[artist]
  if (cached !== undefined && cached !== 'loading') { cb(cached); return }
  if (!listeners[artist]) listeners[artist] = []
  listeners[artist].push(cb)
  if (cached === 'loading') return
  imgCache[artist] = 'loading'
  fetch(`/api/artist-image?name=${encodeURIComponent(artist)}`)
    .then((r) => r.json())
    .then(({ url }: { url: string | null }) => {
      imgCache[artist] = url
      listeners[artist]?.forEach((fn) => fn(url))
      delete listeners[artist]
    })
    .catch(() => {
      imgCache[artist] = null
      listeners[artist]?.forEach((fn) => fn(null))
      delete listeners[artist]
    })
}

interface Props {
  artist: string
  size?: number
  className?: string
  rounded?: string
}

export default function ArtistAvatar({ artist, size = 48, className = '', rounded = 'rounded-xl' }: Props) {
  const init = imgCache[artist]
  const [url, setUrl] = useState<string | null>(
    init && init !== 'loading' ? init : null
  )
  const [broken, setBroken] = useState(false)

  useEffect(() => {
    setBroken(false)
    const cached = imgCache[artist]
    if (cached && cached !== 'loading') { setUrl(cached); return }
    resolve(artist, (u) => setUrl(u))
  }, [artist])

  const color = ARTIST_COLORS[artist] ?? 'bg-gray-600'
  const fs = Math.round(size * 0.32)

  if (url && !broken) {
    return (
      <div
        className={`relative overflow-hidden shrink-0 ${rounded} ${className}`}
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={artist}
          className="w-full h-full object-cover object-top"
          onError={() => setBroken(true)}
        />
      </div>
    )
  }

  return (
    <div
      className={`${color} ${rounded} flex items-center justify-center text-white font-black shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: fs }}
    >
      {initials(artist)}
    </div>
  )
}
