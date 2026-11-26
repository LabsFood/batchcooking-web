/* ─────────────────────────────────────────────────────────────────────────────
   Où le batch cooker est basé, et jusqu'où il se déplace : « Nice · 30 km »
   (retour de recette du 26/11 : le rayon réglé dans « Ma vitrine » ne se voyait
   pas côté client). Sans ville, un rayon ne dit rien : on n'affiche rien.

   Aucun import : le module se vérifie seul, hors de Next.
   ───────────────────────────────────────────────────────────────────────────── */

export function lieuDuChef(chef: {
  city: string | null
  serviceRadiusKm?: number | null
}): string | null {
  const ville = chef.city?.trim()
  if (!ville) return null
  return chef.serviceRadiusKm && chef.serviceRadiusKm > 0
    ? `${ville} · ${chef.serviceRadiusKm} km`
    : ville
}
