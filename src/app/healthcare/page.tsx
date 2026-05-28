'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { companies, Company, Vertical, getSectorMedians } from '@/data/companies'

const VERTICALS: Vertical[] = [
  'Large Cap Pharma',
  'Biotech',
  'Medical Devices',
  'Life Sciences Tools',
  'Managed Care',
  'CRO / Services',
]

type SortKey = keyof Company
type SortDir = 'asc' | 'desc'

function fmt(v: number | null, decimals = 1, suffix = 'x') {
  if (v === null || v === undefined) return '—'
  return `${v.toFixed(decimals)}${suffix}`
}

function fmtPct(v: number, decimals = 1) {
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(decimals)}%`
}

function fmtBn(v: number) {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}T`
  return `$${v.toFixed(0)}B`
}

function PremiumBadge({ pct, tier }: { pct: number; tier: Company['tier'] }) {
  const cls = tier === 'premium' ? 'badge-premium' : tier === 'discount' ? 'badge-discount' : 'badge-fair'
  const label = tier === 'premium' ? 'Premium' : tier === 'discount' ? 'Discount' : 'Fair Value'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {tier === 'premium' ? '▲' : tier === 'discount' ? '▼' : '●'} {label}{' '}
      <span className="opacity-70">({pct > 0 ? '+' : ''}{pct}%)</span>
    </span>
  )
}

function GrowthCell({ v }: { v: number }) {
  const color = v > 10 ? '#10b981' : v > 0 ? '#6ee7b7' : v > -5 ? '#fbbf24' : '#ef4444'
  return <span style={{ color }} className="mono">{fmtPct(v)}</span>
}

function MarginCell({ v, sectorVal }: { v: number; sectorVal?: number }) {
  const delta = sectorVal !== undefined ? v - sectorVal : 0
  const color = delta > 5 ? '#10b981' : delta > 0 ? '#86efac' : delta > -5 ? '#fbbf24' : '#ef4444'
  return (
    <span className="mono" style={{ color: sectorVal !== undefined ? color : 'var(--text)' }}>
      {v.toFixed(1)}%
    </span>
  )
}

function SortIcon({ col, sortKey, sortDir }: { col: string; sortKey: string; sortDir: SortDir }) {
  if (col !== sortKey) return <span className="ml-1 opacity-30">↕</span>
  return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>{label}</p>
      <p className="text-xl font-bold text-white mono">{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{sub}</p>}
    </div>
  )
}

