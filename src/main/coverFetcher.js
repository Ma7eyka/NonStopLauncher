const axios = require('axios')
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

// Маппинг известных аббревиатур и сокращений -> полные названия
const KNOWN_TITLES = {
  'gta 4': 'Grand Theft Auto IV',
  'gta iv': 'Grand Theft Auto IV',
  'gta 5': 'Grand Theft Auto V',
  'gta v': 'Grand Theft Auto V',
  'gta sa': 'Grand Theft Auto San Andreas',
  'gta vc': 'Grand Theft Auto Vice City',
  'rdr': 'Red Dead Redemption',
  'rdr2': 'Red Dead Redemption 2',
  'cs2': 'Counter-Strike 2',
  'csgo': 'Counter-Strike Global Offensive',
  'hl2': 'Half-Life 2',
  'hl': 'Half-Life',
  'cod': 'Call of Duty',
  'mw2': 'Call of Duty Modern Warfare 2',
  'mw3': 'Call of Duty Modern Warfare 3',
  'bf3': 'Battlefield 3',
  'bf4': 'Battlefield 4',
  'bfv': 'Battlefield V',
  'nfs': 'Need for Speed',
  'ac': 'Assassin\'s Creed',
  'ds': 'Dark Souls',
  'ds2': 'Dark Souls II',
  'ds3': 'Dark Souls III',
  'er': 'Elden Ring',
  'bg3': 'Baldur\'s Gate 3',
  'tw3': 'The Witcher 3',
  'cp2077': 'Cyberpunk 2077',
}

async function fetchCover(gameTitle) {
  if (!gameTitle) return null

  // Пробуем разные варианты названия
  const variants = getTitleVariants(gameTitle)
  
  for (const variant of variants) {
    if (!variant || variant.length < 2) continue
    try {
      const result = await searchSteam(variant)
      if (result) {
        console.log(`[Cover] Found "${result.name}" for query "${variant}"`)
        return result
      }
    } catch (e) {
      console.warn('[Cover] Steam error:', e.message)
    }
  }
  
  console.warn('[Cover] Not found for:', gameTitle)
  return null
}

function getTitleVariants(raw) {
  const variants = []
  
  // 1. Чистим от мусора репаков
  const clean = cleanTitle(raw)
  variants.push(clean)
  
  // 2. Проверяем известные аббревиатуры
  const lower = clean.toLowerCase()
  if (KNOWN_TITLES[lower]) {
    variants.unshift(KNOWN_TITLES[lower]) // Добавляем в начало — высший приоритет
  }
  
  // 3. Первые 2-3 слова (на случай длинных названий)
  const words = clean.split(' ').filter(w => w.length > 1)
  if (words.length > 3) {
    variants.push(words.slice(0, 3).join(' '))
    variants.push(words.slice(0, 2).join(' '))
  }
  
  // 4. Убираем "Edition", "Anniversary", "Complete" и т.д.
  const stripped = clean
    .replace(/\s*(complete|definitive|anniversary|enhanced|legacy|gold|premium|ultimate|game of the year|goty)\s*(edition)?/gi, '')
    .replace(/:\s+\w+\s+(edition|anniversary|collection)$/gi, '')
    .trim()
  if (stripped && stripped !== clean) variants.push(stripped)
  
  // 5. Только до двоеточия (subtitle часто мешает)
  if (clean.includes(':')) {
    variants.push(clean.split(':')[0].trim())
  }

  // Убираем дубли
  return [...new Set(variants)].filter(v => v && v.length >= 2)
}

async function searchSteam(title) {
  const { data } = await axios.get(
    `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(title)}&l=english&cc=US`,
    { headers: { 'User-Agent': UA }, timeout: 8000 }
  )
  if (!data?.items?.length) return null

  const titleLow = title.toLowerCase()
  let best = null, bestScore = 0

  for (const item of data.items.slice(0, 8)) {
    const nameLow = item.name.toLowerCase()
    let score = 0

    if (nameLow === titleLow) score = 100
    else if (nameLow.startsWith(titleLow)) score = 85
    else if (titleLow.startsWith(nameLow)) score = 80
    else {
      const qWords = titleLow.split(' ').filter(w => w.length > 2)
      const nWords = nameLow.split(' ').filter(w => w.length > 2)
      if (qWords.length) {
        const matched = qWords.filter(w => nameLow.includes(w))
        score = (matched.length / qWords.length) * 65
        // Бонус если название игры начинается одинаково
        if (nWords[0] === qWords[0]) score += 10
      }
    }

    if (score > bestScore) { bestScore = score; best = item }
  }

  if (!best || bestScore < 30) return null

  return {
    cover:     `https://cdn.akamai.steamstatic.com/steam/apps/${best.id}/library_600x900.jpg`,
    coverWide: `https://cdn.akamai.steamstatic.com/steam/apps/${best.id}/header.jpg`,
    name:      best.name,
    steamId:   best.id,
  }
}

function cleanTitle(title) {
  return title
    .replace(/&#\d+;/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s*[/|].*$/, '')           // всё после / или |
    .replace(/\s*v\s*\d[\d.]+.*/i, '')   // версия
    .replace(/\+\s*(all\s+)?dlc.*/i, '')
    .replace(/\s*(repack|fitgirl|dodi|codex|skidrow|gog|bonus.?content|build\s*\d+|legacy)\b.*/i, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

module.exports = { fetchCover }
