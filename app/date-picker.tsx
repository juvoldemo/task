"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

const key = (day: Date) => `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
const todayInVietnam = () => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (name: string) => Number(parts.find(p => p.type === name)?.value);
  return new Date(part("year"), part("month") - 1, part("day"));
};

export default function DatePicker() {
  const [today] = useState(todayInVietnam);
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const calendar = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!open || !calendar.current) return;
    const popup = calendar.current;
    popup.showPopover();
    const position = () => {
      const field = trigger.current?.getBoundingClientRect();
      if (!field) return;
      const width = Math.min(Math.max(field.width, 280), window.innerWidth - 24);
      popup.style.width = `${width}px`;
      popup.style.left = `${Math.max(12, Math.min(field.left, window.innerWidth - width - 12))}px`;
      const below = window.innerHeight - field.bottom - 20;
      const above = field.top - 20;
      const height = popup.scrollHeight;
      const upwards = below < 180 && above > below;
      popup.style.maxHeight = `${Math.max(100, upwards ? above : below)}px`;
      popup.style.top = `${upwards ? Math.max(12, field.top - Math.min(height, above) - 8) : field.bottom + 8}px`;
    };
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      popup.hidePopover();
    };
  }, [open, month]);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);
  const choose = (day: Date) => { setValue(key(day)); setOpen(false); trigger.current?.focus(); };
  const first = (month.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return <div className="vn-date-picker" ref={root} onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); setOpen(false); trigger.current?.focus(); } }}>
    <input type="hidden" name="deadline" value={value} />
    <button ref={trigger} type="button" className={`vn-date-trigger ${value ? "has-value" : ""}`} aria-label="Hạn hoàn thành" aria-expanded={open} aria-controls="deadline-calendar" onClick={() => setOpen(!open)}>
      <span>{value ? value.split("-").reverse().join("/") : "Chọn ngày/tháng/năm"}</span><CalendarDays size={20} />
    </button>
    {open && <div ref={calendar} popover="manual" id="deadline-calendar" className="vn-calendar" role="group" aria-label="Lịch chọn hạn hoàn thành">
      <div className="vn-calendar-heading">
        <button type="button" aria-label="Tháng trước" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={20} /></button>
        <strong aria-live="polite">Tháng {month.getMonth() + 1}, {month.getFullYear()}</strong>
        <button type="button" aria-label="Tháng sau" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={20} /></button>
      </div>
      <div className="vn-calendar-grid">
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(label => <span className="vn-weekday" key={label}>{label}</span>)}
        {Array.from({ length: first }, (_, i) => <span key={`blank-${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const day = new Date(month.getFullYear(), month.getMonth(), i + 1);
          const selected = value === key(day);
          return <button key={i} type="button" className={`${selected ? "selected" : ""} ${key(day) === key(today) ? "today" : ""}`} aria-label={day.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} aria-pressed={selected} aria-current={key(day) === key(today) ? "date" : undefined} onClick={() => choose(day)}>{i + 1}</button>;
        })}
      </div>
      <div className="vn-calendar-footer"><button type="button" onClick={() => { setValue(""); setOpen(false); trigger.current?.focus(); }}>Xóa ngày</button><button type="button" onClick={() => { setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); choose(today); }}>Hôm nay</button></div>
    </div>}
  </div>;
}
