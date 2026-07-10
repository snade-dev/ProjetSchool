"use client";

import { useState } from "react";
import Image from "next/image";
import { Wallet } from "lucide-react";
import PaymentForm from "@/components/forms/PaymentForm";

const PaymentButton = ({
  invoiceId,
  balance,
}: {
  invoiceId: string;
  balance: number;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 bg-blue-400 text-white p-2 rounded-md w-full hover:bg-blue-500"
      >
        <Wallet size={16} />
        Encaisser un paiement
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="relative w-[90%] md:w-[70%] lg:w-[55%] xl:w-[45%] max-h-[90vh] overflow-y-auto bg-white p-6 rounded-md">
            <PaymentForm
              type="create"
              data={{ invoiceId, balance }}
              setOpen={setOpen}
            />
            <div
              className="absolute top-4 right-4 cursor-pointer"
              onClick={() => setOpen(false)}
            >
              <Image src="/close.png" alt="Fermer" width={14} height={14} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PaymentButton;
