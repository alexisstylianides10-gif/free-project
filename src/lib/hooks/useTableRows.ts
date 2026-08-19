"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface Options {
  orderBy?: { column: string; ascending?: boolean };
  eq?: Record<string, string | number | boolean>;
}

/**
 * Generic per-user table reader: fetches every row in `table` scoped to
 * `user_id = userId` (RLS enforces this server-side regardless, but we
 * still filter client-side so the query doesn't pull other rows the policy
 * would reject anyway) and exposes {data, loading, error, refetch}. Every
 * FutureOS list screen (homework, exams, timetable, missions, ...) reads
 * through this instead of hand-rolling its own fetch effect.
 */
export function useTableRows<T>(table: string, userId: string | undefined, options: Options = {}) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    if (!supabase || !userId) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let query = supabase.from(table).select("*").eq("user_id", userId);
    if (options.eq) {
      for (const [col, val] of Object.entries(options.eq)) query = query.eq(col, val);
    }
    if (options.orderBy) {
      query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true });
    }
    const { data: rows, error: err } = await query;
    if (err) {
      setError(err.message);
      setData([]);
    } else {
      setError(null);
      setData((rows ?? []) as T[]);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, userId, JSON.stringify(options)]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  return { data, loading, error, refetch: fetchRows };
}
