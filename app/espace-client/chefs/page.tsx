import { redirect } from 'next/navigation'

/*
 * « Trouver un batch cooker » n'existe plus.
 *
 * L'écran montrait six personnes écrites en dur, et surtout il faisait
 * doublon : les cartes de la semaine, rangées par batch cooker, c'est
 * exactement ce que montre « Menus & plats » — qui lit, lui, la vraie API.
 * Trois entrées du menu « Réserver » ouvraient la même porte.
 *
 * La route reste, et redirige, pour que les liens déjà partagés ou mis en
 * favori arrivent quelque part.
 */
export default function TrouverUnBatchCooker() {
  redirect('/espace-client/menus')
}
