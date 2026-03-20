const axios = require('axios')

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

async function searchRepacks(query) {
  const results = []

  const sources = [
    { name: 'FitGirl',   fn: () => searchFitGirl(query)       },
    { name: 'SteamRIP',  fn: () => searchSteamRIP(query)      },
    { name: 'Empress',   fn: () => searchOnlineFix(query)      },
  ]

  for (const src of sources) {
    try {
      const data = await src.fn()
      if (data.length > 0) {
        results.push(...data)
        console.log(`[Scraper] ${src.name}: ${data.length} results`)
      }
    } catch (e) {
      console.warn(`[Scraper] ${src.name} failed:`, e.message)
    }
  }

  return results
}

// ── FitGirl ───────────────────────────────────────────────────────────────────
async function searchFitGirl(query) {
  const { data: html } = await axios.get(
    `https://fitgirl-repacks.site/?s=${encodeURIComponent(query)}`,
    { headers: { 'User-Agent': UA, 'Referer': 'https://fitgirl-repacks.site/' }, timeout: 15000 }
  )
  const results = []
  for (const [article] of html.matchAll(/<article[\s\S]*?<\/article>/g)) {
    const tm = article.match(/<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/)
    if (!tm) continue
    const title = strip(tm[2])
    if (!title) continue
    const sm  = article.match(/(\d+(?:\.\d+)?\s*(?:GB|MB))/i)
    const mag = article.match(/href="(magnet:\?[^"]+)"/)
    results.push({
      title, size: sm?.[1] ?? '?', seeders: 1500, leechers: 50,
      detailUrl: tm[1], magnet: mag ? dec(mag[1]) : null, source: 'FitGirl',
    })
  }
  return results.slice(0, 10)
}

// ── SteamRIP (repacks от разных групп) ────────────────────────────────────────
async function searchSteamRIP(query) {
  const { data: html } = await axios.get(
    `https://steamrip.com/?s=${encodeURIComponent(query)}`,
    { headers: { 'User-Agent': UA }, timeout: 12000 }
  )
  const results = []
  for (const [art] of html.matchAll(/<article[\s\S]*?<\/article>/g)) {
    const tm = art.match(/<h2[^>]*class="[^"]*entry-title[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/)
    if (!tm) continue
    const title = strip(tm[2])
    if (!title) continue
    const sm = art.match(/(\d+(?:\.\d+)?\s*(?:GB|MB))/i)
    results.push({
      title, size: sm?.[1] ?? '?', seeders: 800, leechers: 30,
      detailUrl: tm[1], magnet: null, source: 'SteamRIP',
    })
  }
  return results.slice(0, 8)
}

// ── OnlineFix / другие торрент-трекеры ────────────────────────────────────────
async function searchOnlineFix(query) {
  const { data: html } = await axios.get(
    `https://online-fix.me/index.php?do=search&subaction=search&story=${encodeURIComponent(query)}`,
    { headers: { 'User-Agent': UA, 'Referer': 'https://online-fix.me/' }, timeout: 12000 }
  )
  const results = []
  for (const [art] of html.matchAll(/<article[\s\S]*?<\/article>/g)) {
    const tm = art.match(/<h[12][^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/)
    if (!tm) continue
    const title = strip(tm[2])
    if (!title || title.length < 2) continue
    results.push({
      title, size: '?', seeders: 400, leechers: 20,
      detailUrl: tm[1], magnet: null, source: 'OnlineFix',
    })
  }
  return results.slice(0, 8)
}

// ── Magnet со страницы ────────────────────────────────────────────────────────
async function getMagnetFromDetailPage(url) {
  try {
    const { data: html } = await axios.get(url, {
      headers: { 'User-Agent': UA, 'Referer': url },
      timeout: 15000,
    })
    // Magnet в href
    const m1 = html.match(/href="(magnet:\?[^"]+)"/)
    if (m1) return dec(m1[1])
    // Magnet в тексте
    const m2 = html.match(/(magnet:\?xt=urn:btih:[a-zA-Z0-9]+[^\s"'<>\]]*)/i)
    if (m2) return m2[1]
    // Torrent файл
    const m3 = html.match(/href="([^"]+\.torrent[^"]*)"/)
    if (m3) {
      const tUrl = m3[1].startsWith('http') ? m3[1] : new URL(m3[1], url).href
      console.log('[Scraper] Found .torrent file:', tUrl)
      return tUrl // возвращаем URL торрент-файла — WebTorrent тоже умеет
    }
    console.warn('[Scraper] No magnet found on:', url)
    return null
  } catch (e) {
    console.error('[Scraper] getMagnet error:', e.message)
    return null
  }
}

function strip(s) { return s.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').replace(/&#\d+;/g,'').trim() }
function dec(s) {
  return s
    .replace(/&#038;/g, '&')
    .replace(/&#38;/g,  '&')
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&quot;/g, '"')
}

module.exports = { searchRepacks, getMagnetFromDetailPage }
