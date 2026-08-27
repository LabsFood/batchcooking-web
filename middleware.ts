import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Tout l'espace client est privé. Le reste du site (vitrine, menu, réservation
// publique) reste accessible sans compte — la gate de réservation côté client
// s'occupe d'inviter à se connecter au bon moment.
const isProtectedRoute = createRouteMatcher(['/espace-client(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Ignore les fichiers statiques et les internals Next, sauf s'ils sont
    // présents dans les search params.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
