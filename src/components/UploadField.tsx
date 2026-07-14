"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Loader2, Upload } from "lucide-react";

// Champ d'upload local (remplace CldUploadWidget) : envoie le fichier à
// /api/upload et remonte l'URL /uploads/… au parent via onChange.
const UploadField = ({
  label,
  value,
  onChange,
  accept = "image/jpeg,image/png,image/webp,image/gif",
}: {
  label: string;
  value?: string;
  onChange: (url: string) => void;
  /** W14 — types acceptés (ex : "...,application/pdf" pour les devoirs). */
  accept?: string;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Échec du téléversement");
      } else {
        onChange(json.url);
      }
    } catch {
      setError("Échec du téléversement");
    } finally {
      setUploading(false);
      // permet de re-sélectionner le même fichier
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 disabled:text-gray-300 cursor-pointer w-max"
      >
        {uploading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Upload size={16} />
        )}
        <span>{uploading ? "Téléversement…" : label}</span>
      </button>
      {value && !uploading && (
        <span className="flex items-center gap-1.5 text-xs text-green-600">
          <CheckCircle2 size={14} />
          {value.endsWith(".pdf") ? (
            "Fichier joint (PDF)"
          ) : (
            <>
              Image jointe
              {/* aperçu de l'image locale */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt=""
                className="ml-1 h-8 w-8 rounded-full object-cover ring-1 ring-gray-200"
              />
            </>
          )}
        </span>
      )}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
};

export default UploadField;
