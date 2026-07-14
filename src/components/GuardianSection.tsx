"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import {
  addGuardian,
  removeGuardian,
  updateGuardian,
} from "@/lib/actions/guardianAction";

/**
 * W05 — section « Tuteurs » de la fiche élève (§2.2.3) : liste des tuteurs
 * avec lien de parenté et droits différenciés ; CRUD réservé à l'admin
 * (ajouter/retirer un parent existant, modifier relation et droits).
 */

export type GuardianRow = {
  id: number;
  relationship: string;
  isLegal: boolean;
  canPay: boolean;
  canViewGrades: boolean;
  canPickup: boolean;
  parent: {
    id: string;
    name: string;
    surname: string;
    username: string;
    phone: string | null;
  };
};

export type ParentOption = {
  id: string;
  name: string;
  surname: string;
  username: string;
};

const RELATIONSHIPS = ["père", "mère", "tuteur légal", "tuteur de fait"];

const EMPTY_STATE = { success: false, error: false, message: "" };

type RightsState = {
  relationship: string;
  isLegal: boolean;
  canPay: boolean;
  canViewGrades: boolean;
  canPickup: boolean;
};

const RIGHT_LABELS: {
  key: keyof Omit<RightsState, "relationship">;
  label: string;
}[] = [
  { key: "isLegal", label: "Tuteur légal" },
  { key: "canPay", label: "Peut payer" },
  { key: "canViewGrades", label: "Voit les notes" },
  { key: "canPickup", label: "Peut récupérer l'enfant" },
];

