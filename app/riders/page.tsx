'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, ChevronDown, ChevronUp, Edit3, Check, X,
  Plus, Trash2, Save, Loader2, BookOpen, Download, Upload, FileText, Sparkles, UserPlus, Phone, Mail, Users, ImagePlus,
} from 'lucide-react'
import {
  ARTIST_ROSTER, OFFICIAL_RIDER_PDFS, type MasterRider, type MasterRiderItem,
} from '@/lib/data'
import {
  getRiderMasters, addMasterItem,
  updateMasterItem, deleteMasterItem, bumpMasterVersion, saveMasterPdfUrl,
  getAllManagementContacts, addManagementContact, updateManagementContact, deleteManagementContact,
  type ManagementContact,
  getCommunityPhotos, updateCommunityPhoto, deleteCommunityPhoto, type CommunityPhoto,
} from '@/lib/db'
import { getWorkspaceId } from '@/lib/workspace'
import { supabase } from '@/lib/supabase'
import { PDFDocument } from 'pdf-lib'
import { isConfigured } from '@/lib/supabase'
import ArtistAvatar from '@/app/components/ArtistAvatar'
import ProductImage from '@/app/components/ProductImage'

type LocalItem = { id: string; category: string; name: string; quantity: string; notes: string; sortOrder: number; masterId: string; imageUrl?: string }

function nextVersion(v: string) {
  const [major, minor] = v.split('.').map(Number)
  return `${major}.${(minor ?? 0) + 1}`
}

const CATEGORY_ORDER = [
  'Dressing Room',
  'Food',
  'Beverages',
  'Production Office',
  'Dancers Room',
  'Band Room',
  'Essentials',
  'Dinner',
  'Security',
  'Venue',
  'Production',
  'Transportation',
  'Hotel',
  'Other',
]

