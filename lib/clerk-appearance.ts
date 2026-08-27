/**
 * Habillage partagé des composants <SignIn /> et <SignUp />.
 *
 * On réutilise les classes maison (`input-base`, `btn btn-primary`,
 * `label-muted`) définies dans globals.css pour que les champs Clerk soient
 * indiscernables des autres formulaires du site. Le titre, le sous-titre et le
 * lien de bas de page sont masqués : les pages les rendent déjà elles-mêmes
 * avec la typo Fraunces.
 */
export const clerkAuthAppearance = {
  variables: {
    colorPrimary: '#F39C12', // terra / amber
    colorText: '#1F2A37', // ink
    colorTextSecondary: '#4B5867', // ink-mid
    colorBackground: 'transparent',
    colorInputBackground: '#FFFFFF',
    colorDanger: '#C0392B',
    borderRadius: '0.75rem',
    fontFamily: 'var(--font-montserrat)',
  },
  elements: {
    rootBox: 'w-full',
    cardBox: 'w-full shadow-none border-none',
    card: 'w-full bg-transparent shadow-none border-none p-0 gap-5',
    header: 'hidden',
    footer: 'hidden',
    formFieldLabel: 'label-muted mb-2',
    formFieldInput: 'input-base',
    formButtonPrimary:
      'btn btn-primary w-full normal-case tracking-normal text-sm shadow-none',
    formFieldAction: 'text-sm text-terra hover:underline font-medium',
    identityPreviewEditButton: 'text-terra',
    formResendCodeLink: 'text-terra font-medium',
    otpCodeFieldInput: 'input-base text-center',
    dividerRow: 'hidden',
    socialButtons: 'hidden',
  },
  layout: {
    socialButtonsPlacement: 'bottom',
    showOptionalFields: false,
  },
}
