import "server-only";
import { headers } from "next/headers";
import { auth } from "./auth";

export async function getSessionInfo() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return { userId: session.user.id, role: session.user.role ?? "guest" };
}

export async function requireRole(roles: string[]) {
  const info = await getSessionInfo();
  if (!info || !roles.includes(info.role)) throw new Error("FORBIDDEN");
  return info;
}
