"use client";

import { useRouter, useSearchParams } from "next/navigation";

export const useHandleFilterChange = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    value ? params.set(key, value) : params.delete(key);
    router.push(`?${params.toString()}`);
  };
};
