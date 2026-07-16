import { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────
interface BriefItem {
  source: string
  title: string
  why: string
  action: string
  link?: string | null
  urgency: 'high' | 'medium' | 'low'
}

interface BriefData {
  updated: string
  items: BriefItem[]
}

type UrgencyFilter = 'all' | 'high' | 'medium' | 'low'

// ─── Helpers ──────────────────────────────────────────────────
const ACCENT: Record<string, string> = {
  high:   '#ff6b7a',
  medium: '#ffbf5b',
  low:    '#4ddea8',
}
const SOURCE_EMOJI: Record<string, string> = {
  Slack: '💬', Jira: '🔷', Email: '📧', GitHub: '🐙',
}

// ─── Sub-components ───────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton sk-sm" />
      <div className="skeleton sk-md" />
      <div className="skeleton sk-lg" />
      <div className="skeleton sk-xs" />
    </div>
  )
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const icons: Record<string, string> = { high: '🔴', medium: '🟡', low: '🟢' }
  return (
    <span className={`urgency-badge ${urgency}`}>
      {icons[urgency] ?? '⚪'} {urgency}
    </span>
  )
}

function BriefCard({ item, index }: { item: BriefItem; index: number }) {
  const accent = ACCENT[item.urgency] ?? ACCENT.medium
  const emoji  = SOURCE_EMOJI[item.source] ?? '📋'
  return (
    <article
      className="card"
      style={{
        '--card-accent': accent,
        animationDelay: `${index * 60}ms`,
      } as React.CSSProperties}
    >
      <div className="card-header">
        <div className="card-source">
          <span className="source-dot" />
          {emoji} {item.source}
        </div>
        <UrgencyBadge urgency={item.urgency} />
      </div>

      <h2 className="card-title">{item.title}</h2>
      <p className="card-why">{item.why}</p>

      <div className="card-action">
        <span className="action-label">Next</span>
        <div>
          {item.action}
          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="card-link"
            >
              Open ↗
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

// ─── Add Item Modal ───────────────────────────────────────────
interface AddItemModalProps {
  onClose: () => void
  onAdd: (item: BriefItem) => void
}

function AddItemModal({ onClose, onAdd }: AddItemModalProps) {
  const [form, setForm] = useState<BriefItem>({
    source: 'Slack',
    title: '',
    why: '',
    action: '',
    link: '',
    urgency: 'medium',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (field: keyof BriefItem) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.why.trim() || !form.action.trim()) {
      setError('Title, why, and action are required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const body = { ...form, link: form.link || null }
      const res  = await fetch('/api/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('API error')
      const created: BriefItem = await res.json()
      onAdd(created)
    } catch {
      setError('Failed to add item. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Add Brief Item</h2>
          <button id="modal-close-btn" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Source</label>
              <select className="form-select" value={form.source} onChange={set('source')}>
                {['Slack', 'Jira', 'Email', 'GitHub'].map(s => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Urgency</label>
              <select className="form-select" value={form.urgency} onChange={set('urgency')}>
                <option value="high">🔴 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Title</label>
            <input id="item-title" className="form-input" placeholder="What's the issue?" value={form.title} onChange={set('title')} />
          </div>

          <div className="form-group">
            <label className="form-label">Why It Matters</label>
            <textarea id="item-why" className="form-textarea" placeholder="Describe the impact or context…" value={form.why} onChange={set('why')} />
          </div>

          <div className="form-group">
            <label className="form-label">Next Action</label>
            <textarea id="item-action" className="form-textarea" placeholder="What needs to happen?" value={form.action} onChange={set('action')} rows={2} />
          </div>

          <div className="form-group">
            <label className="form-label">Link (optional)</label>
            <input id="item-link" className="form-input" placeholder="https://…" value={form.link ?? ''} onChange={set('link')} />
          </div>

          {error && <p style={{ color: '#ff6b7a', fontSize: '0.85rem' }}>{error}</p>}

          <div className="form-actions">
            <button type="button" id="cancel-btn" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" id="submit-item-btn" className="btn btn-primary" disabled={loading}>
              {loading ? '⏳ Saving…' : '✦ Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────
export default function App() {
  const [data, setData]           = useState<BriefData | null>(null)
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefresh]  = useState(false)
  const [search, setSearch]       = useState('')
  const [urgency, setUrgency]     = useState<UrgencyFilter>('all')
  const [source, setSource]       = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [error, setError]         = useState(false)

  // Fetch brief from API
  const fetchBrief = useCallback(async (endpoint = '/api/brief', method = 'GET') => {
    try {
      const res = await fetch(endpoint, { method, cache: 'no-store' })
      if (!res.ok) throw new Error()
      const json: BriefData = await res.json()
      setData(json)
      setError(false)
    } catch {
      setError(true)
    }
  }, [])

  useEffect(() => {
    fetchBrief().finally(() => setLoading(false))
  }, [fetchBrief])

  const handleRefresh = async () => {
    setRefresh(true)
    await fetchBrief('/api/brief/refresh', 'POST')
    setRefresh(false)
  }

  const handleAdd = (item: BriefItem) => {
    setData(prev => prev
      ? { ...prev, items: [item, ...prev.items] }
      : { updated: new Date().toLocaleString(), items: [item] }
    )
    setShowModal(false)
  }

  // Derived sources for filter
  const allSources = [...new Set(data?.items.map(i => i.source) ?? [])]

  // Filtered items
  const filtered = (data?.items ?? []).filter(item => {
    const matchesUrgency = urgency === 'all' || item.urgency === urgency
    const matchesSource  = source  === 'all' || item.source  === source
    const matchesSearch  = !search.trim() ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.why.toLowerCase().includes(search.toLowerCase()) ||
      item.action.toLowerCase().includes(search.toLowerCase())
    return matchesUrgency && matchesSource && matchesSearch
  })

  return (
    <div className="app">
      {/* Animated background orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="container">
        {/* ─── Header ─── */}
        <header className="header">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            Your daily signal
          </div>
          <h1 className="title">Morning Brief</h1>
          <div className="subtitle">
            {loading ? (
              <span>Loading your priorities…</span>
            ) : error ? (
              <span style={{ color: '#ff6b7a' }}>⚠ Could not reach API — showing last cached data</span>
            ) : (
              <>
                <span>{filtered.length} item{filtered.length !== 1 ? 's' : ''} for your attention</span>
                {data?.updated && (
                  <span className="last-updated">🕐 {data.updated}</span>
                )}
              </>
            )}
          </div>
        </header>

        {/* ─── Controls ─── */}
        <div className="controls">
          <div className="search-wrapper">
            <span className="search-icon">🔍</span>
            <input
              id="search-input"
              className="search-input"
              placeholder="Search items…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            id="add-item-btn"
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
          >
            ✦ Add Item
          </button>
          <button
            id="refresh-btn"
            className={`btn btn-secondary ${refreshing ? 'spinning' : ''}`}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {refreshing ? 'Syncing…' : 'Sync'}
          </button>
        </div>

        {/* ─── Filters ─── */}
        <div className="filters">
          <span className="filter-label">Urgency:</span>
          {(['all', 'high', 'medium', 'low'] as UrgencyFilter[]).map(u => (
            <button
              key={u}
              id={`filter-urgency-${u}`}
              className={`pill ${u !== 'all' ? u : ''} ${urgency === u ? 'active' : ''}`}
              onClick={() => setUrgency(u)}
            >
              {u === 'all' ? 'All' : { high: '🔴', medium: '🟡', low: '🟢' }[u] + ' ' + u}
            </button>
          ))}

          {allSources.length > 0 && (
            <>
              <span className="filter-label" style={{ marginLeft: 8 }}>Source:</span>
              <button
                key="src-all"
                id="filter-source-all"
                className={`pill ${source === 'all' ? 'active' : ''}`}
                onClick={() => setSource('all')}
              >
                All
              </button>
              {allSources.map(s => (
                <button
                  key={s}
                  id={`filter-source-${s}`}
                  className={`pill ${source === s ? 'active' : ''}`}
                  onClick={() => setSource(s)}
                >
                  {SOURCE_EMOJI[s] ?? '📋'} {s}
                </button>
              ))}
            </>
          )}
        </div>

        {/* ─── Cards ─── */}
        <main id="items-grid" className="items-grid">
          {loading ? (
            [1, 2, 3].map(i => <SkeletonCard key={i} />)
          ) : filtered.length > 0 ? (
            filtered.map((item, idx) => (
              <BriefCard key={`${item.title}-${idx}`} item={item} index={idx} />
            ))
          ) : (
            <div className="card empty-state">
              <div className="empty-icon">🌅</div>
              <h3>No items match your filters</h3>
              <p>Try adjusting your search or filters, or hit Sync to pull the latest priorities.</p>
            </div>
          )}
        </main>

        {/* ─── Footer ─── */}
        <footer className="footer">
          <span>Morning Brief</span>
          <span>·</span>
          <span>Powered by Slack, Jira &amp; Email</span>
          <span>·</span>
          <a href="/api/docs" target="_blank" rel="noopener">API Docs ↗</a>
        </footer>
      </div>

      {/* ─── Modal ─── */}
      {showModal && (
        <AddItemModal
          onClose={() => setShowModal(false)}
          onAdd={handleAdd}
        />
      )}
    </div>
  )
}
