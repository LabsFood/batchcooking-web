/* ─────────────────────────────────────────────────────────────────────────────
   Règlement d'une prestation réalisée — moyens de paiement et session Stripe.

   Deux règles structurent cet écran, et elles ne viennent pas du front :

   1. Le client ne choisit pas parmi les trois moyens de paiement du produit,
      mais parmi ceux que **son** batch cooker accepte (`acceptedPayments`).
   2. L'avance immédiate existe **par couple client-prestataire** : elle n'est
      proposable que si le rattachement URSSAF avec ce chef-là est actif
      (§ 6.1). Un rattachement actif avec un autre chef ne compte pas.

   Le paiement lui-même n'est jamais encaissé ici : le front ouvre une session
   Stripe Checkout et redirige. Aucune donnée de carte ne transite par Lab's
   Food. `buildCheckoutPayload` construit le corps exact qu'attendra
   `POST /payments/checkout-session` ; `openCheckout` simule la réponse en
   attendant l'endpoint (cf. docs/api/FLOW-03-paiement-prestation.md).
   ───────────────────────────────────────────────────────────────────────────── */

import { CHEF_LISTINGS, URSSAF_LINKS, type UrssafStatus } from './mock'
import { DASHBOARD_ORDERS, type DashboardOrder } from '../dashboard-mock'

export type PaymentMethodId = 'card' | 'urssaf' | 'cesu'

export interface PaymentMethodSpec {
  id: PaymentMethodId
  label: string
  /** Une ligne : ce que le client obtient en choisissant ce moyen. */
  tagline: string
  /** Comment l'argent circule, dit simplement. */
  detail: string
  /** Circuit de l'argent : la plateforme encaisse, ou le chef directement. */
  circuit: 'platform' | 'direct'
}

export const PAYMENT_METHODS: Record<PaymentMethodId, PaymentMethodSpec> = {
  urssaf: {
    id: 'urssaf',
    label: 'Avance immédiate',
    tagline: 'Vous ne réglez que la moitié, tout de suite',
    detail:
      'L’URSSAF déduit le crédit d’impôt au moment du paiement et verse sa part au chef. Vous ne faites pas l’avance et vous n’attendez pas l’année suivante.',
    circuit: 'direct',
  },
  card: {
    id: 'card',
    label: 'Carte bancaire',
    tagline: 'Réglé en une fois, crédit d’impôt l’année suivante',
    detail:
      'Vous payez le montant complet aujourd’hui. Votre attestation fiscale annuelle vous ouvre 50 % de crédit d’impôt sur votre déclaration.',
    circuit: 'platform',
  },
  cesu: {
    id: 'cesu',
    label: 'CESU préfinancé',
    tagline: 'Vos titres d’abord, le solde par carte',
    detail:
      'Vous déclarez le montant de titres remis au chef ; seul le reste passe par la carte. Les titres non utilisés restent valables.',
    circuit: 'direct',
  },
}

/** Ordre d'affichage : le moyen le plus avantageux pour le client d'abord. */
export const METHOD_ORDER: PaymentMethodId[] = ['urssaf', 'card', 'cesu']

// ── Disponibilité ───────────────────────────────────────────────────────────

export interface MethodAvailability {
  spec: PaymentMethodSpec
  available: boolean
  /** Pourquoi c'est indisponible, adressé au client. */
  reason?: string
  /** Action qui lèverait le blocage. */
  action?: { label: string; href: string }
}

const URSSAF_BLOCKED: Record<Exclude<UrssafStatus, 'active'>, string> = {
  pending: 'Votre demande de rattachement est en cours d’instruction par l’URSSAF. Comptez quelques jours.',
  none: 'L’avance immédiate demande un rattachement à ce batch cooker, à faire une fois.',
  refused: 'L’URSSAF a refusé le rattachement à ce batch cooker.',
}

export function urssafStatusFor(chefId: string): UrssafStatus {
  return URSSAF_LINKS.find((l) => l.chefId === chefId)?.status ?? 'none'
}

export function chefAcceptedMethods(chefId: string): PaymentMethodId[] {
  return CHEF_LISTINGS.find((c) => c.id === chefId)?.acceptedPayments ?? ['card']
}

/**
 * Les moyens proposés pour cette prestation. Un moyen que le chef n'accepte pas
 * n'apparaît pas du tout ; un moyen accepté mais bloqué apparaît désactivé avec
 * son motif — le client doit comprendre pourquoi il ne peut pas le prendre.
 */
export function methodsFor(chefId: string): MethodAvailability[] {
  const accepted = chefAcceptedMethods(chefId)
  const urssaf = urssafStatusFor(chefId)

  return METHOD_ORDER.filter((id) => accepted.includes(id)).map((id) => {
    const spec = PAYMENT_METHODS[id]
    if (id === 'urssaf' && urssaf !== 'active') {
      return {
        spec,
        available: false,
        reason: URSSAF_BLOCKED[urssaf],
        action:
          urssaf === 'none'
            ? { label: 'Demander le rattachement', href: '/espace-client/chefs' }
            : undefined,
      }
    }
    return { spec, available: true }
  })
}

