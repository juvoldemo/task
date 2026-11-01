"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, RefreshCw, Search, ShieldCheck, Trash2 } from "lucide-react";
import { departments } from "../data";
import "./admin.css";

type Task = { id: string; title: string; assignee: string; department: number; parent: string | null; progress: number; deadline: string };
type Person = { id: string; name: string; position: string };
type Analytics = { user_id: string; views: number; first_visit: string; last_visit: string };
type AdminData = { users: Person[]; tasks: Task[]; analytics: Analytics[]; daily: { day: string; views: number; visitors: number }[]; pages: { path: string; views: number }[]; devices: { device: string; views: number }[]; recent: { user_id: string; path: string; device: string; visited_at: string }[] };
const pageNames: Record<string, string> = { dashboard: "Tổng quan", tasks: "Công việc", departments: "Phòng ban", people: "Đội ngũ", admin: "Quản trị" };
const time = (value: string) => new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
function descendants(tasks: Task[], id: string) {
  const ids = new Set([id]);
  let size;
  do { size = ids.size; tasks.forEach(t => { if (t.parent && ids.has(t.parent)) ids.add(t.id); }); } while (ids.size !== size);
  return ids.size - 1;
}
export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState("");
  const [denied, setDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Task | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const confirmation = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!selected) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = confirmation.current;
    dialog?.showModal();
    return () => { dialog?.close(); previous?.focus(); };
  }, [selected]);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/work?view=admin", { cache: "no-store" });
      const result = await response.json();
      if (response.status === 401 || response.status === 403) { setDenied(true); setData(null); setSelected(null); setMessage(""); return; }
      if (!response.ok) throw Error(result.error);
      setDenied(false); setData(result);
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể tải dữ liệu."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function adminSession(action: "adminLogin" | "adminLogout") {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/work", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...(action === "adminLogin" ? { password } : {}) }) });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      setPassword(""); setMessage(""); setSelected(null);
      if (action === "adminLogout") { setData(null); setDenied(true); }
      else await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể xử lý yêu cầu."); }
    finally { setBusy(false); }
  }
  const person = (id: string) => data?.users.find(p => p.id === id)?.name || id;
  async function remove() {
    if (!selected || busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/work", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "deleteTask", id: selected.id }) });
      const result = await response.json();
      if (response.status === 401) { setData(null); setSelected(null); setDenied(true); setMessage(""); throw Error("Phiên admin đã hết hạn. Vui lòng đăng nhập lại."); }
      if (!response.ok) throw Error(result.error);
      setSelected(null); setMessage("Đã xóa nhiệm vụ và các nhiệm vụ được giao tiếp bên dưới."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể xóa nhiệm vụ."); }
    finally { setBusy(false); }
  }
  const views = data?.analytics.reduce((sum, item) => sum + Number(item.views), 0) || 0;
  return <div className="admin-page">
    <div className="admin-top"><a href="/"><ArrowLeft size={18} /> Không gian làm việc</a><span><ShieldCheck size={18} /> Quản trị</span></div>
    <main className="admin-main">
      <div className="admin-heading"><div><h1>Quản trị hệ thống</h1><p>Quản lý nhiệm vụ và theo dõi truy cập của đội ngũ.</p></div>{!denied && <div className="admin-heading-actions"><button onClick={load} disabled={loading || busy}><RefreshCw size={18} /> {loading ? "Đang tải…" : "Làm mới"}</button>{data && <button onClick={() => adminSession("adminLogout")} disabled={busy || loading}>Đăng xuất admin</button>}</div>}</div>
      {error && <div className="admin-error" role="alert">{error}</div>}
      {message && <p className="admin-success" role="status">{message}</p>}
      {loading && !data && <p role="status">Đang tải dữ liệu quản trị…</p>}
      {denied && !loading && <section className="admin-panel admin-login" aria-labelledby="admin-login-title"><ShieldCheck size={28} /><h2 id="admin-login-title">Đăng nhập quản trị</h2><p>Nhập mật khẩu admin để tiếp tục.</p><form onSubmit={event => { event.preventDefault(); void adminSession("adminLogin"); }}><label htmlFor="admin-password">Mật khẩu admin</label><input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required maxLength={128} autoFocus /><button className="admin-login-submit" type="submit" disabled={busy}>{busy ? "Đang đăng nhập…" : "Đăng nhập"}</button></form></section>}
      {data && !denied && <>
        <section aria-labelledby="analytics-title">
          <div className="admin-section-heading"><h2 id="analytics-title">Analytics truy cập</h2><span>30 ngày gần nhất · Giờ Việt Nam</span></div>
          <div className="admin-stats"><div><span>Lượt xem màn hình</span><strong>{views}</strong></div><div><span>Tài khoản đã truy cập</span><strong>{data.analytics.length}</strong></div><div><span>Lượt xem trên mobile / tablet</span><strong>{data.devices.find(d => d.device === "Mobile / Tablet")?.views || 0}</strong></div><div><span>Nhiệm vụ hiện có</span><strong>{data.tasks.length}</strong></div></div>
          <p className="admin-note">Ghi nhận khi tài khoản đã đăng nhập mở hoặc chuyển màn hình; tự làm mới dữ liệu nền không tính lượt xem. Dữ liệu bắt đầu từ khi tính năng được triển khai, chưa bao gồm khách chưa đăng nhập.</p>
          <div className="admin-panel admin-table"><table><caption>Truy cập theo tài khoản</caption><thead><tr><th>Họ và tên</th><th>Chức danh</th><th>Lượt xem</th><th>Lần đầu trong kỳ</th><th>Truy cập gần nhất</th></tr></thead><tbody>{data.analytics.map(item => <tr key={item.user_id}><td><b>{person(item.user_id)}</b></td><td>{data.users.find(p => p.id === item.user_id)?.position}</td><td>{item.views}</td><td>{time(item.first_visit)}</td><td>{time(item.last_visit)}</td></tr>)}</tbody></table>{!data.analytics.length && <p className="admin-empty">Chưa có lượt truy cập được ghi nhận.</p>}</div>
          <div className="admin-split"><div className="admin-panel"><h3>Lượt xem theo màn hình</h3>{data.pages.map(item => <div className="admin-metric" key={item.path}><span>{pageNames[item.path] || item.path}</span><b>{item.views}</b></div>)}{!data.pages.length && <p className="admin-empty">Chưa có dữ liệu.</p>}</div><div className="admin-panel admin-table"><table><caption>Truy cập theo ngày</caption><thead><tr><th>Ngày</th><th>Lượt xem</th><th>Tài khoản</th></tr></thead><tbody>{data.daily.map(item => <tr key={item.day}><td>{item.day.split("-").reverse().join("/")}</td><td>{item.views}</td><td>{item.visitors}</td></tr>)}</tbody></table>{!data.daily.length && <p className="admin-empty">Chưa có dữ liệu.</p>}</div></div>
          <details className="admin-panel"><summary>100 lượt truy cập gần nhất</summary><div className="admin-table"><table><thead><tr><th>Tài khoản</th><th>Màn hình</th><th>Thiết bị</th><th>Thời điểm</th></tr></thead><tbody>{data.recent.map((item, i) => <tr key={i}><td>{person(item.user_id)}</td><td>{pageNames[item.path]}</td><td>{item.device}</td><td>{time(item.visited_at)}</td></tr>)}</tbody></table></div></details>
        </section>
        <section aria-labelledby="task-title"><div className="admin-section-heading"><h2 id="task-title">Nhiệm vụ đã giao</h2><span>{data.tasks.length} nhiệm vụ</span></div><label className="admin-search"><Search size={18} /><input aria-label="Tìm nhiệm vụ hoặc người nhận" value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm nhiệm vụ hoặc người nhận…" /></label><div className="admin-task-list">{data.tasks.filter(t => `${t.title} ${person(t.assignee)}`.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi"))).map(task => <article className="admin-task" key={task.id}><div><h3>{task.title}</h3><p>{person(task.assignee)} · {departments[task.department]}</p><small>{task.parent ? "Nhiệm vụ được giao tiếp · " : ""}{task.progress === 100 ? "Đã hoàn thành" : "Chưa hoàn thành"} · Hạn: {new Date(task.deadline).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</small></div><button className="admin-delete" onClick={() => { setError(""); setSelected(task); }} aria-label={`Xóa nhiệm vụ ${task.title}`}><Trash2 size={18} /> Xóa</button></article>)}{!data.tasks.length && <p className="admin-empty">Chưa có nhiệm vụ.</p>}{data.tasks.length > 0 && !data.tasks.some(t => `${t.title} ${person(t.assignee)}`.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi"))) && <p className="admin-empty">Không tìm thấy nhiệm vụ phù hợp.</p>}</div></section>
      </>}
      {selected && <dialog ref={confirmation} aria-labelledby="delete-title" className="admin-confirm" onCancel={event => { event.preventDefault(); if (!busy) setSelected(null); }}><h2 id="delete-title">Xóa nhiệm vụ này?</h2><p><b>{selected.title}</b></p><p>Nhiệm vụ sẽ được gỡ khỏi danh sách công việc và thông báo liên quan.{data && descendants(data.tasks, selected.id) > 0 && ` Đồng thời xóa ${descendants(data.tasks, selected.id)} nhiệm vụ được giao tiếp bên dưới.`}</p>{error && <p className="admin-error" role="alert">{error}</p>}<div><button autoFocus onClick={() => setSelected(null)} disabled={busy}>Hủy</button><button className="admin-delete" onClick={remove} disabled={busy}>{busy ? "Đang xóa…" : "Xác nhận xóa"}</button></div></dialog>}
    </main>
  </div>;
}