/** Cases à cocher des droits (partagées entre ajout et édition). */
function RightsFields({
  value,
  onChange,
}: {
  value: RightsState;
  onChange: (v: RightsState) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {RIGHT_LABELS.map(({ key, label }) => (
        <label
          key={key}
          className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer"
        >
          <input
            type="checkbox"
            checked={value[key]}
            onChange={(e) => onChange({ ...value, [key]: e.target.checked })}
            className="accent-lamaPurple"
          />
          {label}
        </label>
      ))}
    </div>
  );
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[11px] ${
        ok
          ? "bg-green-50 text-green-700 ring-1 ring-green-100"
          : "bg-gray-100 text-gray-400 line-through"
      }`}
    >
      {label}
    </span>
  );
}

const GuardianSection = ({
  studentId,
  guardians,
  parents,
  canManage,
}: {
  studentId: string;
  guardians: GuardianRow[];
  parents: ParentOption[];
  canManage: boolean;
}) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [newParentId, setNewParentId] = useState("");
  const [newRights, setNewRights] = useState<RightsState>({
    relationship: "tuteur légal",
    isLegal: true,
    canPay: true,
    canViewGrades: true,
    canPickup: false,
  });
  const [editRights, setEditRights] = useState<RightsState>(newRights);

  // Parents pas encore tuteurs de cet élève
  const availableParents = parents.filter(
    (p) => !guardians.some((g) => g.parent.id === p.id)
  );

  const run = (fn: () => Promise<{ success: boolean; message: string }>) =>
    startTransition(async () => {
      const res = await fn();
      if (res.success) {
        toast("Tuteurs mis à jour !");
        setAdding(false);
        setEditingId(null);
        router.refresh();
      } else {
        toast.error(res.message || "Une erreur s'est produite");
      }
    });

  const submitAdd = () => {
    if (!newParentId) {
      toast.error("Choisissez un parent.");
      return;
    }
    run(() =>
      addGuardian(EMPTY_STATE, {
        studentId,
        parentId: newParentId,
        ...newRights,
      })
    );
  };

  const submitEdit = (g: GuardianRow) =>
    run(() =>
      updateGuardian(EMPTY_STATE, {
        id: g.id,
        studentId,
        parentId: g.parent.id,
        ...editRights,
      })
    );

  const submitRemove = (g: GuardianRow) => {
    if (
      !window.confirm(
        `Retirer ${g.parent.name} ${g.parent.surname} des tuteurs de cet élève ?`
      )
    )
      return;
    const fd = new FormData();
    fd.set("id", String(g.id));
    run(() => removeGuardian(EMPTY_STATE, fd));
  };

  return (
    <div className="mt-4 bg-white rounded-md p-4">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-lg font-semibold">Tuteurs</h1>
        {canManage && !adding && (
          <button
            onClick={() => {
              setAdding(true);
              setEditingId(null);
            }}
            className="flex items-center gap-1 rounded-md bg-lamaYellow px-3 py-1.5 text-xs font-medium hover:opacity-90"
          >
            <Plus size={14} /> Ajouter un tuteur
          </button>
        )}
      </div>

      {guardians.length === 0 ? (
        <p className="text-sm text-gray-400">Aucun tuteur enregistré.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-200">
              <th className="p-2">Tuteur</th>
              <th className="p-2 hidden md:table-cell">Lien</th>
              <th className="p-2">Droits</th>
              {canManage && <th className="p-2 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {guardians.map((g) => (
              <tr
                key={g.id}
                className="border-b border-gray-100 even:bg-slate-50 align-top"
              >
                <td className="p-2">
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {g.parent.name} {g.parent.surname}
                    </span>
                    <span className="text-xs text-gray-400">
                      {g.parent.username}
                      {g.parent.phone ? ` · ${g.parent.phone}` : ""}
                    </span>
                  </div>
                </td>
                {editingId === g.id ? (
                  <>
                    <td className="p-2 hidden md:table-cell">
                      <select
                        value={editRights.relationship}
                        onChange={(e) =>
                          setEditRights({
                            ...editRights,
                            relationship: e.target.value,
                          })
                        }
                        className="rounded-md ring-1 ring-gray-300 bg-white p-1.5 text-xs outline-none"
                      >
                        {RELATIONSHIPS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                        {!RELATIONSHIPS.includes(editRights.relationship) && (
                          <option value={editRights.relationship}>
                            {editRights.relationship}
                          </option>
                        )}
                      </select>
                    </td>
                    <td className="p-2">
                      <RightsFields value={editRights} onChange={setEditRights} />
                    </td>
                    <td className="p-2">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => submitEdit(g)}
                          disabled={pending}
                          className="rounded-md bg-lamaSky px-3 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-50"
                        >
                          Enregistrer
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded-md bg-gray-100 p-1.5 hover:bg-gray-200"
                          title="Annuler"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-2 hidden md:table-cell capitalize">
                      {g.relationship}
                    </td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        <Badge ok={g.isLegal} label="Légal" />
                        <Badge ok={g.canPay} label="Paiement" />
                        <Badge ok={g.canViewGrades} label="Notes" />
                        <Badge ok={g.canPickup} label="Récupération" />
                      </div>
                    </td>
                    {canManage && (
                      <td className="p-2">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingId(g.id);
                              setAdding(false);
                              setEditRights({
                                relationship: g.relationship,
                                isLegal: g.isLegal,
                                canPay: g.canPay,
                                canViewGrades: g.canViewGrades,
                                canPickup: g.canPickup,
                              });
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-lamaSky"
                            title="Modifier"
                          >
                            <Pencil size={14} className="text-white" />
                          </button>
                          <button
                            onClick={() => submitRemove(g)}
                            disabled={pending}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-red-100 disabled:opacity-50"
                            title="Retirer"
                          >
                            <Trash2 size={14} className="text-red-600" />
                          </button>
                        </div>
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {canManage && adding && (
        <div className="mt-3 rounded-md bg-lamaSkyLight/50 p-3 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={newParentId}
              onChange={(e) => setNewParentId(e.target.value)}
              className="rounded-md ring-1 ring-gray-300 bg-white p-2 text-xs outline-none min-w-[220px]"
            >
              <option value="">— Choisir un parent existant —</option>
              {availableParents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.surname} ({p.username})
                </option>
              ))}
            </select>
            <select
              value={newRights.relationship}
              onChange={(e) =>
                setNewRights({ ...newRights, relationship: e.target.value })
              }
              className="rounded-md ring-1 ring-gray-300 bg-white p-2 text-xs outline-none"
            >
              {RELATIONSHIPS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <RightsFields value={newRights} onChange={setNewRights} />
          <div className="flex items-center gap-2">
            <button
              onClick={submitAdd}
              disabled={pending}
              className="rounded-md bg-lamaSky px-3 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-50"
            >
              Ajouter
            </button>
            <button
              onClick={() => setAdding(false)}
              className="rounded-md bg-gray-100 px-3 py-1.5 text-xs hover:bg-gray-200"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuardianSection;