export const firstAvailable = (methods: MethodAvailability[]): PaymentMethodId | null =>
  methods.find((m) => m.available)?.spec.id ?? null

// ── Montants ────────────────────────────────────────────────────────────────

export interface Settlement {
  /** Prix de la prestation, TTC. */
  total: number
  /** Déduit tout de suite (avance immédiate) ou couvert par des titres CESU. */
  deducted: number
  /** Ce qui part sur Stripe maintenant. */
  dueNow: number
  /** Crédit d'impôt encore à venir sur la déclaration annuelle. */
  creditLater: number
  /** Libellé de la ligne de déduction, ou null s'il n'y en a pas. */
  deductionLabel: string | null
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * @param cesuAmount Titres CESU déclarés par le client, ignoré hors CESU.
 */
export function settlementFor(
  order: Pick<DashboardOrder, 'amountTTC' | 'amountAfterTax'>,
  method: PaymentMethodId,
  cesuAmount = 0,
): Settlement {
  const total = order.amountTTC
  const credit = round2(total - order.amountAfterTax)

  if (method === 'urssaf') {
    return {
      total,
      deducted: credit,
      dueNow: order.amountAfterTax,
      creditLater: 0,
      deductionLabel: 'Crédit d’impôt déduit immédiatement',
    }
  }

  if (method === 'cesu') {
    const titres = Math.min(Math.max(cesuAmount, 0), total)
    return {
      total,
      deducted: round2(titres),
      dueNow: round2(total - titres),
      creditLater: credit,
      deductionLabel: 'Titres CESU remis au chef',
    }
  }

  return { total, deducted: 0, dueNow: total, creditLater: credit, deductionLabel: null }
}

export const formatEuros = (n: number) =>
  `${n % 1 === 0 ? n.toString() : n.toFixed(2).replace('.', ',')} €`

// ── Session Stripe ──────────────────────────────────────────────────────────

export interface CheckoutPayload {
  orderId: string
  method: PaymentMethodId
  /** En centimes : Stripe ne manipule que des entiers. */
  amountCents: number
  currency: 'eur'
  /** Titres CESU déclarés, en centimes. Présent seulement en CESU. */
  cesuDeclaredCents?: number
  /** Carte enregistrée réutilisée, ou null pour saisir une nouvelle carte. */
  paymentMethodId: string | null
  successUrl: string
  cancelUrl: string
}

export function buildCheckoutPayload(
  order: DashboardOrder,
  method: PaymentMethodId,
  opts: { cesuAmount?: number; savedCardId?: string | null; origin: string },
): CheckoutPayload {
  const s = settlementFor(order, method, opts.cesuAmount ?? 0)
  const detail = `${opts.origin}/espace-client/commandes/${order.id}`
  return {
    orderId: order.id,
    method,
    amountCents: Math.round(s.dueNow * 100),
    currency: 'eur',
    ...(method === 'cesu' ? { cesuDeclaredCents: Math.round(s.deducted * 100) } : {}),
    paymentMethodId: opts.savedCardId ?? null,
    successUrl: `${detail}?paiement=succes`,
    cancelUrl: `${detail}?paiement=annule`,
  }
}

export interface CheckoutSession {
  /** URL hébergée par Stripe. En attendant l'API, l'URL de retour simulée. */
  url: string
  sessionId: string
}

/**
 * Ouvre la session de paiement. Tant que `POST /payments/checkout-session`
 * n'existe pas, on renvoie l'URL de succès après un délai : l'écran se comporte
 * comme en production (bouton verrouillé, redirection), sans encaissement.
 */
export async function openCheckout(payload: CheckoutPayload): Promise<CheckoutSession> {
  await new Promise((r) => setTimeout(r, 900))
  return { url: payload.successUrl, sessionId: `cs_test_${Math.random().toString(36).slice(2, 12)}` }
}

// ── Écriture du règlement (simulation) ──────────────────────────────────────

/**
 * Marque la prestation réglée dans le mock, pour que le retour de Stripe
 * affiche l'état réel dans la session en cours. À supprimer avec les mocks :
 * en production c'est le webhook Stripe qui fait foi.
 */
export function recordPayment(orderId: string, method: PaymentMethodId, amount: number): void {
  const order = DASHBOARD_ORDERS.find((o) => o.id === orderId)
  if (!order) return
  order.payment = {
    status: 'paid',
    method,
    paidAt: new Date().toISOString(),
    amountPaid: amount,
    receiptRef: `RC-${order.reference.replace('LF-', '')}`,
  }
}
