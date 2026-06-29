'use client'

import { useState, useEffect } from 'react'

const CATEGORY_EMOJI: Record<string, string> = {
  Food: '🍽️',
  Beverages: '🥤',
  Dinner: '🍴',
  Production: '🎛️',
  Security: '🔒',
  Transportation: '🚐',
  Hotel: '🏨',
  Venue: '🏟️',
  'Dressing Room': '🪞',
  'Production Office': '📋',
  Essentials: '✅',
  Other: '📦',
}

const CACHE_VERSION = 'v4'
const imageCache = new Map<string, string | null>()
const pending = new Map<string, Promise<string | null>>()

function resolveImage(name: string, category: string): Promise<string | null> {
  const key = `${CACHE_VERSION}:${name.toLowerCase()}`
  if (imageCache.has(key)) return Promise.resolve(imageCache.get(key)!)
  if (pending.has(key)) return pending.get(key)!
  const p = fetch(`/api/product-image?v=4&q=${encodeURIComponent(name)}&category=${encodeURIComponent(category)}`)
    .then(r => r.json())
    .then(d => { imageCache.set(key, d.imageUrl ?? null); return d.imageUrl ?? null })
    .catch(() => { imageCache.set(key, null); return null })
    .finally(() => pending.delete(key))
  pending.set(key, p)
  return p
}

interface Props {
  name: string
  category: string
  size?: number
}

export default function ProductImage({ name, category, size = 44 }: Props) {
  const [url, setUrl] = useState<string | null | undefined>(undefined)
  const emoji = CATEGORY_EMOJI[category] ?? '📦'

  useEffect(() => {
    const key = `${CACHE_VERSION}:${name.toLowerCase()}`
    if (imageCache.has(key)) { setUrl(imageCache.get(key)!); return }
    resolveImage(name, category).then(setUrl)
  }, [name, category])

  const base = `rounded-xl shrink-0 border border-gray-100`
  const style = { width: size, height: size }

  if (url === undefined) {
    return <div className={`${base} bg-gray-100 animate-pulse`} style={style} />
  }

  if (!url) {
    return (
      <div className={`${base} bg-gray-50 flex items-center justify-center`} style={style}>
        <span style={{ fontSize: size * 0.45 }}>{emoji}</span>
      </div>
    )
  }

  return (
    <img
      src={url}
      alt={name}
      width={size}
      height={size}
      className={`${base} object-contain bg-white`}
      style={style}
      onError={() => setUrl(null)}
    />
  )
}
