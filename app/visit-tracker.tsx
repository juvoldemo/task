"use client";
import { useEffect, useRef } from "react";

export default function VisitTracker({ userId, path }: { userId?: string; path: string }) {
  const previous = useRef("");
  useEffect(() => {
    if (!userId) { previous.current = ""; return; }
    const key = `${userId}:${path}`;
    if (previous.current === key) return;
    previous.current = key;
    void fetch("/api/work", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "visit", path }), keepalive: true }).catch(() => {});
  }, [userId, path]);
  return null;
}
