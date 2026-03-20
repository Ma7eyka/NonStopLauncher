/**
 * gameScanner.js — сканирует папку игры, находит .exe для запуска
 */
const fs   = require('fs')
const path = require('path')

/**
 * Возвращает { type: 'setup'|'game', exePath, exeName }
 */
function scanGameFolder(folderPath) {
  if (!fs.existsSync(folderPath)) return null

  const exeFiles = findExeFiles(folderPath, 3) // глубина 3

  if (exeFiles.length === 0) return null

  // Ищем setup
  const setupExe = exeFiles.find(f => {
    const name = path.basename(f).toLowerCase()
    return name === 'setup.exe' || name === 'install.exe' || name.startsWith('setup')
  })

  if (setupExe) {
    return { type: 'setup', exePath: setupExe, exeName: path.basename(setupExe) }
  }

  // Ищем главный exe — самый большой файл (обычно это игра)
  const exeWithSizes = exeFiles.map(f => {
    try { return { path: f, size: fs.statSync(f).size } }
    catch { return { path: f, size: 0 } }
  })

  exeWithSizes.sort((a, b) => b.size - a.size)
  const mainExe = exeWithSizes[0]

  return {
    type: 'game',
    exePath: mainExe.path,
    exeName: path.basename(mainExe.path),
  }
}

function findExeFiles(dir, depth = 3) {
  if (depth === 0) return []
  const results = []
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...findExeFiles(full, depth - 1))
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.exe')) {
        // Пропускаем системные/служебные exe
        const skip = ['unins', 'uninst', 'crash', 'report', 'helper', 'update', 'redist', 'vcredist', 'directx']
        if (!skip.some(s => entry.name.toLowerCase().includes(s))) {
          results.push(full)
        }
      }
    }
  } catch {}
  return results
}

module.exports = { scanGameFolder }
