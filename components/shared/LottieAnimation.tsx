'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

const Lottie = dynamic(() => import('lottie-react'), { ssr: false })

type Props = {
  /** URL or path to a .json Lottie file. Drop files in /public/lotties/. */
  src: string
  className?: string
  loop?: boolean
  autoplay?: boolean
}

/**
 * Thin wrapper around lottie-react that fetches a JSON URL.
 * Use it for any future hosted Lottie animation:
 *
 *   <LottieAnimation src="/lotties/my-anim.json" className="w-40 h-40" />
 */
export default function LottieAnimation({ src, className, loop = true, autoplay = true }: Props) {
  const [data, setData] = useState<unknown>(null)

  useEffect(() => {
    let cancelled = false
    fetch(src)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => { if (!cancelled) setData(json) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [src])

  if (!data) return <span className={className} aria-hidden="true" />
  return <Lottie animationData={data} loop={loop} autoplay={autoplay} className={className} />
}
