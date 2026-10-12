import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = readFileSync(resolve(projectRoot, 'src/components/RewardChoiceIcon.tsx'), 'utf8')
const choices = [
  { id: 'sword', title: 'Меч героя', level: 'Уровень 4' },
  { id: 'bow', title: 'Лук следопыта', level: 'Уровень 10' },
  { id: 'twin', title: 'Парные клинки', level: 'Уровень 20' },
  { id: 'crystal', title: 'Кристальный меч', level: 'Уровень 100' },
]

function glyph(id) {
  const start = source.indexOf(`case 'weapon:${id}': return <>`)
  const end = source.indexOf('</>', start)
  if (start < 0 || end < 0) throw new Error(`Не найден значок ${id}`)
  return source.slice(start, end).replace(/^.*?return <>/, '')
    .replace(/strokeWidth=/g, 'stroke-width=')
    .replace(/strokeLinecap=/g, 'stroke-linecap=')
    .replace(/strokeLinejoin=/g, 'stroke-linejoin=')
    .replace(/\s*\/\>/g, '/>')
    .trim()
}

const columns = choices.map(({ id, title, level }, index) => {
  const x = 30 + index * 280
  const icon = glyph(id)
  return `<g transform="translate(${x} 0)">
    <rect x="0" y="48" width="250" height="290" rx="17" fill="#182b40" stroke="#416888"/>
    <rect x="16" y="65" width="34" height="34" rx="8" fill="#274359" stroke="#83adca"/>
    <svg x="17.5" y="66.5" width="31" height="31" viewBox="0 0 40 40">${icon}</svg>
    <text x="61" y="80" fill="#e6f5ff" font-size="13" font-weight="700">${title}</text>
    <text x="61" y="96" fill="#9fbad0" font-size="11">${level} · размер в приложении</text>
    <rect x="42" y="121" width="166" height="166" rx="24" fill="#20394f" stroke="#5684a7"/>
    <svg x="56" y="135" width="138" height="138" viewBox="0 0 40 40">${icon}</svg>
    <text x="125" y="315" text-anchor="middle" fill="#a8c6d9" font-size="12">Крупный просмотр</text>
  </g>`
}).join('\n')

const preview = `<svg xmlns="http://www.w3.org/2000/svg" width="1160" height="370" viewBox="0 0 1160 370">
  <rect width="1160" height="370" fill="#0f2032"/>
  <text x="30" y="27" fill="#e7f7ff" font-family="Segoe UI, Arial, sans-serif" font-size="18" font-weight="700">Миниатюры оружия · вариант для проверки</text>
  <g font-family="Segoe UI, Arial, sans-serif">${columns}</g>
</svg>`

const output = resolve(projectRoot, 'artifacts/weapon-icons-preview.svg')
mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, preview, 'utf8')
console.log(output)
