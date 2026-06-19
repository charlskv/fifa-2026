import { useEffect, useMemo, useState } from 'react'

interface MatchRecord {
  id: string
  fifaMatchUrl: string
  matchDate: string
  homeTeam: string
  awayTeam: string
  competition: string
  telekomUrl: string
  ardUrl: string
  zdfUrl: string
}

interface MatchesResponse {
  lastUpdated: string | null
  total: number
  source: string
  matches: MatchRecord[]
}

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3001'

function channelValue(match: MatchRecord, channel: string): string {
  if (channel === 'telekom') return match.telekomUrl
  if (channel === 'ard') return match.ardUrl
  if (channel === 'zdf') return match.zdfUrl
  return ''
}

function toDateLabel(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toLocalDateValue(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toDateInputValue(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return toLocalDateValue(date)
}

function App() {
  const [data, setData] = useState<MatchesResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [lastRefreshTime, setLastRefreshTime] = useState<number | null>(null)

  const [teamFilter, setTeamFilter] = useState('')
  const [channelFilter, setChannelFilter] = useState<Set<string>>(new Set())
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const STORAGE_KEY = 'fifa-last-refresh-time'

  const canRefresh = (): boolean => {
    if (lastRefreshTime === null) return true

    const now = new Date()
    const lastRefresh = new Date(lastRefreshTime)

    // Compare just the dates (ignoring time) - reset at midnight
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const lastRefreshDate = new Date(
      lastRefresh.getFullYear(),
      lastRefresh.getMonth(),
      lastRefresh.getDate()
    )

    // Can refresh if it's a different day
    return todayDate.getTime() > lastRefreshDate.getTime()
  }

  const getRefreshCountdown = (): string => {
    if (lastRefreshTime === null) return ''

    const now = new Date()
    const lastRefresh = new Date(lastRefreshTime)

    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const lastRefreshDate = new Date(
      lastRefresh.getFullYear(),
      lastRefresh.getMonth(),
      lastRefresh.getDate()
    )

    // If it's a different day, no cooldown
    if (todayDate.getTime() > lastRefreshDate.getTime()) return ''

    // Calculate time until midnight
    const tomorrow = new Date(todayDate)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const timeUntilMidnight = tomorrow.getTime() - now.getTime()
    const hours = Math.floor(timeUntilMidnight / (60 * 60 * 1000))
    const minutes = Math.floor(
      (timeUntilMidnight % (60 * 60 * 1000)) / (60 * 1000)
    )

    return `Available in ${hours}h ${minutes}m`
  }

  const toggleChannel = (channel: string): void => {
    setChannelFilter((prev) => {
      const next = new Set(prev)
      if (next.has(channel)) {
        next.delete(channel)
      } else {
        next.add(channel)
      }
      return next
    })
  }

  const loadMatches = async (): Promise<void> => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${API_BASE}/api/matches`)
      if (!response.ok) throw new Error('Failed to fetch matches.')
      const body = (await response.json()) as MatchesResponse
      setData(body)
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'Unable to load matches.',
      )
    } finally {
      setLoading(false)
    }
  }

  const refreshMatches = async (): Promise<void> => {
    if (!canRefresh()) {
      setError(
        `You can only refresh once per day. ${getRefreshCountdown()}`
      )
      return
    }

    setRefreshing(true)
    setError('')
    try {
      const response = await fetch(`${API_BASE}/api/refresh`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Refresh failed.')
      const body = (await response.json()) as MatchesResponse
      setData(body)

      // Record refresh time and persist to localStorage
      const now = Date.now()
      setLastRefreshTime(now)
      localStorage.setItem(STORAGE_KEY, now.toString())
    } catch (refreshError) {
      setError(
        refreshError instanceof Error ? refreshError.message : 'Refresh failed.',
      )
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    // Load last refresh time from localStorage on mount
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      setLastRefreshTime(Number(stored))
    }
    void loadMatches()
  }, [])

  const filteredMatches = useMemo(() => {
    const matches = data?.matches ?? []
    const team = teamFilter.trim().toLowerCase()
    const hasExplicitFilter = team !== '' || startDate !== '' || endDate !== ''

    const todayStr = toLocalDateValue(new Date())

    return matches.filter((match) => {
      const dateValue = toDateInputValue(match.matchDate)

      // Hide past games in default view; show them only when team or date filter is active
      if (!hasExplicitFilter && dateValue < todayStr) return false

      if (team) {
        const home = match.homeTeam.toLowerCase()
        const away = match.awayTeam.toLowerCase()
        if (!home.includes(team) && !away.includes(team)) return false
      }

      if (channelFilter.size > 0) {
        const hasAny = [...channelFilter].some((ch) => channelValue(match, ch))
        if (!hasAny) return false
      }

      if (startDate && dateValue < startDate) return false
      if (endDate && dateValue > endDate) return false

      return true
    })
  }, [channelFilter, data?.matches, endDate, startDate, teamFilter])

  return (
    <main className="page">
      <section className="hero">
        <h1>FIFA 2026 Remaining Matches</h1>
        <p>
          Official FIFA fixture pages with Germany watch links in separate columns
          for Telekom, ARD, and ZDF.
        </p>
        <div className="actions-row">
          <button
            type="button"
            onClick={() => void loadMatches()}
            disabled={loading || refreshing}
          >
            {loading ? 'Loading...' : 'Reload List'}
          </button>
          <button
            type="button"
            onClick={() => void refreshMatches()}
            disabled={!navigator.onLine || loading || refreshing || !canRefresh()}
            title={!canRefresh() ? getRefreshCountdown() : 'Refresh match data from FIFA'}
          >
            {refreshing ? 'Refreshing...' : 'Refresh From FIFA'}
            {!canRefresh() && ` (${getRefreshCountdown()})`}
          </button>
          <span className="meta">
            Last updated: {data?.lastUpdated ? toDateLabel(data.lastUpdated) : '-'}
          </span>
        </div>
      </section>

      <section className="filters">
        <label>
          Team
          <input
            type="text"
            value={teamFilter}
            onChange={(event) => setTeamFilter(event.target.value)}
            placeholder="e.g. Germany"
          />
        </label>

        <fieldset className="channel-filter">
          <legend>Channel</legend>
          {(['telekom', 'ard', 'zdf'] as const).map((ch) => (
            <label key={ch} className="channel-option">
              <input
                type="checkbox"
                checked={channelFilter.has(ch)}
                onChange={() => toggleChannel(ch)}
              />
              {ch.toUpperCase()}
            </label>
          ))}
        </fieldset>

        <label>
          From
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </label>

        <label>
          To
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </label>
      </section>

      {error ? <p className="error">{error}</p> : null}

      <section className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Home</th>
              <th>Away</th>
              <th>Telekom</th>
              <th>ARD</th>
              <th>ZDF</th>
              <th>FIFA Match</th>
            </tr>
          </thead>
          <tbody>
            {filteredMatches.map((match) => (
              <tr key={match.id}>
                <td>{toDateLabel(match.matchDate)}</td>
                <td>{match.homeTeam}</td>
                <td>{match.awayTeam}</td>
                <td>
                  {match.telekomUrl ? (
                    <a href={match.telekomUrl} target="_blank" rel="noreferrer">
                      Telekom
                    </a>
                  ) : (
                    ''
                  )}
                </td>
                <td>
                  {match.ardUrl ? (
                    <a href={match.ardUrl} target="_blank" rel="noreferrer">
                      ARD
                    </a>
                  ) : (
                    ''
                  )}
                </td>
                <td>
                  {match.zdfUrl ? (
                    <a href={match.zdfUrl} target="_blank" rel="noreferrer">
                      ZDF
                    </a>
                  ) : (
                    ''
                  )}
                </td>
                <td>
                  <a href={match.fifaMatchUrl} target="_blank" rel="noreferrer">
                    Open
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filteredMatches.length === 0 ? (
          <p className="empty">No matches found for the current filters.</p>
        ) : null}
      </section>

      <footer className="footnote">
        <p>
          Data source: official FIFA match pages. Channel columns stay blank until
          links are visible on FIFA pages.
        </p>
      </footer>
    </main>
  )
}

export default App
