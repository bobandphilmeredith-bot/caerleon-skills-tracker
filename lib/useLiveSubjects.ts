"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { SubjectConfig } from "@/lib/types";

const subjectSelect = "id, school_id, name";

export function useLiveSubjects(schoolId: string) {
  const [subjects, setSubjects] = useState<SubjectConfig[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadSubjects() {
      if (!supabase || !looksLikeUuid(schoolId)) {
        setSubjects([]);
        setError(null);
        return;
      }

      setLoading(true);
      const { data, error: queryError } = await supabase
        .from("subjects")
        .select(subjectSelect)
        .eq("school_id", schoolId)
        .order("name", { ascending: true });

      if (cancelled) return;
      setLoading(false);
      if (queryError) {
        setSubjects([]);
        setError(queryError.message);
        return;
      }

      setError(null);
      setSubjects(
        ((data ?? []) as Array<{ id: string; school_id: string; name: string }>).map((row, index) => ({
          id: row.id,
          schoolId: row.school_id,
          name: row.name,
          shortName: row.name,
          active: true,
          displayOrder: index + 1,
          appearsInMappingDropdowns: true
        }))
      );
    }

    void loadSubjects();
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  return { subjects, error, loading, select: subjectSelect };
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
