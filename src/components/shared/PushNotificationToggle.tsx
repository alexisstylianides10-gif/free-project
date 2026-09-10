"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { authedFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";

type Status = "checking" | "unsupported" | "needs-install" | "denied" | "off" | "on" | "busy";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return !!standalone || !!iosStandalone;
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/**
 * Enables real OS-level push notifications (lock screen / notification tray),
 * not just the in-app bell. Android Chrome supports this from a plain
 * browser tab; iOS Safari only supports Web Push once the app is added to
 * the home screen (iOS 16.4+) — this component detects that gap and tells
 * the student to install first rather than silently failing.
 */
export function PushNotificationToggle() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    async function check() {
      if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      if (isIOS() && !isStandalone()) {
        setStatus("needs-install");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      try {
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        setStatus(existing ? "on" : "off");
      } catch {
        setStatus("off");
      }
    }
    check();
  }, []);

  async function enable() {
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;
    setStatus("busy");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      });
      const json = subscription.toJSON();
      await authedFetch("/api/push/subscribe", {
        method: "POST",
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      setStatus("on");
    } catch {
      setStatus("off");
    }
  }

  async function disable() {
    setStatus("busy");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await authedFetch("/api/push/unsubscribe", { method: "POST", body: JSON.stringify({ endpoint: subscription.endpoint }) });
        await subscription.unsubscribe();
      }
      setStatus("off");
    } catch {
      setStatus("on");
    }
  }

  if (status === "checking") return null;

  if (status === "unsupported") {
    return <p className="text-xs text-muted-foreground">Push notifications aren&apos;t supported in this browser.</p>;
  }

  if (status === "needs-install") {
    return (
      <p className="text-xs text-muted-foreground">
        On iPhone, add {`Alxioum`} to your Home Screen first (Share → Add to Home Screen), then come back here to turn on notifications.
      </p>
    );
  }

  if (status === "denied") {
    return (
      <p className="text-xs text-muted-foreground">
        Notifications are blocked for this app in your browser/phone settings. Enable them there, then come back here.
      </p>
    );
  }

  if (status === "on") {
    return (
      <Button variant="secondary" size="sm" onClick={disable}>
        <BellOff className="h-3.5 w-3.5" />
        Turn off notifications
      </Button>
    );
  }

  return (
    <Button size="sm" onClick={enable} disabled={status === "busy"}>
      {status === "busy" ? <BellRing className="h-3.5 w-3.5 animate-pulse" /> : <Bell className="h-3.5 w-3.5" />}
      {status === "busy" ? "Enabling…" : "Turn on notifications"}
    </Button>
  );
}