function sortCategories(cats: string[]): string[] {
  return [...cats].sort((a, b) => {
    const ai = CATEGORY_ORDER.findIndex(c => c.toLowerCase() === a.toLowerCase())
    const bi = CATEGORY_ORDER.findIndex(c => c.toLowerCase() === b.toLowerCase())
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
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
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [editItems, setEditItems] = useState<LocalItem[]>([])
  const [uploadingItemImageId, setUploadingItemImageId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [uploadingPdf, setUploadingPdf] = useState<string | null>(null)
  const [extractingPdf, setExtractingPdf] = useState<string | null>(null)
  const [extractResults, setExtractResults] = useState<Record<string, string>>({})
  const [pdfUrls, setPdfUrls] = useState<Record<string, string>>({})
  const [mgmtByArtist, setMgmtByArtist] = useState<Record<string, ManagementContact[]>>({})
  const [mgmtOpen, setMgmtOpen] = useState<string | null>(null)
  const [editingContact, setEditingContact] = useState<string | null>(null)
  const [contactDraft, setContactDraft] = useState<Partial<ManagementContact>>({})
  const [addingContact, setAddingContact] = useState<string | null>(null)
  const [newContact, setNewContact] = useState({ name: '', email: '', phone: '', role: 'Management' })
  const [savingContact, setSavingContact] = useState(false)
  const [workspaceId, setWsId] = useState('default')
  // Photo upload state
  const [photoOpen, setPhotoOpen] = useState(false)
  const [photoKeyword, setPhotoKeyword] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoResult, setPhotoResult] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [communityPhotos, setCommunityPhotos] = useState<CommunityPhoto[]>([])
  const [loadingCommunityPhotos, setLoadingCommunityPhotos] = useState(false)
  const [editingCommunityId, setEditingCommunityId] = useState<string | null>(null)
  const [editCommunityKeyword, setEditCommunityKeyword] = useState('')

  const load = useCallback(async (wsId: string) => {
    if (!isConfigured) { setLoading(false); return }
    try {
      const data = await getRiderMasters(wsId)
      setMasters(data)
      const urls: Record<string, string> = {}
      for (const m of data) { if (m.pdfUrl) urls[m.id] = m.pdfUrl }
      setPdfUrls(urls)
    } catch {}
    try {
      const all = await getAllManagementContacts(wsId)
      setMgmtByArtist(all)
    } catch (e) { console.error('mgmt load:', e) }
    setLoading(false)
  }, [])

  async function handleSaveNewContact(artist: string) {
    if (!newContact.name.trim() && !newContact.email.trim()) return
    setSavingContact(true)
    try {
      const existing = mgmtByArtist[artist] ?? []
      const c = await addManagementContact(artist, { name: newContact.name, email: newContact.email, phone: newContact.phone, role: newContact.role || 'Management' }, existing.length, workspaceId)
      setMgmtByArtist(prev => ({ ...prev, [artist]: [...(prev[artist] ?? []), c] }))
      setNewContact({ name: '', email: '', phone: '', role: 'Management' })
      setAddingContact(null)
    } catch (e) { console.error('addContact:', e) }
    setSavingContact(false)
  }

  async function handleUploadItemImage(itemId: string, file: File) {
    setUploadingItemImageId(itemId)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path = `item-overrides/${itemId}-${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('rider-photos')
        .upload(path, file, { contentType: file.type, upsert: true })
      if (uploadErr) throw uploadErr
      const { data: urlData } = supabase.storage.from('rider-photos').getPublicUrl(path)
      await updateMasterItem(itemId, { imageUrl: urlData.publicUrl })
      setEditItems(prev => prev.map(i => i.id === itemId ? { ...i, imageUrl: urlData.publicUrl } : i))
      await load(workspaceId)
    } catch { /* leave existing image in place on failure */ }
    setUploadingItemImageId(null)
  }

  async function loadCommunityPhotoList() {
    setLoadingCommunityPhotos(true)
    try {
      const photos = await getCommunityPhotos(workspaceId)
      setCommunityPhotos(photos)
    } catch { /* keep prior list on failure */ }
    setLoadingCommunityPhotos(false)
  }

  async function handleSaveCommunityKeyword(id: string) {
    const keyword = editCommunityKeyword.trim().toLowerCase()
    if (!keyword) return
    setCommunityPhotos(prev => prev.map(p => p.id === id ? { ...p, keyword } : p))
    setEditingCommunityId(null)
    try { await updateCommunityPhoto(id, keyword) } catch {}
  }

  async function handleDeleteCommunityPhoto(id: string) {
    setCommunityPhotos(prev => prev.filter(p => p.id !== id))
    try { await deleteCommunityPhoto(id) } catch {}
  }

  async function handleUploadPhoto() {
    if (!photoFile || !photoKeyword.trim()) return
    setUploadingPhoto(true)
    setPhotoResult(null)
    try {
      const form = new FormData()
      form.append('file', photoFile)
      form.append('keyword', photoKeyword.trim().toLowerCase())
      form.append('workspaceId', workspaceId)
      const res = await fetch('/api/upload-photo', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      setPhotoResult('✓ Photo added to community library')
      setPhotoKeyword('')
      setPhotoFile(null)
      await loadCommunityPhotoList()
    } catch (e: any) {
      setPhotoResult('✕ ' + e.message)
    }
    setUploadingPhoto(false)
  }

  async function handleUpdateContact(id: string, artist: string) {
    setSavingContact(true)
    try {
      await updateManagementContact(id, contactDraft)
      setMgmtByArtist(prev => ({
        ...prev,
        [artist]: (prev[artist] ?? []).map(c => c.id === id ? { ...c, ...contactDraft } : c),
      }))
      setEditingContact(null)
      setContactDraft({})
    } catch (e) { console.error('updateContact:', e) }
    setSavingContact(false)
  }

  async function handleDeleteContact(id: string, artist: string) {
    await deleteManagementContact(id)
    setMgmtByArtist(prev => ({ ...prev, [artist]: (prev[artist] ?? []).filter(c => c.id !== id) }))
  }

  async function handlePdfUpload(master: MasterRider, files: FileList | File[]) {
    const pdfs = Array.from(files).filter(f => f.type.includes('pdf'))
    if (!pdfs.length) return
    setUploadingPdf(master.id)
    try {
      let uploadFile: File

      if (pdfs.length === 1) {
        uploadFile = pdfs[0]
      } else {
        // Merge multiple PDFs into one using pdf-lib
        const merged = await PDFDocument.create()
        for (const pdf of pdfs) {
          const bytes = await pdf.arrayBuffer()
          const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
          const pages = await merged.copyPages(doc, doc.getPageIndices())
          pages.forEach(p => merged.addPage(p))
        }
        const mergedBytes = await merged.save()
        uploadFile = new File([new Uint8Array(mergedBytes)], 'merged-rider.pdf', { type: 'application/pdf' })
      }

      const slug = master.artist.toLowerCase().replace(/[^a-z0-9]/g, '-')
      const path = `official/${slug}/${Date.now()}-rider.pdf`
      const { error } = await supabase.storage.from('rider-pdfs').upload(path, uploadFile, { contentType: 'application/pdf', upsert: true })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('rider-pdfs').getPublicUrl(path)
      await saveMasterPdfUrl(master.id, publicUrl)
      setPdfUrls(prev => ({ ...prev, [master.id]: publicUrl }))
    } catch (e) { console.error(e) }
    setUploadingPdf(null)
  }

  async function handlePdfDelete(master: MasterRider) {
    await saveMasterPdfUrl(master.id, null)
    setPdfUrls(prev => { const n = { ...prev }; delete n[master.id]; return n })
  }

  async function handleExtract(master: MasterRider) {
    setExtractingPdf(master.id)
    setExtractResults(prev => ({ ...prev, [master.id]: '' }))
    try {
      const res = await fetch(`/api/extract-master/${master.id}`, { method: 'POST' })
      let data: any
      try { data = await res.json() } catch { throw new Error('Server error — try again or check PDF size') }
      if (!res.ok) throw new Error(data.error ?? 'Extraction failed')
      setExtractResults(prev => ({ ...prev, [master.id]: `✓ Extracted ${data.extracted} items — saved as v${data.version}` }))
      await load(workspaceId)
    } catch (e: any) {
      setExtractResults(prev => ({ ...prev, [master.id]: `✕ ${e.message}` }))
    }
    setExtractingPdf(null)
  }

  useEffect(() => {
    const wsId = getWorkspaceId() ?? 'default'
    setWsId(wsId)
    load(wsId)
  }, [load])

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
      await load(workspaceId)
      setEditing(null)
      setDirty(false)
    } catch (e) {
      console.error(e)
    }
    setSaving(false)
  }

  const displayList = masters.map(m => ({ artist: m.artist, version: m.version, id: m.id, items: m.items as LocalItem[], updatedAt: m.updatedAt }))

  return (
    <div className="min-h-screen bg-transparent">
      <header className="bg-white border-b border-amber-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-5 py-4">
          <button onClick={() => router.push('/')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-white mb-3 transition-colors">
            <ArrowLeft size={15} /> Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen size={20} className="text-amber-500" />
              <div>
                <h1 className="text-xl font-black text-gray-900">Rider Library</h1>
                <p className="text-xs text-gray-500">Master riders per artist — templates for every show</p>
              </div>
            </div>
            <button onClick={() => { setPhotoOpen(true); setPhotoResult(null); loadCommunityPhotoList() }}
              className="flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border border-amber-200 transition-all">
              <ImagePlus size={14} /> Add Photo
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 py-8 space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        )}


        {!loading && displayList.map(master => {
          const isOpen = expanded === master.artist
          const isEditing = editing === master.artist
          const grouped = groupByCategory(isEditing ? editItems : master.items)
          const totalItems = (isEditing ? editItems : master.items).length
          const categories = sortCategories(Object.keys(grouped))

          const pdfUrl = pdfUrls[master.id] || OFFICIAL_RIDER_PDFS[master.artist]
          const isUploading = uploadingPdf === master.id
          const isExtracting = extractingPdf === master.id
          const extractResult = extractResults[master.id]

          return (
            <div key={master.artist} className="bg-white rounded-2xl border border-amber-200 overflow-hidden">
              {/* Artist header row */}
              <div className="px-5 py-4 flex items-center justify-between gap-3">
                <button
                  className="flex-1 flex items-center gap-3 text-left"
                  onClick={() => !isEditing && setExpanded(isOpen ? null : master.artist)}
                >
                  <ArtistAvatar artist={master.artist} size={104} rounded="rounded-full" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-gray-900">{master.artist}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-gray-400">v{master.version}</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {totalItems} items · {categories.length} categories
                      {master.updatedAt ? ` · Updated ${new Date(master.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                    </p>
                  </div>
                </button>

                <div className="flex items-center gap-2 shrink-0">
                  {!isEditing && isConfigured && (
                    <button
                      onClick={() => { setExpanded(master.artist); startEdit(masters.find(m => m.artist === master.artist)!) }}
                      className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl border border-amber-400 text-amber-700 hover:bg-amber-50 transition-colors"
                    >
                      <Edit3 size={13} /> Edit
                    </button>
                  )}
                  {!isEditing && (
                    <button onClick={() => setExpanded(isOpen ? null : master.artist)} className="text-gray-500 hover:text-gray-900 p-1">
                      {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  )}
                </div>
              </div>

              {/* Official PDF bar */}
              <div className="px-5 py-3 border-t border-amber-100 bg-amber-50">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <FileText size={15} className="text-amber-600 shrink-0" />
                    <span className="text-xs font-bold text-gray-700">Official Rider PDF</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {pdfUrl ? (
                      <>
                        <a
                          href={pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-950 transition-colors shadow-sm"
                        >
                          <Download size={12} /> Download
                        </a>
                        {isConfigured && (
                          <button
                            onClick={() => handleExtract(master)}
                            disabled={isExtracting}
                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
                          >
                            {isExtracting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                            {isExtracting ? 'Reading PDF…' : 'Extract Items'}
                          </button>
                        )}
                        {isConfigured && (
                          <button
                            onClick={() => handlePdfDelete(master)}
                            className="text-xs text-red-400 hover:text-red-600 font-semibold transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-gray-400 italic">No PDF uploaded yet</span>
                    )}
                    {isConfigured && (
                      <label className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border border-amber-400 text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                        {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                        {isUploading ? 'Uploading…' : pdfUrl ? 'Replace PDF' : 'Upload PDF(s)'}
                        <input type="file" accept="application/pdf" multiple className="hidden" onChange={e => { if (e.target.files?.length) handlePdfUpload(master, e.target.files); e.target.value = '' }} />
                      </label>
                    )}
                  </div>
                </div>
                {extractResult && (
                  <p className={`text-xs font-bold mt-2 ${extractResult.startsWith('✓') ? 'text-emerald-600' : 'text-red-500'}`}>{extractResult}</p>
                )}
              </div>

              {/* Expanded items view / edit */}
              {(isOpen || isEditing) && (
                <div className="border-t border-amber-200">
                  {/* Edit mode toolbar */}
                  {isEditing && (
                    <div className="px-5 py-3 bg-amber-900/30 border-b border-amber-800 flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-amber-400">Editing — changes will save as v{nextVersion(master.version)}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={cancelEdit}
                          className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <X size={13} /> Cancel
                        </button>
                        <button
                          onClick={() => saveEdits(masters.find(m => m.artist === master.artist)!)}
                          disabled={saving || !dirty}
                          className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-950 transition-colors disabled:opacity-40"
                        >
                          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                          {saving ? 'Saving…' : `Save v${nextVersion(master.version)}`}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Categories */}
                  <div className="divide-y divide-gray-800">
                    {categories.map(cat => (
                      <div key={cat}>
                        <div className="px-5 py-2.5 bg-amber-50 flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">{cat}</span>
                          {isEditing && (
                            <button
                              onClick={() => addNewItem(master.id, cat)}
                              className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-white transition-colors"
                            >
                              <Plus size={12} /> Add item
                            </button>
                          )}
                        </div>
                        <div className="divide-y divide-gray-800/50">
                          {grouped[cat].map(item => (
                            <div key={item.id} className="px-5 py-3">
                              {isEditing ? (
                                <div className="flex gap-2 items-start">
                                  <label className="relative shrink-0 cursor-pointer group/img" title="Set a photo for this item">
                                    <ProductImage name={item.name} category={item.category} imageUrl={item.imageUrl} size={44} />
                                    <div className="absolute inset-0 rounded-xl bg-black/0 group-hover/img:bg-black/40 transition-colors flex items-center justify-center">
                                      {uploadingItemImageId === item.id
                                        ? <Loader2 size={14} className="animate-spin text-white" />
                                        : <ImagePlus size={14} className="text-white opacity-0 group-hover/img:opacity-100 transition-opacity" />}
                                    </div>
                                    <input type="file" accept="image/*" className="hidden"
                                      onChange={e => { if (e.target.files?.[0]) handleUploadItemImage(item.id, e.target.files[0]); e.target.value = '' }} />
                                  </label>
                                  <div className="flex-1 grid grid-cols-[1fr_120px_1fr] gap-2">
                                    <input
                                      value={item.name}
                                      onChange={e => updateEditItem(item.id, 'name', e.target.value)}
                                      placeholder="Item name"
                                      className="text-sm bg-amber-50 border border-amber-200 text-gray-900 placeholder-slate-400 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    />
                                    <input
                                      value={item.quantity}
                                      onChange={e => updateEditItem(item.id, 'quantity', e.target.value)}
                                      placeholder="Qty"
                                      className="text-sm bg-amber-50 border border-amber-200 text-gray-900 placeholder-slate-400 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    />
                                    <input
                                      value={item.notes}
                                      onChange={e => updateEditItem(item.id, 'notes', e.target.value)}
                                      placeholder="Notes (optional)"
                                      className="text-sm bg-amber-50 border border-amber-200 text-gray-900 placeholder-slate-400 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    />
                                  </div>
                                  <button
                                    onClick={() => removeEditItem(item.id)}
                                    className="text-gray-600 hover:text-red-400 transition-colors p-1 mt-0.5"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3">
                                    <ProductImage name={item.name} category={item.category} imageUrl={item.imageUrl} size={36} />
                                    <div>
                                      <span className="text-sm font-medium text-gray-900">{item.name}</span>
                                      {item.notes && <span className="text-xs text-gray-400"> · {item.notes}</span>}
                                    </div>
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

              {/* Management Contacts section */}
              {isOpen && (
                <div className="border-t border-amber-100 px-5 py-3">
                  <button
                    onClick={() => setMgmtOpen(mgmtOpen === master.artist ? null : master.artist)}
                    className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors w-full"
                  >
                    <Users size={12} />
                    Management Contacts
                    <span className="ml-1 bg-amber-100 text-amber-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
                      {(mgmtByArtist[master.artist] ?? []).length}
                    </span>
                    {mgmtOpen === master.artist ? <ChevronUp size={12} className="ml-auto" /> : <ChevronDown size={12} className="ml-auto" />}
                  </button>

                  {mgmtOpen === master.artist && (
                    <div className="mt-3 space-y-2">
                      {(mgmtByArtist[master.artist] ?? []).map(c => (
                        <div key={c.id} className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                          {editingContact === c.id ? (
                            <div className="space-y-2">
                              <input value={contactDraft.name ?? c.name} onChange={e => setContactDraft(d => ({ ...d, name: e.target.value }))}
                                placeholder="Name" className="w-full text-sm border border-amber-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400" />
                              <input value={contactDraft.role ?? c.role} onChange={e => setContactDraft(d => ({ ...d, role: e.target.value }))}
                                placeholder="Role" className="w-full text-sm border border-amber-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400" />
                              <input value={contactDraft.email ?? c.email} onChange={e => setContactDraft(d => ({ ...d, email: e.target.value }))}
                                placeholder="Email" type="email" className="w-full text-sm border border-amber-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400" />
                              <input value={contactDraft.phone ?? c.phone} onChange={e => setContactDraft(d => ({ ...d, phone: e.target.value }))}
                                placeholder="Phone" className="w-full text-sm border border-amber-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400" />
                              <div className="flex gap-2 pt-1">
                                <button onClick={() => handleUpdateContact(c.id, master.artist)} disabled={savingContact}
                                  className="flex items-center gap-1 text-xs font-bold bg-amber-500 text-white px-3 py-1.5 rounded-lg disabled:opacity-50">
                                  {savingContact ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Save
                                </button>
                                <button onClick={() => { setEditingContact(null); setContactDraft({}) }}
                                  className="text-xs font-bold text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg border border-gray-200">
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-gray-900 truncate">{c.name}</p>
                                <p className="text-xs text-amber-600 font-semibold">{c.role}</p>
                                {c.email && <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Mail size={10} />{c.email}</p>}
                                {c.phone && <p className="text-xs text-gray-500 flex items-center gap-1"><Phone size={10} />{c.phone}</p>}
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <button onClick={() => { setEditingContact(c.id); setContactDraft({}) }}
                                  className="p-1.5 rounded-lg hover:bg-amber-200 text-gray-400 hover:text-gray-700 transition-colors">
                                  <Edit3 size={12} />
                                </button>
                                <button onClick={() => handleDeleteContact(c.id, master.artist)}
                                  className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {addingContact === master.artist ? (
                        <div className="bg-white border-2 border-amber-300 rounded-xl p-3 space-y-2">
                          <input value={newContact.name} onChange={e => setNewContact(d => ({ ...d, name: e.target.value }))}
                            placeholder="Full name *" className="w-full text-sm border border-amber-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400" />
                          <input value={newContact.role} onChange={e => setNewContact(d => ({ ...d, role: e.target.value }))}
                            placeholder="Role (e.g. Management, Agent)" className="w-full text-sm border border-amber-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400" />
                          <input value={newContact.email} onChange={e => setNewContact(d => ({ ...d, email: e.target.value }))}
                            placeholder="Email" type="email" className="w-full text-sm border border-amber-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400" />
                          <input value={newContact.phone} onChange={e => setNewContact(d => ({ ...d, phone: e.target.value }))}
                            placeholder="Phone" className="w-full text-sm border border-amber-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400" />
                          <div className="flex gap-2 pt-1">
                            <button onClick={() => handleSaveNewContact(master.artist)} disabled={savingContact || !newContact.name.trim()}
                              className="flex items-center gap-1 text-xs font-bold bg-amber-500 text-white px-3 py-1.5 rounded-lg disabled:opacity-50">
                              {savingContact ? <Loader2 size={11} className="animate-spin" /> : <UserPlus size={11} />} Add Contact
                            </button>
                            <button onClick={() => { setAddingContact(null); setNewContact({ name: '', email: '', phone: '', role: 'Management' }) }}
                              className="text-xs font-bold text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg border border-gray-200">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setAddingContact(master.artist)}
                          className="flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-800 py-1 transition-colors">
                          <UserPlus size={12} /> Add Contact
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {!loading && !isConfigured && (
          <div className="text-xs text-center text-gray-600 pt-4">
            Supabase not connected — showing read-only templates. Connect Supabase to enable editing.
          </div>
        )}
      </div>

      {/* Photo upload modal */}
      {photoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-black text-gray-900">Add to Photo Library</h3>
                <p className="text-xs text-gray-500 mt-0.5">Available to everyone in the community</p>
              </div>
              <button onClick={() => setPhotoOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            {(loadingCommunityPhotos || communityPhotos.length > 0) && (
              <div className="mb-4 max-h-48 overflow-y-auto space-y-1.5 border border-gray-100 rounded-xl p-2">
                {loadingCommunityPhotos && communityPhotos.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2">Loading…</p>
                )}
                {communityPhotos.map(photo => (
                  <div key={photo.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1.5">
                    <img src={photo.url} alt="" className="w-8 h-8 rounded-md object-cover shrink-0" />
                    {editingCommunityId === photo.id ? (
                      <input
                        value={editCommunityKeyword}
                        onChange={e => setEditCommunityKeyword(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveCommunityKeyword(photo.id); if (e.key === 'Escape') setEditingCommunityId(null) }}
                        onBlur={() => handleSaveCommunityKeyword(photo.id)}
                        autoFocus
                        className="flex-1 text-xs bg-white border border-amber-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    ) : (
                      <button
                        onClick={() => { setEditingCommunityId(photo.id); setEditCommunityKeyword(photo.keyword) }}
                        className="flex-1 text-left text-xs font-semibold text-gray-700 hover:text-amber-700 transition-colors truncate"
                      >
                        {photo.keyword}
                      </button>
                    )}
                    <button onClick={() => { setEditingCommunityId(photo.id); setEditCommunityKeyword(photo.keyword) }}
                      className="p-1 rounded text-gray-300 hover:text-gray-600 transition-colors shrink-0">
                      <Edit3 size={11} />
                    </button>
                    <button onClick={() => handleDeleteCommunityPhoto(photo.id)}
                      className="p-1 rounded text-gray-300 hover:text-red-500 transition-colors shrink-0">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                  What is this a photo of? <span className="text-amber-500">*</span>
                </label>
                <input
                  value={photoKeyword}
                  onChange={e => setPhotoKeyword(e.target.value)}
                  placeholder="e.g. sparkling water, protein bar, gaming chair"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400 transition-all"
                />
                <p className="text-xs text-gray-400 mt-1">This becomes the keyword that matches rider items</p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Photo <span className="text-amber-500">*</span>
                </label>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => setPhotoFile(e.target.files?.[0] ?? null)}
                />
                <button
                  onClick={() => photoInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-200 hover:border-amber-400 rounded-xl py-4 text-center transition-colors group"
                >
                  {photoFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-8 h-8 rounded-lg overflow-hidden">
                        <img src={URL.createObjectURL(photoFile)} className="w-full h-full object-cover" alt="" />
                      </div>
                      <span className="text-sm text-gray-700 font-medium truncate max-w-40">{photoFile.name}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <ImagePlus size={20} className="text-gray-300 group-hover:text-amber-500 transition-colors" />
                      <span className="text-xs text-gray-400">Click to choose photo</span>
                    </div>
                  )}
                </button>
              </div>

              {photoResult && (
                <p className={`text-xs font-medium ${photoResult.startsWith('✓') ? 'text-emerald-600' : 'text-red-500'}`}>
                  {photoResult}
                </p>
              )}

              <button
                onClick={handleUploadPhoto}
                disabled={uploadingPhoto || !photoFile || !photoKeyword.trim()}
                className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-gray-950 font-black text-sm py-3 rounded-xl transition-all"
              >
                {uploadingPhoto ? <Loader2 size={15} className="animate-spin" /> : <><Upload size={15} /> Upload to Library</>}
              </button>
            </div>
          </div>
        </div>
      )}
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
        className="flex-1 text-sm bg-amber-50 border border-dashed border-amber-200 text-gray-900 placeholder-slate-400 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
      />
      <button
        onClick={() => { if (value.trim()) { onAdd(value.trim()); setValue('') } }}
        className="flex items-center gap-1 text-sm font-semibold px-3 py-1.5 rounded-lg border border-amber-400 text-amber-700 hover:bg-amber-50 transition-colors"
      >
        <Plus size={13} /> Add Category
      </button>
    </div>
  )
}