export default function HealthcarePage() {
  const router = useRouter()
  const [user, setUser] = useState<{ name: string; email: string } | null>(null)
  const [activeVertical, setActiveVertical] = useState<'All' | Vertical>('All')
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('marketCapB')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/session').then((r) => r.json()).then((d) => {
      if (!d.isLoggedIn) router.push('/')
      else setUser({ name: d.name, email: d.email })
    })
  }, [router])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  const filtered = useMemo(() => {
    let list = companies.filter((c) =>
      activeVertical === 'All' || c.vertical === activeVertical
    )
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (c) => c.ticker.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
      )
    }
    list = [...list].sort((a, b) => {
      const av = a[sortKey] as number | null
      const bv = b[sortKey] as number | null
      if (av === null && bv === null) return 0
      if (av === null) return 1
      if (bv === null) return -1
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
    })
    return list
  }, [activeVertical, search, sortKey, sortDir])

  // Summary stats
  const premiumCount = filtered.filter((c) => c.tier === 'premium').length
  const discountCount = filtered.filter((c) => c.tier === 'discount').length
  const avgRevGrowth = filtered.length
    ? (filtered.reduce((s, c) => s + c.revGrowth, 0) / filtered.length).toFixed(1)
    : '—'
  const avgEbitdaMargin = filtered.length
    ? (filtered.reduce((s, c) => s + c.ebitdaMargin, 0) / filtered.length).toFixed(1)
    : '—'

  // Sector medians for each company's vertical
  const mediansCache = useMemo(() => {
    const cache: Partial<Record<Vertical, ReturnType<typeof getSectorMedians>>> = {}
    VERTICALS.forEach((v) => { cache[v] = getSectorMedians(v) })
    return cache
  }, [])

  const Th = useCallback(
    ({ k, label, title }: { k: SortKey; label: string; title?: string }) => (
      <th
        className={sortKey === k ? 'sorted' : ''}
        onClick={() => handleSort(k)}
        title={title}
      >
        {label}
        <SortIcon col={k as string} sortKey={sortKey as string} sortDir={sortDir} />
      </th>
    ),
    [sortKey, sortDir, handleSort]
  )

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p style={{ color: 'var(--muted)' }}>Loading…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Top nav */}
      <header style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-none">Healthcare Comps</h1>
              <p className="text-xs leading-none mt-0.5" style={{ color: 'var(--muted)' }}>NTM Consensus · {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm" style={{ color: 'var(--muted)' }}>
              Welcome, <span className="text-white font-medium">{user.name}</span>
            </span>
            <button
              onClick={logout}
              className="text-xs px-3 py-1.5 rounded-lg transition hover:opacity-80"
              style={{ background: 'var(--raised)', color: 'var(--muted)', border: '1px solid var(--border)' }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-6">
        {/* Page header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Healthcare Listed Companies</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Trading multiples, margin profiles, and growth assumptions — understanding the premium or discount vs. peers.
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="Companies" value={String(filtered.length)} sub={`of ${companies.length} total`} />
          <StatCard label="Trading at Premium" value={String(premiumCount)} sub="vs sector median" />
          <StatCard label="Trading at Discount" value={String(discountCount)} sub="vs sector median" />
          <StatCard label="Avg Rev Growth (NTM)" value={`+${avgRevGrowth}%`} sub={`Avg EBITDA margin: ${avgEbitdaMargin}%`} />
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {/* Vertical tabs */}
          <div className="flex flex-wrap gap-1.5">
            {(['All', ...VERTICALS] as const).map((v) => (
              <button
                key={v}
                onClick={() => setActiveVertical(v)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition"
                style={{
                  background: activeVertical === v ? '#1d4ed8' : 'var(--raised)',
                  color: activeVertical === v ? '#fff' : 'var(--muted)',
                  border: `1px solid ${activeVertical === v ? '#3b82f6' : 'var(--border)'}`,
                }}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="ml-auto relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--muted)' }}
                 fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ticker or name…"
              className="pl-8 pr-3 py-1.5 rounded-lg text-xs text-white outline-none"
              style={{ background: 'var(--raised)', border: '1px solid var(--border)', width: 200 }}
            />
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-3 text-xs" style={{ color: 'var(--muted)' }}>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} /> Premium vs sector
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: '#eab308' }} /> Fair value
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: '#ef4444' }} /> Discount vs sector
          </span>
          <span className="ml-2">Click any row to expand implications</span>
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="w-full hc-table" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {/* Identity */}
                  <Th k="ticker" label="Ticker" />
                  <th style={{ minWidth: 180 }}>Company</th>
                  <th>Vertical</th>
                  <Th k="marketCapB" label="Mkt Cap" title="Market capitalisation USD" />

                  {/* Separator */}
                  <th className="px-0" style={{ width: 1, padding: 0 }} />

                  {/* Multiples */}
                  <Th k="peNTM" label="P/E" title="Price / NTM EPS" />
                  <Th k="evEbitdaNTM" label="EV/EBITDA" title="Enterprise value / NTM EBITDA" />
                  <Th k="evRevNTM" label="EV/Rev" title="Enterprise value / NTM Revenue" />
                  <Th k="pfcfNTM" label="P/FCF" title="Price / NTM Free Cash Flow" />

                  {/* Margins */}
                  <Th k="grossMargin" label="Gross %" title="Gross profit margin" />
                  <Th k="ebitdaMargin" label="EBITDA %" title="EBITDA margin" />
                  <Th k="netMargin" label="Net %" title="Net profit margin" />
                  <Th k="fcfMargin" label="FCF %" title="Free cash flow margin" />

                  {/* Growth */}
                  <Th k="revGrowth" label="Rev g. YoY" title="Revenue growth year-on-year" />
                  <Th k="ebitdaGrowth" label="EBITDA g." title="EBITDA growth year-on-year" />
                  <Th k="rev2yrCagr" label="2yr CAGR" title="2-year revenue CAGR" />
                  <Th k="grossMarginExpBps" label="GM Exp." title="Gross margin expansion (bps, 2yr)" />

                  {/* Valuation */}
                  <Th k="premDiscPct" label="vs Peers" title="Premium / discount to sector median EV/EBITDA" />
                  <th>Rating</th>
                  <th>Key Catalyst</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const medians = mediansCache[c.vertical]!
                  const isExpanded = expandedTicker === c.ticker
                  return (
                    <>
                      <tr
                        key={c.ticker}
                        className={isExpanded ? 'expanded' : ''}
                        onClick={() => setExpandedTicker(isExpanded ? null : c.ticker)}
                        style={{ cursor: 'pointer' }}
                      >
                        {/* Identity */}
                        <td>
                          <span className="mono font-semibold text-white">{c.ticker}</span>
                        </td>
                        <td>
                          <span className="font-medium text-white">{c.name}</span>
                        </td>
                        <td>
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--raised)', color: 'var(--muted)' }}>
                            {c.vertical}
                          </span>
                        </td>
                        <td className="mono">{fmtBn(c.marketCapB)}</td>

                        {/* Sep */}
                        <td style={{ width: 1, padding: 0, background: 'var(--border)' }} />

                        {/* Multiples */}
                        <td className="mono">{fmt(c.peNTM)}</td>
                        <td>
                          <span className="mono" style={{
                            color: c.evEbitdaNTM !== null && c.evEbitdaNTM > medians.evEbitdaNTM * 1.15
                              ? '#10b981'
                              : c.evEbitdaNTM !== null && c.evEbitdaNTM < medians.evEbitdaNTM * 0.85
                              ? '#ef4444'
                              : 'var(--text)',
                          }}>
                            {fmt(c.evEbitdaNTM)}
                          </span>
                        </td>
                        <td className="mono">{fmt(c.evRevNTM)}</td>
                        <td className="mono">{fmt(c.pfcfNTM)}</td>

                        {/* Margins */}
                        <td><MarginCell v={c.grossMargin} /></td>
                        <td><MarginCell v={c.ebitdaMargin} sectorVal={medians.ebitdaMargin} /></td>
                        <td><MarginCell v={c.netMargin} /></td>
                        <td><MarginCell v={c.fcfMargin} /></td>

                        {/* Growth */}
                        <td><GrowthCell v={c.revGrowth} /></td>
                        <td><GrowthCell v={c.ebitdaGrowth} /></td>
                        <td><GrowthCell v={c.rev2yrCagr} /></td>
                        <td>
                          <span className="mono" style={{ color: c.grossMarginExpBps >= 0 ? '#10b981' : '#ef4444' }}>
                            {c.grossMarginExpBps >= 0 ? '+' : ''}{c.grossMarginExpBps}bps
                          </span>
                        </td>

                        {/* Valuation */}
                        <td>
                          <span className="mono" style={{ color: c.premDiscPct > 0 ? '#10b981' : c.premDiscPct < -10 ? '#ef4444' : '#eab308' }}>
                            {c.premDiscPct > 0 ? '+' : ''}{c.premDiscPct}%
                          </span>
                        </td>
                        <td><PremiumBadge pct={c.premDiscPct} tier={c.tier} /></td>
                        <td>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                                style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa' }}>
                            {c.catalyst}
                          </span>
                        </td>
                      </tr>

                      {/* Implications expansion row */}
                      {isExpanded && (
                        <tr key={`${c.ticker}-impl`} className="impl-row">
                          <td colSpan={21}>
                            <div className="py-4 px-4">
                              <div className="flex items-start gap-4">
                                {/* Left: company header */}
                                <div className="flex-shrink-0" style={{ minWidth: 200 }}>
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="mono text-xl font-bold text-white">{c.ticker}</span>
                                    <PremiumBadge pct={c.premDiscPct} tier={c.tier} />
                                  </div>
                                  <p className="text-sm text-white font-medium">{c.name}</p>
                                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{c.vertical}</p>
                                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <p style={{ color: 'var(--muted)' }}>EV/EBITDA</p>
                                      <p className="mono text-white font-medium">{fmt(c.evEbitdaNTM)}</p>
                                    </div>
                                    <div>
                                      <p style={{ color: 'var(--muted)' }}>Sector median</p>
                                      <p className="mono text-white font-medium">{fmt(mediansCache[c.vertical]!.evEbitdaNTM)}</p>
                                    </div>
                                    <div>
                                      <p style={{ color: 'var(--muted)' }}>Rev Growth</p>
                                      <p className="mono font-medium"><GrowthCell v={c.revGrowth} /></p>
                                    </div>
                                    <div>
                                      <p style={{ color: 'var(--muted)' }}>EBITDA Margin</p>
                                      <p className="mono text-white font-medium">{c.ebitdaMargin}%</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Divider */}
                                <div className="self-stretch w-px mx-2" style={{ background: 'var(--border)' }} />

                                {/* Right: implications */}
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <svg className="w-4 h-4" style={{ color: '#60a5fa' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                    <h3 className="text-sm font-semibold text-white">Valuation Implications</h3>
                                  </div>
                                  <p className="text-sm leading-relaxed" style={{ color: '#c9d1e0', maxWidth: '80ch' }}>
                                    {c.implications}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={21} className="text-center py-12" style={{ color: 'var(--muted)' }}>
                      No companies match your filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer note */}
        <div className="mt-6 rounded-xl p-4 flex gap-3" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#60a5fa' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
            <strong className="text-white">Data note:</strong> All multiples are NTM (next-twelve-months) consensus estimates. Margins reflect LTM or NTM consensus as appropriate.
            Revenue growth, EBITDA growth and margin expansion are NTM YoY vs. prior period. The "vs Peers" column shows the approximate premium / discount of
            a company&apos;s EV/EBITDA multiple relative to the sector median. Colour coding on EBITDA margin cells compares each company to its vertical median.
            Figures are for analytical reference and should not be construed as investment advice.
            Sources: Bloomberg, FactSet, company filings &amp; guidance. Updated {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.
          </p>
        </div>
      </main>
    </div>
  )
}
