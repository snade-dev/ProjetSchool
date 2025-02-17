"use server";

import FormContainer from "@/components/FormContainer";

export async function renderResultActions(item: any, role: string) {
  if (role === "admin" || role === "teacher") {
    return (
      <>
        <FormContainer table="result" type="update" data={item} />
        <FormContainer table="result" type="delete" id={item.id} />
      </>
    );
  }
  return null;
}
