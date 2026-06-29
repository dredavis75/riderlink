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

const CACHE_VERSION = 'v14'
const imageCache = new Map<string, string | null>()
const pending = new Map<string, Promise<string | null>>()

function resolveImage(name: string, category: string): Promise<string | null> {
  const key = `${CACHE_VERSION}:${name.toLowerCase()}`
  if (imageCache.has(key)) return Promise.resolve(imageCache.get(key)!)
  if (pending.has(key)) return pending.get(key)!
  const p = fetch(`/api/product-image?v=10&q=${encodeURIComponent(name)}&category=${encodeURIComponent(category)}`)
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

export default function ProductImage({ name, category, size = 64 }: Props) {
  const [url, setUrl] = useState<string | null | undefined>(undefined)
  // loadKey changes on error to force the browser to retry the img request fresh
  const [loadKey, setLoadKey] = useState(0)
  const emoji = CATEGORY_EMOJI[category] ?? '📦'

  useEffect(() => {
    const key = `${CACHE_VERSION}:${name.toLowerCase()}`
    if (imageCache.has(key)) { setUrl(imageCache.get(key)!); return }
    resolveImage(name, category).then(setUrl)
  }, [name, category])

  const style = { width: size, height: size, minWidth: size, minHeight: size }

  if (url === undefined) {
    return <div className="rounded-xl shrink-0 bg-gray-100 animate-pulse" style={style} />
  }

  if (!url) {
    return (
      <div className="rounded-xl shrink-0 bg-gray-50 border border-gray-100 flex items-center justify-center" style={style}>
        <span style={{ fontSize: size * 0.42 }}>{emoji}</span>
      </div>
    )
  }

  return (
    <div className="rounded-xl shrink-0 bg-white border border-gray-100 overflow-hidden flex items-center justify-center" style={style}>
      <img
        key={loadKey}
        src={loadKey > 0 ? `${url}?r=${loadKey}` : url}
        alt={name}
        width={size}
        height={size}
        className="object-contain w-full h-full"
        onError={() => {
          if (loadKey < 2) {
            setLoadKey(k => k + 1)
          } else {
            imageCache.set(`${CACHE_VERSION}:${name.toLowerCase()}`, null)
            setUrl(null)
          }
        }}
      />
    </div>
  )
}
