"use client";

import { useState } from "react";
import { FieldError } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";

type InputFieldProps = {
  label: string;
  type?: string;
  register: any;
  name: string;
  defaultValue?: string | number;
  error?: FieldError;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  hidden?: boolean;
};

// Champ harmonisé sur le style des pages d'authentification (AuthField) :
// même ring, même focus lamaSky, œil pour les mots de passe.
const InputField = ({
  label,
  type = "text",
  register,
  name,
  defaultValue,
  error,
  inputProps,
  hidden,
}: InputFieldProps) => {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const effectiveType = isPassword && visible ? "text" : type;

  return (
    <div className={hidden ? "hidden" : "flex flex-col gap-1.5 w-full md:w-1/4"}>
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <div className="relative">
        <input
          type={effectiveType}
          {...register(name)}
          className={`w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 ${
            isPassword ? "pr-10" : ""
          } text-sm text-gray-800 placeholder:text-gray-300 outline-none transition focus:ring-2 focus:ring-lamaSky`}
          {...inputProps}
          defaultValue={defaultValue}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setVisible((v) => !v)}
            aria-label={
              visible ? "Masquer le mot de passe" : "Afficher le mot de passe"
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error?.message && (
        <p className="text-red-400 text-xs">{error?.message.toString()}</p>
      )}
    </div>
  );
};
export default InputField;
