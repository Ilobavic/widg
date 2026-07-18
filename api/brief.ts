import type { VercelRequest, VercelResponse } from '@vercel/node'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const BRIEF_PATH = join(process.cwd(), 'brief.json')

const DEFAULT_ITEMS = [
  {
    source: 'Slack',
    title: 'Auth API latency spike in APAC',
    why: 'Database connection pool exhausted due to unindexed query in user search endpoint.',
    action: 'Add index to user search email column and restart Auth task',
    link: 'https://github.com',
    urgency: 'high',
  },
  {
    source: 'Jira',
    title: 'Fix OAuth package vulnerability',
    why: 'Snyk reported a critical vulnerability in the jwt-decode dependency.',
    action: 'Upgrade jwt-decode package in frontend dependencies',
    link: 'https://jira.com',
    urgency: 'medium',
  },
  {
    source: 'Email',
    title: 'Security audit report ready',
    why: 'The Q2 external audit report requires team response for 3 minor items.',
    action: 'Complete security questionnaires before Friday',
    link: null,
    urgency: 'low',
  },
]

function loadBrief() {
  try {
    if (existsSync(BRIEF_PATH)) {
      const raw = readFileSync(BRIEF_PATH, 'utf-8')
      const data = JSON.parse(raw)
      if (Array.isArray(data.items)) return data
    }
  } catch {
    // fall through to default
  }
  return {
    updated: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    items: DEFAULT_ITEMS,
  }
}

function saveBrief(data: object) {
  try {
    writeFileSync(BRIEF_PATH, JSON.stringify(data, null, 2), 'utf-8')
  } catch {
    // read-only filesystem on Vercel — ignore
  }
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const { action } = req.query

  // POST /api/brief?action=refresh
  if (req.method === 'POST' && action === 'refresh') {
    const syncItems = [
      { source: 'Slack',  title: 'Database migrations failed on staging',      why: 'Migration script encountered a duplicate key constraint on the users table.', action: 'Rollback migration, clean up dirty schema, re-run script',        link: 'https://github.com', urgency: 'high' },
      { source: 'Jira',   title: 'Fix OAuth package vulnerability',              why: 'Snyk reported a critical vulnerability in the jwt-decode dependency.',        action: 'Upgrade jwt-decode package in frontend dependencies',              link: 'https://jira.com',   urgency: 'medium' },
      { source: 'GitHub', title: 'Review request: Refactor login flow PR #122', why: 'Needs senior engineer approval before merge to main branch.',                  action: 'Verify OAuth flows and approve PR #122',                           link: 'https://github.com', urgency: 'medium' },
      { source: 'Email',  title: 'SSL certificate renewal reminder',             why: 'Domain certificates for api.production.com expire in 7 days.',                action: 'Run certificate renewal script on primary server cluster',          link: null,                 urgency: 'low' },
    ]
    const pick = syncItems.sort(() => 0.5 - Math.random()).slice(0, 3)
    const refreshed = {
      updated: new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' }),
      items: pick,
    }
    saveBrief(refreshed)
    return res.status(200).json(refreshed)
  }

  // POST /api/brief  — add item
  if (req.method === 'POST') {
    const item = req.body
    if (!item?.title || !item?.why || !item?.action) {
      return res.status(400).json({ error: 'title, why, and action are required' })
    }
    const data = loadBrief()
    data.items.unshift({ ...item, link: item.link || null })
    data.updated = new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })
    saveBrief(data)
    return res.status(200).json(item)
  }

  // GET /api/brief
  if (req.method === 'GET') {
    return res.status(200).json(loadBrief())
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
