/**
 * gameDetector.js — определяет exe файл игры в папке
 * Возвращает { type: 'setup'|'game', exePath, exeName }
 */
const fs   = require('fs')
const path = require('path')

function detectGameExe(folderPath) {
  if (!fs.existsSync(folderPath)) return null

  const files = getAllExes(folderPath)
  if (files.length === 0) return null

  // Ищем сетап
  const setupExe = files.find(f => {
    const name = path.basename(f).toLowerCase()
    return name === 'setup.exe' || name === 'install.exe' ||
           name === 'installer.exe' || name.startsWith('setup_') ||
           name.includes('setup') && name.endsWith('.exe')
  })
  if (setupExe) return { type: 'setup', exePath: setupExe, exeName: path.basename(setupExe) }

  // Ищем основной exe — самый большой файл (обычно это игра)
  const gameExe = files
    .map(f => ({ path: f, size: fs.statSync(f).size }))
    .sort((a, b) => b.size - a.size)
    .find(f => {
      const name = path.basename(f.path).toLowerCase()
      // Исключаем служебные
      return !name.includes('unins') && !name.includes('crash') &&
             !name.includes('report') && !name.includes('helper') &&
             !name.includes('update') && !name.includes('redist')
    })

  if (gameExe) return { type: 'game', exePath: gameExe.path, exeName: path.basename(gameExe.path) }

  return null
}

function getAllExes(dir, depth = 0) {
  if (depth > 3) return [] // не уходим слишком глубоко
  const result = []
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        result.push(...getAllExes(full, depth + 1))
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.exe')) {
        result.push(full)
      }
    }
  } catch {}
  return result
}

module.exports = { detectGameExe }
