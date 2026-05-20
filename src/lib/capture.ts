import { toPng } from 'html-to-image'

export async function downloadAsPng(node: HTMLElement, filename: string): Promise<void> {
  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: '#09090b',
  })
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}
