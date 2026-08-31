import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Les deux espaces connectés sont privés. Le reste du site (vitrine, menu,
// réservation publique) reste accessible sans compte — la gate de réservation
// côté client s'occupe d'inviter à se connecter au bon moment.
//
// `/espace-chef` manquait ici : il répondait 200 à un visiteur anonyme et ne
// s'appuyait que sur la garde client de son layout.
const isProtectedRoute = createRouteMatcher([
  '/espace-client(.*)',
  '/espace-chef(.*)',
])

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
