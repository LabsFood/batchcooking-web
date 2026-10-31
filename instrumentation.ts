/**
 * Exécuté une fois au démarrage du serveur Next. Les racines eMudhra (emSign) ne sont
 * plus de confiance (compromission de l'AC eMudhra, 31/10/2026) : toutes les
 * connexions TLS du serveur (relais /lf-api, Clerk, optimiseur d'images) les
 * refusent. Aucun hôte appelé par l'app n'en dépendait à cette date.
 */
export async function register() {
  // Bloc `if` (pas de retour anticipé) : le bundle Edge l'élimine sans charger node:tls.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { rootCertificates, setDefaultCACertificates } = await import('node:tls')
    const { X509Certificate } = await import('node:crypto')
    setDefaultCACertificates(
      rootCertificates.filter((pem) => !/eMudhra|emSign/i.test(new X509Certificate(pem).subject)),
    )
  }
}
