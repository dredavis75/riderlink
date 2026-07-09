'use client'

import { useState, useEffect } from 'react'
import { getWorkspaceId } from '@/lib/workspace'
import { getLocalImage } from '@/lib/riderImageMap'

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

// Items that should NEVER get a local or AI image — just show the emoji
const SKIP_IMAGE = [
  'colored flames',
  'colour flames',
  'english speaking',
  'knobs',
  'a1 english',
]

function shouldSkipImage(name: string): boolean {
  const lower = name.toLowerCase()
  return SKIP_IMAGE.some(kw => lower.includes(kw))
}

const CACHE_VERSION = 'v18'
const imageCache = new Map<string, string | null>()
const pending = new Map<string, Promise<string | null>>()

// Community photos — fetched once per session, shared across all ProductImage instances
let communityPhotos: { keyword: string; url: string }[] | null = null
let communityFetch: Promise<void> | null = null

async function loadCommunityPhotos() {
  if (communityPhotos !== null) return
  if (communityFetch) { await communityFetch; return }
  const workspaceId = getWorkspaceId() ?? 'default'
  communityFetch = fetch(`/api/community-photos?workspaceId=${encodeURIComponent(workspaceId)}`)
    .then(r => r.json())
    .then(d => { communityPhotos = Array.isArray(d) ? d : [] })
    .catch(() => { communityPhotos = [] })
  await communityFetch
}

function getCommunityImage(name: string): string | null {
  if (!communityPhotos) return null
  const lower = name.toLowerCase()
  const match = communityPhotos.find(p => lower.includes(p.keyword))
  return match?.url ?? null
}

function resolveImage(name: string, category: string): Promise<string | null> {
  if (shouldSkipImage(name)) return Promise.resolve(null)
  const local = getLocalImage(name)
  if (local) return Promise.resolve(local)

  const key = `${CACHE_VERSION}:${name.toLowerCase()}`
  if (imageCache.has(key)) return Promise.resolve(imageCache.get(key)!)
  if (pending.has(key)) return pending.get(key)!

  const p = loadCommunityPhotos().then(() => {
    const community = getCommunityImage(name)
    if (community) { imageCache.set(key, community); return community }
    return fetch(`/api/product-image?v=10&q=${encodeURIComponent(name)}&category=${encodeURIComponent(category)}`)
      .then(r => r.json())
      .then(d => { imageCache.set(key, d.imageUrl ?? null); return d.imageUrl ?? null })
      .catch(() => { imageCache.set(key, null); return null })
  }).finally(() => pending.delete(key))

  pending.set(key, p)
  return p
}

interface Props {
  name: string
  category: string
  size?: number
  imageUrl?: string
}

export default function ProductImage({ name, category, size = 64, imageUrl }: Props) {
  const [url, setUrl] = useState<string | null | undefined>(imageUrl ?? undefined)
  const [loadKey, setLoadKey] = useState(0)
  const emoji = CATEGORY_EMOJI[category] ?? '📦'

  useEffect(() => {
    // A manually-assigned photo always wins — skip all keyword guessing.
    if (imageUrl) { setUrl(imageUrl); return }
    if (shouldSkipImage(name)) { setUrl(null); return }
    const local = getLocalImage(name)
    if (local) { setUrl(local); return }
    const key = `${CACHE_VERSION}:${name.toLowerCase()}`
    if (imageCache.has(key)) { setUrl(imageCache.get(key)!); return }
    // Check community photos then AI fallback
    resolveImage(name, category).then(setUrl)
  }, [name, category, imageUrl])

  const style = { width: size, height: size, minWidth: size, minHeight: size }

  if (url === undefined) {
    return <div className="rounded-xl shrink-0 bg-amber-50 animate-pulse" style={style} />
  }

  if (!url) {
    return (
      <div className="rounded-xl shrink-0 bg-amber-50 border border-amber-200 flex items-center justify-center" style={style}>
        <span style={{ fontSize: size * 0.42 }}>{emoji}</span>
      </div>
    )
  }

  return (
    <div className="rounded-xl shrink-0 bg-amber-50 border border-amber-200 overflow-hidden flex items-center justify-center" style={style}>
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
            // Only pollute the shared name-based cache for keyword-guessed
            // images — a manually-assigned photo failing shouldn't affect
            // other items that happen to share this item's name.
            if (!imageUrl) imageCache.set(`${CACHE_VERSION}:${name.toLowerCase()}`, null)
            setUrl(null)
          }
        }}
      />
    </div>
  )
}
