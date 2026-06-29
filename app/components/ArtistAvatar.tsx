'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

const ARTIST_COLORS: Record<string, string> = {
  'G Herbo':     'bg-emerald-500',
  'SKRILLA':     'bg-violet-500',
  'Keyshia Cole':'bg-rose-500',
  'Flo Milli':   'bg-amber-400',
  'K. Michelle': 'bg-teal-500',
  'RL':          'bg-blue-500',
  'NEXT':        'bg-sky-400',
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// Module-level cache so images persist across re-renders
const imgCache: Record<string, string | null> = {}
const pending: Record<string, Promise<string | null>> = {}

function fetchArtistImage(artist: string): Promise<string | null> {
  if (artist in imgCache) return Promise.resolve(imgCache[artist])
  if (artist in pending) return pending[artist]
  const p = fetch(`/api/artist-image?name=${encodeURIComponent(artist)}`)
    .then(r => r.json())
    .then(({ url }: { url: string | null }) => {
      imgCache[artist] = url
      return url
    })
    .catch(() => {
      imgCache[artist] = null
      return null
    })
  pending[artist] = p
  return p
}

interface Props {
  artist: string
  size?: number
  className?: string
  rounded?: string
}

export default function ArtistAvatar({ artist, size = 48, className = '', rounded = 'rounded-xl' }: Props) {
  const [url, setUrl] = useState<string | null>(imgCache[artist] ?? null)
  const [broken, setBroken] = useState(false)

  useEffect(() => {
    if (imgCache[artist] !== undefined) {
      setUrl(imgCache[artist])
      return
    }
    fetchArtistImage(artist).then(setUrl)
  }, [artist])

  const color = ARTIST_COLORS[artist] ?? 'bg-gray-600'
  const fs = Math.round(size * 0.32)

  if (url && !broken) {
    return (
      <div
        className={`relative overflow-hidden shrink-0 ${rounded} ${className}`}
        style={{ width: size, height: size }}
      >
        <Image
          src={url}
          alt={artist}
          fill
          sizes={`${size}px`}
          className="object-cover object-top"
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
