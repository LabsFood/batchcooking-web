'use client'

import { openCookieSettings } from '@/lib/analytics'

/** « Gérer mes cookies », sur chaque page (politique de confidentialité V1 §15). */
export default function CookieSettingsLink() {
  return (
    <li>
      <button
        type="button"
        onClick={openCookieSettings}
        className="text-left text-sm text-cream-soft/65 hover:text-terra transition-colors"
      >
        Gérer mes cookies
      </button>
    </li>
  )
}
