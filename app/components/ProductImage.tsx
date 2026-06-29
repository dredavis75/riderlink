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

const imageCache = new Map<string, string | null>()

interface Props {
  name: string
  category: string
  size?: number
}

export default function ProductImage({ name, category, size = 40 }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null | undefined>(undefined)
  const cacheKey = `${category}:${name}`

  useEffect(() => {
    if (imageCache.has(cacheKey)) {
      setImageUrl(imageCache.get(cacheKey)!)
      return
    }
    fetch(`/api/product-image?q=${encodeURIComponent(name)}&category=${encodeURIComponent(category)}`)
      .then(r => r.json())
      .then(d => {
        imageCache.set(cacheKey, d.imageUrl)
        setImageUrl(d.imageUrl)
      })
      .catch(() => {
        imageCache.set(cacheKey, null)
        setImageUrl(null)
      })
  }, [cacheKey, name, category])

  const emoji = CATEGORY_EMOJI[category] ?? '📦'

  if (imageUrl === undefined) {
    // Loading state — ghost box
    return (
      <div
        className="rounded-lg bg-gray-100 animate-pulse shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }

  if (!imageUrl) {
    // No image — show category emoji
    return (
      <div
        className="rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 text-base"
        style={{ width: size, height: size }}
      >
        {emoji}
      </div>
    )
  }

  return (
    <img
      src={imageUrl}
      alt={name}
      width={size}
      height={size}
      className="rounded-lg object-contain bg-white border border-gray-100 shrink-0"
      style={{ width: size, height: size }}
      onError={() => setImageUrl(null)}
    />
  )
}
