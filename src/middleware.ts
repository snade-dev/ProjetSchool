/**
 * Middleware de gestion des accès basé sur les rôles utilisateur
 * Utilise Clerk pour l'authentification et la gestion des sessions
 */

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { routeAccessMap } from "./lib/setting";
import { NextResponse } from "next/server";

// Création des matchers de routes à partir de la configuration
const matchers = Object.keys(routeAccessMap).map((route) => ({
  matcher: createRouteMatcher(route), // Crée un vérificateur de route
  allowedRoutes: routeAccessMap[route], // Récupère les rôles autorisés
}));

export default clerkMiddleware(async (auth, req) => {
  // Récupération des informations de session
  const { sessionClaims } = await auth();
  
  // Extraction du rôle utilisateur depuis les métadonnées
  const role = (sessionClaims?.metadata as { role?: string })?.role || "guest";

  // Vérification des accès pour chaque route configurée
  for (const { matcher, allowedRoutes } of matchers) {
    if (matcher(req) && !allowedRoutes.includes(role)) {
      // Redirection si l'accès est refusé
      return NextResponse.redirect(new URL(`/${role}`, req.url));
    }
  }
});

export const config = {
  matcher: [
    /**
     * Applique le middleware à toutes les routes sauf :
     * - Les fichiers internes de Next.js
     * - Les fichiers statiques (images, CSS, JS, etc.)
     * - Les routes spécifiées dans les paramètres de recherche
     */
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    
    // Applique toujours le middleware aux routes API et TRPC
    '/(api|trpc)(.*)',
  ],
};