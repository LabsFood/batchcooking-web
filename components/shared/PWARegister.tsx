'use client'

import { useEffect } from 'react'

// Enregistre le service worker une seule fois côté client.
// - En dev (NODE_ENV=development), on ne l'enregistre pas (Next sert
//   les chunks à la volée et le SW interférerait avec le HMR).
// - On désinscrit aussi tout SW présent en dev pour éviter qu'un cache
//   stale d'une session précédente ne casse le hot reload.
export default function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    const isProd = process.env.NODE_ENV === 'production'

    if (!isProd) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister())
      })
      return
    }

    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => {
          // Pas de catastrophe si l'enregistrement échoue : le site marche
          // toujours, simplement sans support offline.
          console.warn('[PWA] SW registration failed:', err)
        })
    }

    if (document.readyState === 'complete') onLoad()
    else window.addEventListener('load', onLoad, { once: true })
  }, [])

  return null
}
