"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

const priorities = ["Bình thường", "Cao", "Thấp"];

export default function PriorityPicker() {
  const [value, setValue] = useState("Bình thường");
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const choose = (priority: string) => { setValue(priority); setOpen(false); trigger.current?.focus(); };
  useLayoutEffect(() => {
    if (!open || !menu.current) return;
    const popup = menu.current;
    popup.showPopover();
    const position = () => {
      const box = trigger.current!.getBoundingClientRect();
      const width = Math.min(box.width, innerWidth - 24);
      popup.style.width = `${width}px`;
      popup.style.left = `${Math.max(12, Math.min(box.left, innerWidth - width - 12))}px`;
      const height = popup.offsetHeight;
      popup.style.top = `${box.bottom + height + 16 > innerHeight ? Math.max(12, box.top - height - 8) : box.bottom + 8}px`;
    };
    position();
    popup.querySelector<HTMLButtonElement>(`[aria-checked="true"]`)?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => { if (!popup.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => { popup.hidePopover(); document.removeEventListener("pointerdown", outside); window.removeEventListener("resize", position); window.removeEventListener("scroll", position, true); };
  }, [open]);
  return <div className="priority-picker" onKeyDown={event => {
    if (event.key === "Escape") { event.stopPropagation(); setOpen(false); trigger.current?.focus(); }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      if (!open) { setOpen(true); return; }
      const options = Array.from(menu.current!.querySelectorAll<HTMLButtonElement>("button"));
      const index = options.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? 2 : (index + (event.key === "ArrowDown" ? 1 : -1) + 3) % 3;
      options[next].focus();
    }
  }}>
    <input type="hidden" name="priority" value={value} />
    <button ref={trigger} type="button" className="priority-picker-trigger" data-priority={value} aria-label={`Độ ưu tiên: ${value}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}><span className="priority-option-label"><i />{value}</span><ChevronDown size={18} /></button>
    {open && <div ref={menu} popover="manual" className="priority-picker-menu" role="menu" aria-label="Độ ưu tiên">
      {priorities.map(priority => <button key={priority} type="button" role="menuitemradio" aria-checked={value === priority} data-priority={priority} onClick={() => choose(priority)}><span className="priority-option-label"><i />{priority}</span>{value === priority && <Check size={18} />}</button>)}
    </div>}
  </div>;
}
