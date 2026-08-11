"use client";

import { supabase } from "./supabase/client";

export class ApiError extends Error {}

export async function authedPost<T>(path: string, body: unknown): Promise<T> {
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  if (!session) throw new ApiError("You need to sign in again.");

  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new ApiError("The server sent back something unexpected. Please try again.");
  }

  if (!res.ok) {
    const message = (json as { error?: string })?.error ?? "Something went wrong.";
    throw new ApiError(message);
  }
  return json as T;
}
