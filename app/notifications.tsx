"use client";
import { useRef, useState } from "react";
import { Bell, CheckCheck, X } from "lucide-react";

export default function Notifications({ items, unread, onRefresh, onTask }: { items: any[]; unread: number; onRefresh: () => Promise<void>; onTask: (id: string) => void }) {
  const popup = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const markRead = async (ids: string[]) => {
    if (!ids.length) return true;
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/work", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "readNotifications", ids }) });
      if (!response.ok) throw new Error();
      await onRefresh(); return true;
    } catch { setError("Chưa thể đánh dấu đã đọc. Vui lòng thử lại."); return false; }
    finally { setSaving(false); }
  };
  return <div className="notification-control">
    <button className="notification-bell" type="button" aria-label={`Thông báo, ${unread} chưa đọc`} aria-expanded={open} popoverTarget="notification-popup"><Bell size={23} />{unread > 0 && <span className="notification-count">{unread > 99 ? "99+" : unread}</span>}</button>
    <div ref={popup} id="notification-popup" popover="auto" className="notification-popup" onToggle={event => setOpen(event.newState === "open")}>
      <div className="notification-heading"><div><h3>Thông báo</h3><p>{unread} thông báo chưa đọc</p></div><button type="button" aria-label="Đóng thông báo" onClick={() => popup.current?.hidePopover()}><X size={20} /></button></div>
      {items.some(item => !item.read_at) && <button className="notification-read-all" type="button" disabled={saving} onClick={() => markRead(items.filter(item => !item.read_at).map(item => item.id))}><CheckCheck size={17} />Đánh dấu danh sách đã đọc</button>}
      {error && <p role="alert" className="error">{error}</p>}
      <div className="notification-list">{items.length ? items.map(item => <button type="button" disabled={saving} key={item.id} className={`notification-item ${item.read_at ? "" : "unread"}`} onClick={async () => {
        if (!item.read_at && !await markRead([item.id])) return;
        popup.current?.hidePopover(); onTask(item.task_id);
      }}><span className="notification-item-dot" /><span><span className="notification-message">{item.message}</span><time>{new Date(item.created).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</time></span></button>) : <div className="notification-empty"><Bell size={28} /><p>Chưa có thông báo mới.</p></div>}</div>
    </div>
  </div>;
}
