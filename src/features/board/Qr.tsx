import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

interface QrProps {
  value: string
  size?: number
}

export function Qr({ value, size = 160 }: QrProps) {
  const [dataUrl, setDataUrl] = useState<string>('')

  useEffect(() => {
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: { dark: '#fafafa', light: '#18181b' },
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(''))
  }, [value, size])

  if (!dataUrl) return <div className="h-40 w-40 animate-pulse rounded bg-zinc-800" />
  return <img src={dataUrl} alt={`QR für ${value}`} className="rounded" width={size} height={size} />
}
