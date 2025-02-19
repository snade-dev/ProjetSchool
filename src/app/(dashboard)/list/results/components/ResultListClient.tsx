"use client";
import { useState, useEffect } from "react";

interface ResultsEffectProps {
  page: number;
  searchParams: { [key: string]: string | undefined };
}

const useResultsEffect = ({ page, searchParams }: ResultsEffectProps) => {
  const [localData, setLocalData] = useState<any>(null);

  useEffect(() => {
    // Si des résultats sont déjà stockés dans localStorage, on les charge
    const storedData = localStorage.getItem("resultsData");
    if (storedData) {
      setLocalData(JSON.parse(storedData));
    } else {
      // Si pas de données, on peut procéder à la récupération des résultats
      console.log("Fetching new results...");
    }
  }, [page, searchParams]);

  const updateLocalData = (newData: any) => {
    setLocalData(newData);
    localStorage.setItem("resultsData", JSON.stringify(newData));
  };

  return { localData, updateLocalData };
};

export default useResultsEffect;
