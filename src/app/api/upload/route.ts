import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { requireRole } from "@/lib/authGuard";

// Stockage LOCAL des images (remplace Cloudinary) : les fichiers sont écrits
// dans uploads/ à la racine du projet (PAS public/ : `next start` ne sert pas
// les fichiers ajoutés à public/ après le build) et servis par la route
// GET /uploads/[name]. Le dossier est gitignoré (données d'exploitation).

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  // W14 — pièces jointes de devoirs (sujets, fiches d'exercices)
  "application/pdf": "pdf",
};

const MAX_SIZE = 5 * 1024 * 1024; // 5 Mo

export async function POST(req: NextRequest) {
  try {
    // W07 — accountant : justificatifs de dépenses (ExpenseForm).
    // W14 — director/teacher : pièces jointes de devoirs (HomeworkForm).
    await requireRole(["admin", "director", "accountant", "teacher"]);
  } catch {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Aucun fichier reçu" }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Format non supporté (JPEG, PNG, WebP ou GIF uniquement)" },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Fichier trop volumineux (5 Mo maximum)" },
      { status: 400 }
    );
  }

  // Nom aléatoire : jamais le nom d'origine (collisions, caractères spéciaux, path traversal)
  const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
  const dir = path.join(process.cwd(), "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ url: `/uploads/${name}` });
}
