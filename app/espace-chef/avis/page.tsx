import ChefPage, { Card, Empty } from '@/components/chef/ChefPage'

/* Les avis clients ne sont pas encore recueillis : l'API n'a pas de route
   d'avis. La page affichait jusqu'ici des avis fictifs, les mêmes pour chaque
   batch cooker, qu'un vrai candidat prenait pour les siens. */
export default function ChefReviewsPage() {
  return (
    <ChefPage title="Avis" subtitle="Ce que vos clients retiennent de vos prestations.">
      <Card>
        <Empty text="Aucun avis pour le moment. Ceux de vos clients s’afficheront ici après vos premières prestations." />
      </Card>
    </ChefPage>
  )
}
