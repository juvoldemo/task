"use client";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  House,
  ClipboardList,
  Info,
  Eye,
  EyeOff,
  ListTodo,
  Users,
  Building2,
  Plus,
  Search,
  ArrowUpRight,
  ChevronRight,
  LogOut,
  KeyRound,
  CheckCheck,
  Clock,
  CornerDownRight,
  ArrowDown,
  CalendarDays,
  AlertCircle,
  X,
  ArrowRight,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  FileCheck2,
} from "lucide-react";
import { departments } from "./data";
import DatePicker from "./date-picker";
import PriorityPicker from "./priority-picker";
import Notifications from "./notifications";
const initials = (n: string) =>
  n
    .split(" ")
    .slice(-2)
    .map((x) => x[0])
    .join("");
const date = (s: string) =>
  new Date(s).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
const deadlineDate = (s: string) =>
  new Date(s).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
const late = (t: any) => t.progress < 100 && new Date(t.deadline) < new Date();
export default function Home() {
  const [data, setData] = useState<any>(null),
    [page, setPage] = useState("dashboard"),
    [query, setQuery] = useState(""),
    [dept, setDept] = useState("all"),
    [status, setStatus] = useState("all"),
    [modal, setModal] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [createParent, setCreateParent] = useState(""),
    [createTitle, setCreateTitle] = useState(""),
    [showPassword, setShowPassword] = useState(false),
    [toast, setToast] = useState("");
  const load = async () => {
    try {
      const r = await fetch("/api/work");
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      setData(d);
    } catch (e: any) {
      setError(e.message);
    }
  };
  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 10000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(""), 4000);
      return () => clearTimeout(id);
    }
  }, [toast]);
  async function act(b: any) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/work", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(b),
      });
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      await load();
      setModal(null);
      setToast(
        b.action === "login"
          ? "Đăng nhập thành công"
          : b.action === "password"
            ? "Đã đổi mật khẩu. Vui lòng đăng nhập lại."
            : "Đã lưu thay đổi",
      );
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  const u = data?.user,
    all = data?.tasks || [],
    people = data?.users || [],
    name = (id: string) => people.find((p: any) => p.id === id)?.name || id;
  const tasks = all.filter(
    (t: any) =>
      (dept === "all" || t.department === Number(dept)) &&
      `${t.title} ${t.content} ${name(t.assignee)}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (status === "all" ||
        (status === "done"
          ? t.progress === 100
          : status === "late"
            ? late(t)
            : t.progress < 100)),
  );
  const myTasks = all.filter((task: any) => task.assignee === u?.id && task.progress < 100);
  const taskById = new Map<string, any>(all.map((task: any) => [task.id, task]));
  const rootId = (task: any) => {
    const seen = new Set<string>();
    while (task.parent && taskById.has(task.parent) && !seen.has(task.id)) {
      seen.add(task.id);
      task = taskById.get(task.parent);
    }
    return task.parent && !taskById.has(task.parent) ? task.parent : task.id;
  };
  const rootTasks = Array.from(new Map<string, any>(all.map((task: any) => {
    const id = rootId(task);
    return [id, taskById.get(id) || task];
  })).values());
  const taskCount = rootTasks.length;
  const filteredTaskCount = new Set(tasks.map(rootId)).size;
  const done = rootTasks.filter((t: any) => t.progress === 100).length,
    overdue = rootTasks.filter(late).length,
    avg = taskCount
      ? Math.round(
          done * 100 / taskCount,
        )
      : 0;
  const orderedTasks: { task: any; depth: number }[] = [];
  const visibleIds = new Set(tasks.map((task: any) => task.id));
  const visited = new Set<string>();
  const appendTask = (task: any, depth: number) => {
    if (visited.has(task.id)) return;
    visited.add(task.id);
    orderedTasks.push({ task, depth });
    tasks.filter((child: any) => child.parent === task.id).forEach((child: any) => appendTask(child, depth + 1));
  };
  tasks.filter((task: any) => !task.parent || !visibleIds.has(task.parent)).forEach((task: any) => appendTask(task, 0));
  tasks.forEach((task: any) => appendTask(task, 0));
  const open = (m: any) => {
    setError("");
    if (m.type === "create") {
      setCreateParent(m.parent || "");
      setCreateTitle(all.find((task: any) => task.id === m.parent)?.title || "");
    }
    setModal(m);
  };
  if (!data)
    return (
      <div className="loading">
        <div className="brand">
          <img className="brand-logo" src="/logo.webp" alt="Bảo Việt Nhân thọ" width={1200} height={382} />
        </div>
        <p>{error || "Đang kết nối không gian làm việc…"}</p>
        {error && <button onClick={load}>Thử lại</button>}
      </div>
    );
  if (!u)
    return (
      <div className="login login-reference">
        <div className="login-topbar">
          <div className="brand"><img className="brand-logo" src="/logo.webp" alt="Bảo Việt Nhân thọ" width={1200} height={382} /></div>
          <span>Không gian điều hành nội bộ</span>
        </div>
        <section className="login-story">
          <div className="story-text">
            <div className="eyebrow">
              CÙNG MỘT MỤC TIÊU
            </div>
            <h1>
              Công việc rõ ràng.
              <br />
              Đội ngũ vững vàng.
            </h1>
            <p>
              Một không gian để giao việc, kết nối đội ngũ<br className="story-break" /> và theo dõi tiến độ.
            </p>
            <div className="login-counts"><span><b>19</b> cán bộ</span><span><b>4</b> phòng ban</span></div>
          </div>
        </section>
        <section className="login-form">
          <div className="login-box">
            <div className="secure">
              <ShieldCheck size={23} /> ĐĂNG NHẬP NỘI BỘ
            </div>
            <h2>Chào mừng trở lại</h2>
            <p>Đăng nhập để bắt đầu ngày làm việc của bạn.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                act({
                  action: "login",
                  username: f.get("username"),
                  password: f.get("password"),
                });
              }}
            >
              <label>
                Tên đăng nhập
                <input
                  name="username"
                  placeholder="Nhập tên đăng nhập"
                  autoComplete="username"
                  aria-describedby="username-hint"
                  required
                />
                <small id="username-hint">Họ tên viết liền, không dấu.</small>
              </label>
              <label>
                Mật khẩu
                <div className="password-field"><input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Nhập mật khẩu"
                  autoComplete="current-password"
                  required
                /><button type="button" className="password-visibility" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={24} /> : <Eye size={24} />}</button></div>
              </label>
              {error && <div className="error">{error}</div>}
              <button className="primary wide" disabled={busy}>
                {busy ? "Đang đăng nhập…" : "Đăng nhập"}
              </button>
            </form>
            <div className="login-hint">
              <KeyRound size={24} />
              <span>Sử dụng tài khoản nội bộ được cấp.</span>
            </div>
          </div>
        </section>
        <footer className="login-bottom"><img className="brand-logo" src="/logo.webp" alt="Bảo Việt Nhân thọ" width={1200} height={382} /><small>© {new Date().getFullYear()} · Không gian làm việc nội bộ</small></footer>
      </div>
    );
  return (
    <div className="app">
      <div className="corporate-bar"><div className="corporate-account"><Notifications items={data.notifications || []} unread={Number(data.unreadNotifications || 0)} onRefresh={load} onTask={id => { const task = all.find((task: any) => task.id === id); if (task) open({ type: "detail", task }); }} /><span className="avatar">{initials(u.name)}</span><div><b>{u.name}</b><small>{u.position}</small></div></div></div>
      <aside>
        <div className="brand">
          <img className="brand-logo" src="/logo.webp" alt="Bảo Việt Nhân thọ" width={1200} height={382} />
        </div>
        <nav>
          {[
            ["dashboard", "Tổng quan", House],
            ["tasks", "Công việc", ListTodo],
            ["departments", "Phòng ban", Building2],
            ["people", "Đội ngũ", Users],
          ]
            .filter((x) => u.role === "director" || x[0] !== "departments")
            .map(([id, label, Icon]: any) => (
              <button
                key={id}
                className={page === id ? "active" : ""}
                onClick={() => {
                  setPage(id);
                  setDept("all");
                  setStatus("all");
                }}
              >
                <Icon size={19} />
                {label}
                {id === "tasks" && <em>{taskCount}</em>}
              </button>
            ))}
        </nav>
        <div className="sidebar-actions">
          <button onClick={() => open({ type: "password" })}><KeyRound size={22} /><span>Đổi mật khẩu</span></button>
          <button onClick={() => act({ action: "logout" })}><LogOut size={22} /><span>Đăng xuất</span></button>
        </div>
      </aside>
      <main>
        <header>
          <div className="breadcrumb">
            <span>Không gian làm việc</span><span>/</span>
            <b>
              {
                (
                  {
                    dashboard: "Tổng quan",
                    tasks: "Công việc",
                    departments: "Phòng ban",
                    people: "Đội ngũ",
                  } as any
                )[page]
              }
            </b>
          </div>
        </header>
        <div className={`content ${page}-content`}>
          <div className="page-title">
            <div>
              {u.role !== "director" && <div className="eyebrow">{departments[u.department].toUpperCase()}</div>}
              {page === "dashboard" && <><h1>Tổng quan</h1><p className="department-subtitle">{u.role === "director" ? "Toàn công ty" : departments[u.department]}</p></>}
              {page !== "dashboard" && <h1>
                {page === "tasks"
                    ? "Quản lý công việc"
                    : page === "departments"
                      ? "Kết nối các phòng ban"
                      : "Đội ngũ của bạn"}
                <span className="title-dot">.</span>
              </h1>}
              {page === "departments" && <p>Bức tranh tiến độ của từng phòng ban.</p>}
            </div>
            {["director", "manager"].includes(u.role) && (
              <button
                className="primary"
                onClick={() => open({ type: "create" })}
              >
                <Plus size={18} /> Giao công việc
              </button>
            )}
          </div>
          {page === "dashboard" && (
            <>
              <div className="stats">
                {[
                  [
                    ClipboardList,
                    "Tổng công việc",
                    taskCount,
                    "Tất cả nhiệm vụ đang quản lý",
                    "purple",
                  ],
                  [
                    Clock,
                    "Đang thực hiện",
                    taskCount - done,
                    "Công việc chưa hoàn thành",
                    "blue",
                  ],
                  [
                    CheckCheck,
                    "Đã hoàn thành",
                    done,
                    "Những công việc đã hoàn thành",
                    "green",
                  ],
                  [
                    AlertCircle,
                    "Quá hạn",
                    overdue,
                    "Cần được ưu tiên xử lý",
                    "orange",
                  ],
                ].map(([Icon, label, value, sub, c]: any, i) => (
                  <button
                    className={"stat " + c}
                    key={label}
                    onClick={() => {
                      setPage("tasks");
                      setStatus(
                        i === 2
                          ? "done"
                          : i === 3
                            ? "late"
                            : i === 1
                              ? "active"
                              : "all",
                      );
                    }}
                  >
                    <div>
                      <span>{label}</span>
                      <Icon size={19} />
                    </div>
                    <strong>{value}</strong>
                    <small>
                      {sub}
                      <ArrowUpRight size={14} />
                    </small>
                  </button>
                ))}
              </div>
              <section className="panel my-tasks-panel">
                <div className="panel-heading">
                  <div><h3>Công việc của tôi <span className="count">{myTasks.length}</span></h3></div>
                </div>
                {myTasks.length ? <div className="my-task-list">{myTasks.map((task: any) => (
                  <button key={task.id} type="button" className="my-task-row" onClick={() => open({ type: "detail", task })}>
                    <span className="my-task-icon"><ClipboardList size={22} /></span>
                    <span className="my-task-body"><strong>{task.title}</strong><small>Người giao: {name(task.creator)} · Hạn: <span className={late(task) ? "danger" : ""}>{deadlineDate(task.deadline)}</span></small></span>
                    <span className="priority-badge" data-priority={task.priority}>{task.priority}</span>
                    <span className={`badge ${late(task) ? "overdue" : task.progress > 0 ? "working" : "waiting"}`}>{late(task) ? "Quá hạn" : task.progress > 0 ? "Đang thực hiện" : "Chưa bắt đầu"}</span>
                    <ChevronRight size={18} />
                  </button>
                ))}</div> : <p className="my-tasks-empty">Bạn không có công việc nào chưa hoàn thành.</p>}
              </section>
              <div className="dashboard-grid">
                <section className="panel department-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>
                        {u.role === "director"
                          ? "Tiến độ các phòng ban"
                          : "Tiến độ trong phòng"}
                      </h3>
                      <p>Từng bước tiến, cùng một mục tiêu</p>
                    </div>
                    <button
                      className="text-btn"
                      onClick={() =>
                        setPage(
                          u.role === "director" ? "departments" : "people",
                        )
                      }
                    >
                      Xem tất cả <ArrowRight size={19} />
                    </button>
                  </div>
                  {(u.role === "director"
                    ? departments
                    : [departments[u.department]]
                  ).map((d, i) => {
                    const di = departments.indexOf(d),
                      ts = rootTasks.filter((t: any) => t.department === di),
                      p = ts.length
                        ? Math.round(
                            ts.reduce(
                              (s: number, t: any) => s + (t.progress === 100 ? 100 : 0),
                              0,
                            ) / ts.length,
                          )
                        : 0;
                    return (
                      <button
                        className="dept-row"
                        key={d}
                        onClick={() => {
                          setDept(String(di));
                          setPage("tasks");
                        }}
                      >
                        <div className={"dept-icon color" + di}>
                          {di === 1 ? <TrendingUp size={25} /> : di === 3 ? <FileCheck2 size={25} /> : <Users size={25} />}
                        </div>
                        <div className="dept-body">
                          <div>
                            <b>{d}</b>
                            <strong>{p}%</strong>
                          </div>
                          <div className="track">
                            <i
                              style={{
                                width: p + "%",
                                background: [
                                  "#0083ff",
                                  "#f5b51b",
                                  "#21af80",
                                  "#8059ff",
                                ][di],
                              }}
                            />
                          </div>
                          <small>
                            {ts.length} công việc{" "}
                            <span>
                              {ts.filter((t: any) => t.progress === 100).length}{" "}
                              hoàn thành
                            </span>
                          </small>
                        </div>
                        <ChevronRight size={16} />
                      </button>
                    );
                  })}
                  {!all.length && <div className="overview-empty"><h3>Chưa có công việc được giao</h3><p>Giao công việc đầu tiên để bắt đầu theo dõi tiến độ.</p>{["director", "manager"].includes(u.role) && <button className="secondary" onClick={() => open({ type: "create" })}>Giao công việc</button>}</div>}
                </section>
                <section className="panel progress-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Hiệu suất tổng thể</h3>
                      <p>Tình trạng công việc của {u.role === "director" ? "công ty" : "phòng"}</p>
                    </div>
                    <span className="purple-tag">
                      {u.role === "director" ? "Toàn công ty" : "Phòng của bạn"}
                    </span>
                  </div>
                  <div className="completion-summary"><p>Tỷ lệ hoàn thành</p><strong>{avg}<span>%</span></strong><div className="track"><i style={{ width: `${avg}%` }} /></div></div>
                  <div className="legend">
                    <span>
                      <i style={{ background: "#10b975" }} /> Đã hoàn thành{" "}
                      <b>{done}</b>
                    </span>
                    <span>
                      <i style={{ background: "#9daec5" }} /> Chưa bắt đầu{" "}
                      <b>{rootTasks.filter((t: any) => t.progress === 0 && !late(t)).length}</b>
                    </span>
                    <span><i style={{ background: "#ffbd23" }} /> Đang thực hiện <b>{rootTasks.filter((t: any) => t.progress > 0 && t.progress < 100 && !late(t)).length}</b></span>
                    <span><i style={{ background: "#ff4939" }} /> Quá hạn <b>{overdue}</b></span>
                  </div>
                  {!all.length && <p className="performance-note"><Info size={21} />Chưa có dữ liệu để thống kê hiệu suất.</p>}
                </section>
              </div>
            </>
          )}
          {(page === "tasks" || (page === "dashboard" && all.length > 0)) && (
            <section className="panel tasks-panel">
              <div className="panel-heading">
                <div>
                  <h3>
                    {page === "dashboard"
                      ? "Công việc cần theo dõi"
                      : "Danh sách công việc"}{" "}
                    <span className="count">{filteredTaskCount}</span>
                  </h3>
                  {page === "dashboard" && (
                    <p>Cập nhật tiến độ để đội ngũ luôn đồng bộ</p>
                  )}
                </div>
                {page === "dashboard" && (
                  <button className="text-btn" onClick={() => setPage("tasks")}>
                    Xem tất cả <ArrowUpRight size={15} />
                  </button>
                )}
              </div>
              <div className="filters">
                <div className="search">
                  <Search size={17} />
                  <input
                    placeholder="Tìm công việc, người phụ trách…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                {u.role === "director" && (
                  <select
                    aria-label="Lọc phòng ban"
                    value={dept}
                    onChange={(e) => setDept(e.target.value)}
                  >
                    <option value="all">Tất cả phòng ban</option>
                    {departments.map((d, i) => (
                      <option value={i} key={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                )}
                <select
                  aria-label="Lọc trạng thái"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Chưa hoàn thành</option>
                  <option value="done">Đã hoàn thành</option>
                  <option value="late">Quá hạn</option>
                </select>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>CÔNG VIỆC</th>
                      <th>NGƯỜI PHỤ TRÁCH</th>
                      <th>THỜI HẠN</th>
                      <th>SỐ LƯỢNG HOÀN THÀNH</th>
                      <th>TRẠNG THÁI</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {(page === "dashboard" ? orderedTasks.slice(0, 5) : orderedTasks).map(
                      ({ task: t, depth }) => (
                        <tr
                          key={t.id}
                          onClick={() => open({ type: "detail", task: t })}
                        >
                          <td>
                            <div className="task-tree-title" style={{ paddingLeft: Math.min(depth, 5) * 24 }}>
                            {t.parent && <CornerDownRight className="task-child-arrow" size={21} aria-label="Công việc được giao tiếp" />}
                            <b>{t.title}</b>
                            {!t.parent && tasks.some((child: any) => child.parent === t.id) && <ArrowDown className="task-parent-arrow" size={18} aria-label="Có công việc con bên dưới" />}
                            </div>
                            <small>
                              {departments[t.department]}
                              {t.parent
                                ? ` · ${name(t.creator)} giao cho ${name(t.assignee)}`
                                : ""}
                            </small>
                          </td>
                          <td>
                            <div className="person-cell">
                              <span className="avatar small">
                                {initials(name(t.assignee))}
                              </span>
                              {name(t.assignee)}
                            </div>
                          </td>
                          <td className={late(t) ? "danger" : ""}>
                            {deadlineDate(t.deadline)}
                          </td>
                          <td>
                            <div className="progress-cell">
                              {t.completed_quantity ?? "—"}
                            </div>
                          </td>
                          <td>
                            <span
                              className={
                                "badge " +
                                (t.progress === 100
                                  ? "completed"
                                  : late(t)
                                    ? "overdue"
                                    : t.progress
                                      ? "working"
                                      : "waiting")
                              }
                            >
                              {t.progress === 100
                                ? "Hoàn thành"
                                : late(t)
                                  ? "Quá hạn"
                                  : t.progress
                                    ? "Đang thực hiện"
                                    : "Chưa bắt đầu"}
                            </span>
                          </td>
                          <td>
                            <ChevronRight size={16} />
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
              {!tasks.length && (
                <div className="empty">
                  <div>
                    <ListTodo size={26} />
                  </div>
                  <h3>
                    {all.length
                      ? "Không tìm thấy công việc phù hợp"
                      : "Sẵn sàng cho những bước tiến mới"}
                  </h3>
                  <p>
                    {all.length
                      ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm."
                      : "Chưa có công việc. Các nhiệm vụ được giao sẽ xuất hiện tại đây."}
                  </p>
                  {!all.length && ["director", "manager"].includes(u.role) && (
                    <button
                      className="text-btn"
                      onClick={() => open({ type: "create" })}
                    >
                      <Plus size={16} /> Giao công việc đầu tiên
                    </button>
                  )}
                </div>
              )}
            </section>
          )}
          {page === "departments" && (
            <div className="department-cards">
              {departments.map((d, i) => {
                const ts = rootTasks.filter((t: any) => t.department === i),
                  ps = people.filter((p: any) => p.department === i);
                return (
                  <section className="panel department-card" key={d}>
                    <div className={"dept-icon color" + i}>
                      <Building2 />
                    </div>
                    <h2>{d}</h2>
                    <p>
                      Trưởng phòng:{" "}
                      {ps.find((p: any) => p.role === "manager")?.name}
                    </p>
                    <div className="dept-numbers">
                      <span>
                        <b>{ps.length}</b>Cán bộ
                      </span>
                      <span>
                        <b>{ts.length}</b>Công việc
                      </span>
                      <span>
                        <b>
                          {ts.filter((t: any) => t.progress === 100).length}
                        </b>
                        Hoàn thành
                      </span>
                    </div>
                    <button
                      className="secondary wide"
                      onClick={() => {
                        setDept(String(i));
                        setPage("tasks");
                      }}
                    >
                      Xem công việc <ArrowRight size={16} />
                    </button>
                  </section>
                );
              })}
            </div>
          )}
          {page === "people" && (
            <section className="panel">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>HỌ VÀ TÊN</th>
                      <th>CHỨC DANH</th>
                      <th>PHÒNG BAN</th>
                      <th>ĐANG NHẬN</th>
                      <th>ĐÃ HOÀN THÀNH</th>
                      <th>TRỄ HẠN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {people.map((p: any) => (
                      <tr key={p.id} className="people-department-row" data-department={p.department}>
                        <td>
                          <div className="person-cell">
                            <span className="avatar">{initials(p.name)}</span>
                            <b>{p.name}</b>
                          </div>
                        </td>
                        <td>{p.position}</td>
                        <td>{departments[p.department] || "Ban giám đốc"}</td>
                        <td>
                          <span className="active-task-count">{all.filter((task: any) => task.assignee === p.id && task.progress < 100).length}</span>
                        </td>
                        <td>
                          <span className="completed-task-count">{all.filter((task: any) => task.assignee === p.id && task.progress === 100).length}</span>
                        </td>
                        <td>
                          <span className="overdue-task-count">{all.filter((task: any) => task.assignee === p.id && late(task)).length}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          <div className="bottom-line">
            TeamFlow <span>Mỗi công việc, một bước tiến.</span>
            <span>
              <ShieldCheck size={13} /> Dữ liệu được giới hạn theo quyền truy
              cập
            </span>
          </div>
        </div>
      </main>
      {toast && (
        <div className="toast">
          <CheckCheck size={18} />
          {toast}
        </div>
      )}
      {modal && (
        <div className="overlay" onClick={() => !busy && setModal(null)}>
          <div className={`modal ${modal.task ? "task-detail-modal" : modal.type === "create" ? "task-create-modal" : ""}`} onClick={(e) => e.stopPropagation()}>
            <button
              className="close"
              aria-label="Đóng"
              onClick={() => setModal(null)}
            >
              <X size={21} />
            </button>
            {modal.type === "password" && <div className="eyebrow">TEAMFLOW WORKSPACE</div>}
            <h2>
              {modal.type === "create"
                ? "Giao công việc mới"
                : modal.type === "password"
                  ? "Thay đổi mật khẩu"
                  : "Cập nhật tiến độ"}
              {modal.task && <span className="detail-heading-department">{departments[modal.task.department]}</span>}
            </h2>
            {modal.type === "password" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  if (f.get("next") !== f.get("confirm")) {
                    setError("Mật khẩu xác nhận không khớp.");
                    return;
                  }
                  act({
                    action: "password",
                    current: f.get("current"),
                    next: f.get("next"),
                  });
                }}
              >
                <p>Sau khi đổi mật khẩu, bạn sẽ đăng nhập lại.</p>
                <label>
                  Mật khẩu hiện tại
                  <input
                    name="current"
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </label>
                <label>
                  Mật khẩu mới
                  <input
                    name="next"
                    type="password"
                    autoComplete="new-password"
                    minLength={4}
                    maxLength={128}
                    required
                  />
                </label>
                <label>
                  Xác nhận mật khẩu mới
                  <input
                    name="confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                  />
                </label>
                {error && <div className="error">{error}</div>}
                <button className="primary wide" disabled={busy}>
                  Lưu mật khẩu
                </button>
              </form>
            ) : modal.type === "create" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  if (!f.get("deadline")) {
                    setError("Vui lòng chọn hạn hoàn thành.");
                    return;
                  }
                  act({
                    action: "create",
                    title: f.get("title"),
                    content: f.get("content"),
                    assignee: f.get("assignee"),
                    deadline: new Date(`${f.get("deadline")}T23:59:59.999+07:00`).toISOString(),
                    priority: f.get("priority"),
                    parent: f.get("parent"),
                  });
                }}
              >
                <label>
                  Tên công việc
                  <input
                    name="title"
                    value={createTitle}
                    readOnly={Boolean(createParent)}
                    onChange={event => setCreateTitle(event.target.value)}
                    maxLength={200}
                    placeholder="Cần thực hiện công việc gì?"
                    required
                  />
                </label>
                <label>
                  Nội dung công việc
                  <textarea
                    name="content"
                    rows={3}
                    maxLength={10000}
                    placeholder="Mục tiêu, yêu cầu và kết quả cần đạt…"
                    required
                  />
                </label>
                <label>
                  Người phụ trách
                  <select name="assignee" required defaultValue="">
                    <option value="" disabled>
                      Chọn người nhận việc
                    </option>
                    {people
                      .filter((p: any) =>
                        u.role === "director"
                          ? p.role === "manager"
                          : p.department === u.department && p.id !== u.id,
                      )
                      .map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.name} —{" "}
                          {u.role === "director"
                            ? departments[p.department]
                            : p.position}
                        </option>
                      ))}
                  </select>
                </label>
                <div className="form-row">
                  <div className="deadline-field">
                    <span>Hạn hoàn thành</span>
                    <DatePicker />
                  </div>
                  <div className="deadline-field"><span>Độ ưu tiên</span><PriorityPicker /></div>
                </div>
                {u.role === "manager" && (
                  <label>
                    Thuộc công việc được giám đốc giao
                    <select name="parent" value={createParent} onChange={event => {
                      const parent = event.target.value;
                      setCreateParent(parent);
                      setCreateTitle(all.find((task: any) => task.id === parent)?.title || "");
                    }}>
                      <option value="">Công việc độc lập</option>
                      {all
                        .filter((t: any) => t.assignee === u.id)
                        .map((t: any) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                    </select>
                  </label>
                )}
                {error && <div className="error">{error}</div>}
                <div className="task-create-footer">
                <button type="button" className="secondary" disabled={busy} onClick={() => setModal(null)}>Hủy</button>
                <button className="primary" disabled={busy}>
                  {busy ? "Đang lưu…" : "Giao công việc"}
                  <ArrowRight size={17} />
                </button>
                </div>
              </form>
            ) : (
              <>
                <h3 className="detail-title">{modal.task.title}</h3>
                <div className="task-requirement"><span>NỘI DUNG YÊU CẦU</span><p>{modal.task.content}</p></div>
                <div className="detail-meta">
                  <span>
                    Người phụ trách<b>{name(modal.task.assignee)}</b>
                  </span>
                  <span>
                    Hạn hoàn thành
                    <b className={late(modal.task) ? "danger" : ""}>
                      <CalendarDays size={21} />
                      {deadlineDate(modal.task.deadline)}
                    </b>
                  </span>
                  <span>
                    Người giao<b>{name(modal.task.creator)}</b>
                  </span>
                  <span>
                    Độ ưu tiên<b><span className="priority-badge" data-priority={modal.task.priority}>{modal.task.priority}</span></b>
                  </span>
                </div>
                {modal.task.parent && (
                  <p className="callout">
                    Công việc gốc:{" "}
                    {all.find((t: any) => t.id === modal.task.parent)?.title ||
                      "Nhiệm vụ cấp trên"}
                  </p>
                )}
                {all.filter((t: any) => t.parent === modal.task.id).length >
                  0 && (
                  <div className="callout">
                    <b>Công việc đã phân công tiếp</b>
                    {all
                      .filter((t: any) => t.parent === modal.task.id)
                      .map((t: any) => (
                        <p key={t.id}>
                          {t.title} · {name(t.assignee)} · {t.completed_quantity ?? "Chưa nhập số lượng"}
                        </p>
                      ))}
                  </div>
                )}
                {u.role === "director" ||
                u.role === "manager" ||
                modal.task.assignee === u.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      act({
                        action: "update",
                        id: modal.task.id,
                        progress: f.get("completed") === "on" ? 100 : Number(f.get("quantity")) > 0 ? 1 : 0,
                        completedQuantity: String(f.get("quantity")).trim() === "" ? null : Number(f.get("quantity")),
                        note: f.get("note"),
                      });
                    }}
                  >
                    <label>
                      <span>Số lượng hoàn thành <span className="optional-label">(không bắt buộc)</span></span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        title="Nhập số nguyên không âm"
                        name="quantity"
                        defaultValue={modal.task.completed_quantity ?? ""}
                        placeholder="Nhập số lượng, ví dụ: 297"
                      />
                    </label>
                    <label className="completion-toggle">
                      <input type="checkbox" name="completed" defaultChecked={modal.task.progress === 100} />
                      Đánh dấu công việc đã hoàn thành
                    </label>
                    <label>
                      Cập nhật / ghi chú
                      <textarea
                        rows={3}
                        maxLength={5000}
                        name="note"
                        defaultValue={modal.task.note}
                        placeholder="Kết quả đã thực hiện, vướng mắc hoặc bước tiếp theo…"
                      />
                    </label>
                    {error && <div className="error">{error}</div>}
                    <div className="task-detail-footer">
                      <small className="muted">Cập nhật lần cuối: {date(modal.task.updated)}</small>
                      <div className="task-detail-actions">
                      {u.role === "manager" && modal.task.assignee === u.id && (
                        <button
                          type="button"
                          className="secondary"
                          onClick={() =>
                            open({ type: "create", parent: modal.task.id })
                          }
                        >
                          Phân công tiếp
                        </button>
                      )}
                      <button type="button" className="secondary cancel-task-update" disabled={busy} onClick={() => setModal(null)}>Hủy</button>
                      <button className="primary" disabled={busy}>
                        {busy ? "Đang lưu…" : "Lưu tiến độ"}
                      </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="callout">
                    Số lượng hoàn thành: {modal.task.completed_quantity ?? "Chưa nhập"}
                    <p>{modal.task.note || "Chưa có ghi chú cập nhật."}</p>
                  </div>
                )}
                <small className="muted readonly-updated">
                  Cập nhật lần cuối: {date(modal.task.updated)}
                </small>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
