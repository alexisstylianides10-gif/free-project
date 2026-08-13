"use client";

import { useCallback, useEffect, useState } from "react";
import { useAlxioum } from "@/lib/store";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const getAccessToken = useAlxioum((s) => s.getAccessToken);
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ok = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && Notification.permission !== "denied";
    setSupported(ok && !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
    if (!ok) return;
    navigator.serviceWorker.ready.then(async (reg) => {
      const existing = await reg.pushManager.getSubscription();
      setSubscribed(!!existing);
    });
  }, []);

  const subscribe = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("Push isn't configured yet.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notification permission was denied.");

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      const json = sub.toJSON();

      const token = await getAccessToken();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Couldn't save subscription.");
      setSubscribed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't enable notifications.");
    } finally {
      setBusy(false);
    }
  }, [getAccessToken]);

  const unsubscribe = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        const token = await getAccessToken();
        if (token) {
          await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ endpoint }),
          }).catch(() => {});
        }
      }
      setSubscribed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't disable notifications.");
    } finally {
      setBusy(false);
    }
  }, [getAccessToken]);

  const sendTest = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      const res = await fetch("/api/push/test", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Couldn't send test notification.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send test notification.");
    } finally {
      setBusy(false);
    }
  }, [getAccessToken]);

  return { supported, subscribed, busy, error, subscribe, unsubscribe, sendTest };
}
