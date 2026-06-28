import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#111827"/>
  <text x="50" y="67" font-family="Helvetica Neue,Helvetica,Arial,sans-serif" font-weight="900" font-size="40" text-anchor="middle" fill="white">RL</text>
</svg>`

const buf = Buffer.from(svg)

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-180.png', size: 180 },
  { name: 'icon-32.png',  size: 32  },
]

for (const { name, size } of sizes) {
  await sharp(buf).resize(size, size).png().toFile(join(outDir, name))
  console.log(`✓ ${name}`)
}
