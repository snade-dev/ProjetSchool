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

export async function middleware(request: NextRequest) {
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

	// Vérifier si la route actuelle est dans la configuration
	for (const [route, allowedRoles] of Object.entries(routeAccessMap)) {
		if (path.startsWith(route)) {
			// Si le rôle de l'utilisateur n'est pas autorisé
			if (!allowedRoles.includes(role)) {
				// Rediriger vers la page correspondant au rôle
				return NextResponse.redirect(new URL(`/${role}`, request.url));
			}
			break;
		}
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - api (API routes)
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - public folder
		 * - sign-in (page de connexion)
		 * - sign-up (page d'inscription)
		 */
		"/((?!api|_next/static|_next/image|favicon.ico|public|sign-in|sign-up).*)",
	],
};

