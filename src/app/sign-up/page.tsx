import { redirect } from "next/navigation";

/**
 * V07bis — plus d'inscription publique de comptes individuels : les comptes à
 * rôle (enseignant, élève, parent) sont créés par l'admin de chaque école, et
 * les admins d'école par la création d'établissement. Les anciens liens
 * /sign-up mènent donc à la création d'école.
 */
export default function SignUpRedirect() {
  redirect("/register-school");
}
