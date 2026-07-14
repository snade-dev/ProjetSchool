"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { SendHorizonal, X } from "lucide-react";
import UploadField from "@/components/UploadField";
import { sendMessage } from "@/lib/actions/messageAction";

/**
 * W16 — zone d'envoi du fil : textarea + pièce jointe optionnelle (flux
 * /api/upload existant, image ou PDF depuis W14). Le serveur revérifie la
 * mise en relation (canMessage) à chaque envoi.
 */
const MessageComposer = ({ receiverId }: { receiverId: string }) => {
  const [content, setContent] = useState("");
  const [fileUrl, setFileUrl] = useState<string | undefined>(undefined);
  const [pending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  const send = () => {
    const text = content.trim();
    if (!text || pending) return;
    startTransition(async () => {
      const res = await sendMessage(
        { success: false, error: false },
        { receiverId, content: text, fileUrl: fileUrl ?? "" }
      );
      if (res.success) {
        setContent("");
        setFileUrl(undefined);
        router.refresh();
        textareaRef.current?.focus();
      } else {
        toast.error(res.message ?? "Erreur lors de l'envoi.");
      }
    });
  };

  return (
    <div className="border-t border-gray-100 pt-3">
      {fileUrl && (
        <div className="mb-2 flex items-center gap-2 text-xs text-gray-500">
          <span className="rounded-full bg-gray-100 px-3 py-1">
            Pièce jointe prête ({fileUrl.endsWith(".pdf") ? "PDF" : "image"})
          </span>
          <button
            type="button"
            onClick={() => setFileUrl(undefined)}
            className="text-gray-400 hover:text-red-500"
            aria-label="Retirer la pièce jointe"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={2}
            placeholder="Écrire un message… (Entrée pour envoyer, Maj+Entrée pour un saut de ligne)"
            className="w-full resize-none rounded-md p-2.5 text-sm outline-none ring-[1.5px] ring-gray-300 transition focus:ring-2 focus:ring-lamaSky"
          />
          <UploadField
            label="Joindre un document (image ou PDF)"
            value={fileUrl}
            onChange={setFileUrl}
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
          />
        </div>
        <button
          type="button"
          onClick={send}
          disabled={pending || !content.trim()}
          className="mb-6 flex items-center gap-1.5 rounded-full bg-lamaSky px-4 py-2 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-40"
        >
          <SendHorizonal size={14} />
          {pending ? "Envoi…" : "Envoyer"}
        </button>
      </div>
    </div>
  );
};

export default MessageComposer;
