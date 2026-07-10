import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

// Sert les images téléversées depuis uploads/ (racine du projet).
// Nécessaire car `next start` ne sert pas les fichiers ajoutés à public/
// après le build. Les noms sont générés par /api/upload (hex + extension) :
// tout autre motif est refusé (pas de traversée de chemin possible).

const NAME_RE = /^[0-9]+-[a-f0-9]+\.(jpg|png|webp|gif)$/;

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  if (!NAME_RE.test(name)) {
    return NextResponse.json({ error: "Nom invalide" }, { status: 400 });
  }

  try {
    const file = await readFile(path.join(process.cwd(), "uploads", name));
    const ext = name.split(".").pop()!;
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": CONTENT_TYPES[ext],
        // nom unique par téléversement -> cache long sans risque
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
}
