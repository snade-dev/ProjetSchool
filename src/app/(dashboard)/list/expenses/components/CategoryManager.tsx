"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Trash, Tag } from "lucide-react";
import {
  createExpenseCategory,
  deleteExpenseCategory,
} from "@/lib/actions/expenseAction";

type Category = { id: number; name: string };

const CategoryManager = ({ categories }: { categories: Category[] }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const handleAdd = () => {
    setErrorMsg(null);
    if (name.trim().length < 2) {
      setErrorMsg("Le nom de la catégorie est requis (min. 2 caractères)");
      return;
    }
    startTransition(async () => {
      const res = await createExpenseCategory(
        { success: false, error: false },
        { name: name.trim() }
      );
      if (res.success) {
        toast("Catégorie ajoutée");
        setName("");
        router.refresh();
      } else {
        setErrorMsg(res.message ?? "Une erreur est survenue");
      }
    });
  };

  const handleDelete = (id: number) => {
    setErrorMsg(null);
    const fd = new FormData();
    fd.set("id", String(id));
    startTransition(async () => {
      const res = await deleteExpenseCategory(
        { success: false, error: false },
        fd
      );
      if (res.success) {
        toast("Catégorie supprimée");
        router.refresh();
      } else {
        setErrorMsg(res.message ?? "Une erreur est survenue");
        toast.error(res.message ?? "Une erreur est survenue");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-500 underline"
      >
        <Tag size={14} />
        Gérer les catégories
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="relative w-[90%] md:w-[50%] lg:w-[35%] max-h-[90vh] overflow-y-auto bg-white p-6 rounded-md">
            <h1 className="text-lg font-semibold mb-4">
              Catégories de dépenses
            </h1>

            {/* Ajout */}
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nouvelle catégorie"
                className="ring-[1.5px] ring-gray-300 rounded-md text-sm p-2 flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAdd}
                className="bg-blue-400 text-white text-sm px-4 py-2 rounded-md"
              >
                Ajouter
              </button>
            </div>

            {errorMsg && (
              <p className="text-xs text-red-500 mb-3">{errorMsg}</p>
            )}

            {/* Liste */}
            <ul className="flex flex-col gap-2">
              {categories.length === 0 && (
                <li className="text-sm text-gray-400">Aucune catégorie</li>
              )}
              {categories.map((cat) => (
                <li
                  key={cat.id}
                  className="flex items-center justify-between text-sm border-b border-gray-100 py-2"
                >
                  <span>{cat.name}</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(cat.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-lamaPurple"
                    title="Supprimer"
                  >
                    <Trash size={14} />
                  </button>
                </li>
              ))}
            </ul>

            <div
              className="absolute top-4 right-4 cursor-pointer text-gray-400"
              onClick={() => {
                setOpen(false);
                setErrorMsg(null);
              }}
            >
              ✕
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CategoryManager;
