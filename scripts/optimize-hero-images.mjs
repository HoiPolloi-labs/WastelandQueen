/**
 * One-shot WebP optimizer for the landing-page hero images.
 *
 * Why a script and not a Vite plugin: the source PNGs change rarely (once
 * every few months when the design refreshes), and a build-time plugin would
 * slow every `pnpm build` for no reason. Run `pnpm optimize:images` after
 * dropping new PNGs into public/, commit both the .png source and the .webp
 * output, then point HeroScene.css at the .webp.
 *
 * Native dimensions are preserved — the backdrop is blurred and the figure
 * is rendered up to ~50% viewport width, so source resolution stays useful
 * on retina displays. The savings come from WebP's compression alone.
 */
import sharp from 'sharp'
import { readFile, writeFile, stat } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

/** [source, output, quality] — quality is per-image because the backdrop
 *  (blurred) tolerates lower q than the foreground figure. */
const targets = [
  ['queen-scene.png', 'queen-scene.webp', 78],
  ['queen-figure-v2.png', 'queen-figure-v2.webp', 88],
]

const fmt = (bytes) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

let totalBefore = 0
let totalAfter = 0

for (const [src, out, quality] of targets) {
  const srcPath = join(publicDir, src)
  const outPath = join(publicDir, out)

  const before = (await stat(srcPath)).size
  const buf = await readFile(srcPath)
  const meta = await sharp(buf).metadata()

  // effort: 6 = max compression effort (slower, smaller). Acceptable for
  // a one-shot script.
  const webp = await sharp(buf).webp({ quality, effort: 6 }).toBuffer()
  await writeFile(outPath, webp)

  const after = webp.length
  totalBefore += before
  totalAfter += after

  const pct = ((1 - after / before) * 100).toFixed(1)
  console.log(
    `  ${src} ${meta.width}×${meta.height} → ${out} q${quality}: ${fmt(before)} → ${fmt(after)} (-${pct}%)`,
  )
}

const totalPct = ((1 - totalAfter / totalBefore) * 100).toFixed(1)
console.log(
  `\n  Total: ${fmt(totalBefore)} → ${fmt(totalAfter)} (-${totalPct}%, saved ${fmt(totalBefore - totalAfter)})`,
)
