"use client";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
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
  AlertCircle,
  Layers,
  CalendarDays,
  X,
  ArrowRight,
  ShieldCheck,
  SlidersHorizontal,
  Globe2,
  TrendingUp,
  FileCheck2,
} from "lucide-react";
import { departments } from "./data";
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
    }, 30000);
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
  const done = all.filter((t: any) => t.progress === 100).length,
    overdue = all.filter(late).length,
    avg = all.length
      ? Math.round(
          done * 100 / all.length,
        )
      : 0;
  const open = (m: any) => {
    setError("");
    setModal(m);
  };
  if (!data)
    return (
      <div className="loading">
        <div className="brand">
          <Layers /> TeamFlow
        </div>
        <p>{error || "Đang kết nối không gian làm việc…"}</p>
        {error && <button onClick={load}>Thử lại</button>}
      </div>
    );
  if (!u)
    return (
      <div className="login">
        <section className="login-story">
          <div className="brand">
            <span className="brand-name">BAOVIET<small>Nhân thọ</small></span><Globe2 className="brand-globe" />
          </div>
          <div className="story-text">
            <div className="eyebrow">
              CÙNG MỘT MỤC TIÊU. CÙNG MỘT NHỊP TIẾN.
            </div>
            <h1>
              Công việc rõ ràng.
              <br />
              Đội ngũ vững vàng.
            </h1>
            <p>
              Một không gian để giao việc, kết nối đội ngũ và biến kế hoạch
              thành kết quả.
            </p>
            <div className="story-panel">
              <div className="story-circle">✓</div>
              <div>
                <b>Mỗi công việc, một bước tiến</b>
                <p>Giao đúng người · Theo dõi đúng lúc</p>
              </div>
              <ArrowUpRight />
            </div>
            <div className="decor-bars">
              {[35, 48, 43, 65, 58, 77, 70, 90, 83, 100].map((h, i) => (
                <i key={i} style={{ height: h + "%" }} />
              ))}
            </div>
          </div>
          <small>
            KHÔNG GIAN ĐIỀU HÀNH NỘI BỘ{" "}
            <span>© {new Date().getFullYear()} TeamFlow</span>
          </small>
        </section>
        <section className="login-form">
          <div className="login-box">
            <div className="secure">
              <ShieldCheck size={16} /> KHÔNG GIAN LÀM VIỆC BẢO MẬT
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
                  placeholder="Ví dụ: nguyenthoc"
                  autoComplete="username"
                  required
                />
              </label>
              <label>
                Mật khẩu
                <input
                  name="password"
                  type="password"
                  placeholder="Nhập mật khẩu"
                  autoComplete="current-password"
                  required
                />
              </label>
              {error && <div className="error">{error}</div>}
              <button className="primary wide" disabled={busy}>
                {busy ? "Đang đăng nhập…" : "Đăng nhập"}
                <ArrowRight size={18} />
              </button>
            </form>
            <div className="login-hint">
              <KeyRound size={18} />
              <div>
                Tài khoản là họ tên viết liền, không dấu.
                <br />
                <span>
                  Mật khẩu mặc định: <b>0000</b>. Bạn có thể đổi sau khi đăng
                  nhập.
                </span>
              </div>
            </div>
            <footer>
              19 cán bộ <i /> 4 phòng ban <i /> Một không gian chung
            </footer>
          </div>
        </section>
      </div>
    );
  return (
    <div className="app">
      <div className="corporate-bar"><div className="corporate-account"><span className="avatar">{initials(u.name)}</span><div><b>{u.name}</b><small>{u.position}</small></div></div></div>
      <aside>
        <div className="brand">
          <span className="brand-name">BAOVIET<small>Nhân thọ</small></span><Globe2 className="brand-globe" />
        </div>
        <nav>
          {[
            ["dashboard", "Tổng quan", LayoutDashboard],
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
                {id === "tasks" && <em>{all.length}</em>}
              </button>
            ))}
        </nav>
        <div className="sidebar-scene"><span>Vững niềm tin<br />Trọn tương lai</span></div>
        <div className="profile">
          <div className="avatar">{initials(u.name)}</div>
          <div>
            <b>{u.name}</b>
            <small>{u.position}</small>
          </div>
          <button title="Đăng xuất" onClick={() => act({ action: "logout" })}>
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <main>
        <header>
          <div>
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
          <div className="header-right">
            <span className="live-dot" /> Dữ liệu trực tuyến
            <button onClick={() => open({ type: "password" })}>
              <KeyRound size={15} /> Đổi mật khẩu
            </button>
            <div className="avatar small">{initials(u.name)}</div>
          </div>
        </header>
        <div className={`content ${page}-content`}>
          <div className="page-title">
            <div>
              <div className="eyebrow">
                {u.role === "director"
                  ? "BẢNG ĐIỀU HÀNH GIÁM ĐỐC"
                  : departments[u.department].toUpperCase()}
              </div>
              {page !== "dashboard" && <h1>
                {page === "tasks"
                    ? "Quản lý công việc"
                    : page === "departments"
                      ? "Kết nối các phòng ban"
                      : "Đội ngũ của bạn"}
                <span className="title-dot">.</span>
              </h1>}
              {page !== "dashboard" && page !== "tasks" && <p>
                {page === "departments"
                      ? "Bức tranh tiến độ của từng phòng ban."
                      : "Thông tin cán bộ và tài khoản đăng nhập."}
              </p>}
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
              <div className="date-strip">
                <span>
                  <CalendarDays size={16} />
                  {new Date().toLocaleDateString("vi-VN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <span>
                  {u.role === "director"
                    ? "Toàn công ty"
                    : departments[u.department]}{" "}
                  <span className="tiny-dot" /> Tổng quan hiện tại
                </span>
              </div>
              <div className="stats">
                {[
                  [
                    Layers,
                    "Tổng công việc",
                    all.length,
                    "Tất cả nhiệm vụ đang quản lý",
                    "purple",
                  ],
                  [
                    Clock,
                    "Đang thực hiện",
                    all.length - done,
                    "Công việc chưa hoàn thành",
                    "blue",
                  ],
                  [
                    CheckCheck,
                    "Đã hoàn thành",
                    done,
                    "Những cột mốc đã chinh phục",
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
                    <strong>{value.toString().padStart(2, "0")}</strong>
                    <small>
                      {sub}
                      <ArrowUpRight size={14} />
                    </small>
                  </button>
                ))}
              </div>
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
                      Xem tất cả <ArrowUpRight size={15} />
                    </button>
                  </div>
                  {(u.role === "director"
                    ? departments
                    : [departments[u.department]]
                  ).map((d, i) => {
                    const di = departments.indexOf(d),
                      ts = all.filter((t: any) => t.department === di),
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
                </section>
                <section className="panel progress-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Hiệu suất tổng thể</h3>
                      <p>Tỷ lệ công việc đã hoàn thành</p>
                    </div>
                    <span className="purple-tag">
                      {u.role === "director" ? "Toàn công ty" : "Phòng của bạn"}
                    </span>
                  </div>
                  <div
                    className="donut"
                    style={{
                      background: `conic-gradient(#0083ff ${avg}%,#e6ebf3 0)`,
                    }}
                  >
                    <div>
                      <strong>
                        {avg}
                        <span>%</span>
                      </strong>
                      <small>Tỷ lệ hoàn thành</small>
                    </div>
                  </div>
                  <div className="legend">
                    <span>
                      <i style={{ background: "#0083ff" }} /> Đã hoàn thành{" "}
                      <b>{done}</b>
                    </span>
                    <span>
                      <i style={{ background: "#e6ebf3" }} /> Chưa hoàn thành{" "}
                      <b>{all.filter((t: any) => t.progress === 0 && !late(t)).length}</b>
                    </span>
                    <span><i style={{ background: "#ffbd23" }} /> Đang thực hiện <b>{all.filter((t: any) => t.progress > 0 && t.progress < 100 && !late(t)).length}</b></span>
                    <span><i style={{ background: "#ff4939" }} /> Quá hạn <b>{overdue}</b></span>
                  </div>
                </section>
              </div>
            </>
          )}
          {(page === "tasks" || page === "dashboard") && (
            <section className="panel tasks-panel">
              <div className="panel-heading">
                <div>
                  <h3>
                    {page === "dashboard"
                      ? "Công việc cần theo dõi"
                      : "Danh sách công việc"}{" "}
                    <span className="count">{tasks.length}</span>
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
                    {(page === "dashboard" ? tasks.slice(0, 5) : tasks).map(
                      (t: any) => (
                        <tr
                          key={t.id}
                          onClick={() => open({ type: "detail", task: t })}
                        >
                          <td>
                            <b>{t.title}</b>
                            <small>
                              {departments[t.department]}
                              {t.parent
                                ? " · Công việc được phân công lại"
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
                            {date(t.deadline)}
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
                const ts = all.filter((t: any) => t.department === i),
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
              <div className="panel-heading">
                <div>
                  <h3>
                    Danh sách cán bộ{" "}
                    <span className="count">{people.length}</span>
                  </h3>
                  <p>Tài khoản là họ và tên viết liền, không dấu</p>
                </div>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>HỌ VÀ TÊN</th>
                      <th>CHỨC DANH</th>
                      <th>PHÒNG BAN</th>
                      <th>TÊN ĐĂNG NHẬP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {people.map((p: any) => (
                      <tr key={p.id}>
                        <td>
                          <div className="person-cell">
                            <span className="avatar">{initials(p.name)}</span>
                            <b>{p.name}</b>
                          </div>
                        </td>
                        <td>{p.position}</td>
                        <td>{departments[p.department] || "Ban giám đốc"}</td>
                        <td>
                          <code>{p.id}</code>
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
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="close"
              aria-label="Đóng"
              onClick={() => setModal(null)}
            >
              <X size={21} />
            </button>
            <div className="eyebrow">TEAMFLOW WORKSPACE</div>
            <h2>
              {modal.type === "create"
                ? "Giao công việc mới"
                : modal.type === "password"
                  ? "Thay đổi mật khẩu"
                  : "Chi tiết công việc"}
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
                  act({
                    action: "create",
                    title: f.get("title"),
                    content: f.get("content"),
                    assignee: f.get("assignee"),
                    deadline: new Date(String(f.get("deadline"))).toISOString(),
                    priority: f.get("priority"),
                    parent: f.get("parent"),
                  });
                }}
              >
                <p>
                  {u.role === "director"
                    ? "Giao nhiệm vụ cho trưởng phòng phụ trách."
                    : "Phân công nhiệm vụ cho cán bộ trong phòng."}
                </p>
                <label>
                  Tên công việc
                  <input
                    name="title"
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
                  <label>
                    Hạn hoàn thành
                    <input type="datetime-local" name="deadline" required />
                  </label>
                  <label>
                    Độ ưu tiên
                    <select name="priority">
                      <option>Bình thường</option>
                      <option>Cao</option>
                      <option>Thấp</option>
                    </select>
                  </label>
                </div>
                {u.role === "manager" && (
                  <label>
                    Thuộc công việc được giám đốc giao
                    <select name="parent" defaultValue={modal.parent || ""}>
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
                <button className="primary wide" disabled={busy}>
                  {busy ? "Đang lưu…" : "Giao công việc"}
                  <ArrowRight size={17} />
                </button>
              </form>
            ) : (
              <>
                <h3 className="detail-title">{modal.task.title}</h3>
                <span className="purple-tag">
                  {departments[modal.task.department]}
                </span>
                <p className="description">{modal.task.content}</p>
                <div className="detail-meta">
                  <span>
                    Người phụ trách<b>{name(modal.task.assignee)}</b>
                  </span>
                  <span>
                    Hạn hoàn thành
                    <b className={late(modal.task) ? "danger" : ""}>
                      {date(modal.task.deadline)}
                    </b>
                  </span>
                  <span>
                    Người giao<b>{name(modal.task.creator)}</b>
                  </span>
                  <span>
                    Độ ưu tiên<b>{modal.task.priority}</b>
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
                      Số lượng hoàn thành (không bắt buộc)
                      <input
                        type="number"
                        min="0"
                        step="1"
                        name="quantity"
                        defaultValue={modal.task.completed_quantity ?? ""}
                        placeholder="Nhập số lượng, ví dụ: 297"
                      />
                    </label>
                    <label className="completion-toggle">
                      <input type="checkbox" name="completed" defaultChecked={modal.task.progress === 100} />
                      Đã hoàn thành công việc
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
                    <div className="form-row">
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
                      <button className="primary" disabled={busy}>
                        {busy ? "Đang lưu…" : "Lưu tiến độ"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="callout">
                    Số lượng hoàn thành: {modal.task.completed_quantity ?? "Chưa nhập"}
                    <p>{modal.task.note || "Chưa có ghi chú cập nhật."}</p>
                  </div>
                )}
                <small className="muted">
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
