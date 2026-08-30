/**
 * Habillage des composants Clerk (<SignIn> / <SignUp>) — app client.
 *
 * Principe : on thématise via les **variables** de Clerk et on le laisse gérer
 * sa propre mise en page. On n'injecte volontairement PAS nos classes maison
 * (`input-base`, `btn btn-primary`) sur `formFieldInput` / `formButtonPrimary` :
 * ces sélecteurs s'appliquent à *tous* les champs, y compris les cases à cocher
 * et les champs de code OTP — ce qui les déformait complètement sur les écrans
 * « mot de passe oublié », « vérification » et « réinitialisation ».
 *
 * Les quelques ajustements visuels restants (carte à plat, boutons en pilule)
 * sont faits en CSS ciblé dans app/globals.css.
 */
export const clerkAuthAppearance = {
  variables: {
    colorPrimary: '#F39C12', // terra / amber
    colorText: '#1F2A37', // ink
    colorTextSecondary: '#4B5867', // ink-mid
    colorBackground: 'transparent',
    colorInputBackground: '#FFFFFF',
    colorInputText: '#1F2A37',
    colorDanger: '#C0392B',
    borderRadius: '0.75rem',
    fontFamily: 'var(--font-montserrat)',
    fontSize: '0.875rem',
  },
  elements: {
    // La page rend déjà son propre titre (typo Fraunces) et son lien de bas de
    // page : on masque ceux de Clerk pour éviter les doublons.
    header: 'hidden',
    footer: 'hidden',
    // Pas de boutons sociaux : l'instance n'utilise que email + mot de passe.
    socialButtons: 'hidden',
    dividerRow: 'hidden',
  },
  layout: {
    showOptionalFields: false,
  },
}
