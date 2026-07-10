"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Eye, EyeOff, Loader2 } from "lucide-react";

// Changement du mot de passe du compte CONNECTÉ (better-auth changePassword :
// exige le mot de passe actuel, révoque les autres sessions).
const ChangePasswordForm = () => {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (next.length < 8) {
      setMessage({ ok: false, text: "Le nouveau mot de passe doit faire au moins 8 caractères." });
      return;
    }
    if (next !== confirm) {
      setMessage({ ok: false, text: "Les deux nouveaux mots de passe ne correspondent pas." });
      return;
    }
    setLoading(true);
    const { error } = await authClient.changePassword({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions: true,
    });
    setLoading(false);
    if (error) {
      setMessage({
        ok: false,
        text:
          error.status === 400 || /password/i.test(error.message ?? "")
            ? "Mot de passe actuel incorrect."
            : error.message ?? "Le changement de mot de passe a échoué.",
      });
    } else {
      setMessage({ ok: true, text: "Mot de passe changé. Vos autres sessions ont été déconnectées." });
      setCurrent("");
      setNext("");
      setConfirm("");
    }
  };

  const inputCls =
    "w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 pr-10 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky";

  const field = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    autoComplete: string
  ) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          required
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Masquer les mots de passe" : "Afficher les mots de passe"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {field("Mot de passe actuel", current, setCurrent, "current-password")}
      <div className="grid gap-4 sm:grid-cols-2">
        {field("Nouveau mot de passe", next, setNext, "new-password")}
        {field("Confirmer le nouveau", confirm, setConfirm, "new-password")}
      </div>

      {message && (
        <p
          className={`rounded-md p-3 text-xs leading-relaxed ring-1 ${
            message.ok
              ? "bg-green-50 text-green-700 ring-green-100"
              : "bg-red-50 text-red-600 ring-red-100"
          }`}
        >
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="drawer-hero-bg flex w-max items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
      >
        {loading && <Loader2 size={15} className="animate-spin" />}
        {loading ? "Un instant…" : "Changer le mot de passe"}
      </button>
    </form>
  );
};

export default ChangePasswordForm;
