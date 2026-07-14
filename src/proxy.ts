/**
 * Middleware de gestion des accès basé sur les rôles utilisateur
 * Utilise Clerk pour l'authentification et la gestion des sessions
 */

import { routeAccessMap } from "./lib/setting";

// Création des matchers de routes à partir de la configuration
// const matchers = Object.keys(routeAccessMap).map((route) => ({
//   matcher: createRouteMatcher(route), // Crée un vérificateur de route
//   allowedRoutes: routeAccessMap[route], // Récupère les rôles autorisés
// }));


import { NextRequest, NextResponse } from "next/server";
import { betterFetch } from "@better-fetch/fetch";
import { auth } from "./lib/auth";

type Session = typeof auth.$Infer.Session;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/" || pathname === "/sign-in" || pathname === "/sign-up" || pathname === "/register-school") {
    return NextResponse.next();
  }

	const { data: session } = await betterFetch<Session>("/api/auth/get-session", {
		baseURL: request.nextUrl.origin,
		headers: {
			cookie: request.headers.get("cookie") || "", // Forward the cookies from the request
		},
	});

  console.log(session);

//   const session = await auth.api.getSession({
//     headers: await headers()
// })

	// Si pas de session, rediriger vers la page de connexion
	if (!session) {
		return NextResponse.redirect(new URL("/sign-in", request.url));
	}

	const role = session.user?.role || "guest";
	const path = request.nextUrl.pathname;

	// Vérifier si la route actuelle est dans la configuration.
	// W07 — les clés héritées « /xxx(.*) » ne matchaient JAMAIS avec un
	// startsWith littéral (path "/admin" ne commence pas par "/admin(.*)") :
	// /admin, /teacher, /quiz… n'étaient pas gardés par le proxy. On retire le
	// suffixe (.*) et on matche par segment (égalité ou préfixe + "/") pour
	// éviter les collisions de préfixes ("/account" vs "/accountant").
	for (const [route, allowedRoles] of Object.entries(routeAccessMap)) {
		const base = route.replace(/\(\.\*\)$/, "");
		if (path === base || path.startsWith(base + "/")) {
			// Si le rôle de l'utilisateur n'est pas autorisé
			if (!allowedRoles.includes(role)) {
				// Rediriger vers la page correspondant au rôle (V04 : superadmin → /platform)
				const home = role === "superadmin" ? "/platform" : `/${role}`;
				return NextResponse.redirect(new URL(home, request.url));
			}
			break;
		}
	}

	return NextResponse.next();
}


// Configure middleware to exclude static files and Next.js internals
// In Next.js 16, middleware intercepts ALL requests by default, including static files
// This matcher excludes files with extensions (static assets) from middleware processing
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - auth pages that must remain public
     * - favicon.ico (favicon file)
     * - files with extensions (static assets like .png, .svg, etc.)
     */
    '/((?!api|_next/static|_next/image|sign-in|sign-up|favicon.ico|.*\\..*).*)',
  ],
};