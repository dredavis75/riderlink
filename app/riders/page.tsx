'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, ChevronDown, ChevronUp, Edit3, Check, X,
  Plus, Trash2, Save, RefreshCw, Loader2, BookOpen
} from 'lucide-react'
import {
  RIDER_TEMPLATES, ARTIST_ROSTER, type MasterRider, type MasterRiderItem,
} from '@/lib/data'
import {
  getRiderMasters, seedRiderMasters, addMasterItem,
  updateMasterItem, deleteMasterItem, bumpMasterVersion,
} from '@/lib/db'
import { isConfigured } from '@/lib/supabase'

type LocalItem = { id: string; category: string; name: string; quantity: string; notes: string; sortOrder: number; masterId: string }

function nextVersion(v: string) {
  const [major, minor] = v.split('.').map(Number)
  return `${major}.${(minor ?? 0) + 1}`
}

function groupByCategory(items: LocalItem[]) {
  return items.reduce<Record<string, LocalItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})
}

export default function RiderLibrary() {
  const router = useRouter()
  const [masters, setMasters] = useState<MasterRider[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null) // artist being edited
  const [editItems, setEditItems] = useState<LocalItem[]>([])
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const load = useCallback(async () => {
    if (!isConfigured) { setLoading(false); return }
    try {
      const data = await getRiderMasters()
      setMasters(data)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSeed() {
    setSeeding(true)
    try {
      await seedRiderMasters(RIDER_TEMPLATES)
      await load()
    } catch (e) {
      console.error(e)
    }
    setSeeding(false)
  }

  function startEdit(master: MasterRider) {
    setEditing(master.artist)
    setEditItems(master.items.map(i => ({ ...i, masterId: master.id })))
    setDirty(false)
  }

  function cancelEdit() {
    setEditing(null)
    setEditItems([])
    setDirty(false)
  }

  function updateEditItem(id: string, field: string, value: string) {
    setEditItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
    setDirty(true)
  }

  function removeEditItem(id: string) {
    setEditItems(prev => prev.filter(i => i.id !== id))
    setDirty(true)
  }

  function addNewItem(masterId: string, category: string) {
    const tempId = `new-${Date.now()}`
    const maxOrder = Math.max(0, ...editItems.filter(i => i.category === category).map(i => i.sortOrder))
    setEditItems(prev => [...prev, {
      id: tempId, masterId, category, name: '', quantity: '', notes: '', sortOrder: maxOrder + 1
    }])
    setDirty(true)
  }

  async function saveEdits(master: MasterRider) {
    setSaving(true)
    try {
      const original = master.items
      const originalIds = new Set(original.map(i => i.id))
      const editIds = new Set(editItems.filter(i => !i.id.startsWith('new-')).map(i => i.id))

      // Delete removed items
      for (const id of originalIds) {
        if (!editIds.has(id)) await deleteMasterItem(id)
      }

      // Add new items
      for (const item of editItems) {
        if (item.id.startsWith('new-')) {
          if (item.name.trim()) {
            await addMasterItem(master.id, {
              category: item.category,
              name: item.name,
              quantity: item.quantity,
              notes: item.notes,
            }, item.sortOrder)
          }
        } else {
          // Update existing
          const orig = original.find(i => i.id === item.id)
          if (orig && (orig.name !== item.name || orig.quantity !== item.quantity || orig.notes !== item.notes || orig.category !== item.category)) {
            await updateMasterItem(item.id, { name: item.name, quantity: item.quantity, notes: item.notes, category: item.category })
          }
        }
      }

      const newVer = nextVersion(master.version)
      await bumpMasterVersion(master.id, newVer)
      await load()
      setEditing(null)
      setDirty(false)
    } catch (e) {
      console.error(e)
    }
    setSaving(false)
  }

  // Build display list: Supabase data OR fallback from templates
  const displayList: Array<{ artist: string; version: string; id: string; items: LocalItem[]; updatedAt: string }> =
    isConfigured
      ? masters.map(m => ({ artist: m.artist, version: m.version, id: m.id, items: m.items as LocalItem[], updatedAt: m.updatedAt }))
      : ARTIST_ROSTER
          .filter(a => RIDER_TEMPLATES[a])
          .map(a => ({
            artist: a,
            version: '1.0',
            id: a,
            updatedAt: '',
            items: RIDER_TEMPLATES[a].map((t, idx) => ({
              id: `${a}-${idx}`,
              masterId: a,
              category: t.category,
              name: t.name,
              quantity: t.quantity,
              notes: t.notes,
              sortOrder: idx,
            })),
          }))

  const needsSeed = isConfigured && !loading && masters.length === 0

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-5 py-4">
          <button onClick={() => router.push('/')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-3 transition-colors">
            <ArrowLeft size={15} /> Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen size={20} className="text-gray-400" />
              <div>
                <h1 className="text-xl font-black text-gray-900">Rider Library</h1>
                <p className="text-xs text-gray-500">Master riders per artist — templates for every show</p>
              </div>
            </div>
            {isConfigured && (
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-40"
              >
                {seeding ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                {seeding ? 'Syncing…' : 'Sync from Templates'}
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 py-8 space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        )}

        {needsSeed && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
            <BookOpen size={32} className="text-amber-400 mx-auto mb-3" />
            <h2 className="font-bold text-gray-900 mb-1">No master riders found</h2>
            <p className="text-sm text-gray-500 mb-4">Click below to load all riders from the built-in templates.</p>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="bg-gray-900 text-white text-sm font-bold px-6 py-3 rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-40 flex items-center gap-2 mx-auto"
            >
              {seeding ? <><Loader2 size={14} className="animate-spin" /> Seeding…</> : 'Load All Riders'}
            </button>
          </div>
        )}

        {!loading && displayList.map(master => {
          const isOpen = expanded === master.artist
          const isEditing = editing === master.artist
          const grouped = groupByCategory(isEditing ? editItems : master.items)
          const totalItems = (isEditing ? editItems : master.items).length
          const categories = Object.keys(grouped)

          return (
            <div key={master.artist} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {/* Artist header row */}
              <div className="px-5 py-4 flex items-center justify-between gap-3">
                <button
                  className="flex-1 flex items-center gap-3 text-left"
                  onClick={() => !isEditing && setExpanded(isOpen ? null : master.artist)}
                >
                  <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-black shrink-0">
                    {master.artist.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-gray-900">{master.artist}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">v{master.version}</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {totalItems} items · {categories.length} categories
                      {master.updatedAt ? ` · Updated ${new Date(master.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                    </p>
                  </div>
                </button>

                <div className="flex items-center gap-2 shrink-0">
                  {!isEditing && isConfigured && (
                    <button
                      onClick={() => { setExpanded(master.artist); startEdit(masters.find(m => m.artist === master.artist)!) }}
                      className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <Edit3 size={13} /> Edit
                    </button>
                  )}
                  {!isEditing && (
                    <button onClick={() => setExpanded(isOpen ? null : master.artist)} className="text-gray-400 hover:text-gray-700 p-1">
                      {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded items view / edit */}
              {(isOpen || isEditing) && (
                <div className="border-t border-gray-100">
                  {/* Edit mode toolbar */}
                  {isEditing && (
                    <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-amber-700">Editing — changes will save as v{nextVersion(master.version)}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={cancelEdit}
                          className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                        >
                          <X size={13} /> Cancel
                        </button>
                        <button
                          onClick={() => saveEdits(masters.find(m => m.artist === master.artist)!)}
                          disabled={saving || !dirty}
                          className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition-colors disabled:opacity-40"
                        >
                          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                          {saving ? 'Saving…' : `Save v${nextVersion(master.version)}`}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Categories */}
                  <div className="divide-y divide-gray-100">
                    {categories.map(cat => (
                      <div key={cat}>
                        <div className="px-5 py-2.5 bg-gray-50 flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">{cat}</span>
                          {isEditing && (
                            <button
                              onClick={() => addNewItem(master.id, cat)}
                              className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
                            >
                              <Plus size={12} /> Add item
                            </button>
                          )}
                        </div>
                        <div className="divide-y divide-gray-50">
                          {grouped[cat].map(item => (
                            <div key={item.id} className="px-5 py-3">
                              {isEditing ? (
                                <div className="flex gap-2 items-start">
                                  <div className="flex-1 grid grid-cols-[1fr_120px_1fr] gap-2">
                                    <input
                                      value={item.name}
                                      onChange={e => updateEditItem(item.id, 'name', e.target.value)}
                                      placeholder="Item name"
                                      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900"
                                    />
                                    <input
                                      value={item.quantity}
                                      onChange={e => updateEditItem(item.id, 'quantity', e.target.value)}
                                      placeholder="Qty"
                                      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900"
                                    />
                                    <input
                                      value={item.notes}
                                      onChange={e => updateEditItem(item.id, 'notes', e.target.value)}
                                      placeholder="Notes (optional)"
                                      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900"
                                    />
                                  </div>
                                  <button
                                    onClick={() => removeEditItem(item.id)}
                                    className="text-gray-300 hover:text-red-500 transition-colors p-1 mt-0.5"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <span className="text-sm font-medium text-gray-900">{item.name}</span>
                                    {item.notes && <span className="text-xs text-gray-400"> · {item.notes}</span>}
                                  </div>
                                  <span className="text-xs text-gray-400 shrink-0">{item.quantity}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Add new category in edit mode */}
                    {isEditing && (
                      <div className="px-5 py-4">
                        <AddCategoryRow masterId={master.id} onAdd={(category) => {
                          const tempId = `new-${Date.now()}`
                          setEditItems(prev => [...prev, { id: tempId, masterId: master.id, category, name: '', quantity: '', notes: '', sortOrder: 0 }])
                          setDirty(true)
                        }} />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {!loading && !isConfigured && (
          <div className="text-xs text-center text-gray-400 pt-4">
            Supabase not connected — showing read-only templates. Connect Supabase to enable editing.
          </div>
        )}
      </div>
    </div>
  )
}

function AddCategoryRow({ masterId, onAdd }: { masterId: string; onAdd: (cat: string) => void }) {
  const [value, setValue] = useState('')
  return (
    <div className="flex gap-2">
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="New category name…"
        className="flex-1 text-sm border border-dashed border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900"
      />
      <button
        onClick={() => { if (value.trim()) { onAdd(value.trim()); setValue('') } }}
        className="flex items-center gap-1 text-sm font-semibold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
      >
        <Plus size={13} /> Add Category
      </button>
    </div>
  )
}
