"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

interface ActionButtonsProps {
  item: any;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ActionButtons({ item, onEdit, onDelete }: ActionButtonsProps) {
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onEdit}
        className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 text-sm"
      >
        Modifier
      </button>
      <button
        onClick={onDelete}
        className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 text-sm"
      >
        Supprimer
      </button>
    </div>
  );
} 