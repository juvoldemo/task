import { createHash, pbkdf2, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { users } from "../../data";
import { getDatabase, type Store } from "../../../lib/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const derive = promisify(pbkdf2);
const SESSION_MS = 8 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const json = (
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const tokenFrom = (req: Request) =>
  req.headers.get("cookie")?.match(/(?:^|;\s*)tf_session=([^;]+)/)?.[1];
const adminTokenFrom = (req: Request) =>
  req.headers.get("cookie")?.match(/(?:^|;\s*)tf_admin_session=([^;]+)/)?.[1];
const adminIdentity = () => process.env.ADMIN_PASSWORD ? `__admin__:${digest(process.env.ADMIN_PASSWORD)}` : null;
async function adminAuth(req: Request) {
  const token = adminTokenFrom(req);
  const identity = adminIdentity();
  if (!identity || !token || token.length > 256) return false;
  const session = await (await getDatabase()).prepare("SELECT user FROM sessions WHERE id=? AND expires>?").get(digest(token), Date.now());
  return session?.user === identity;
}
function adminCookie(req: Request, token: string, maxAge: number) {
  return `tf_admin_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${origin(req).startsWith("https:") ? "; Secure" : ""}`;
}

async function encode(password: string) {
  const salt = randomBytes(24).toString("hex");
  const result = await derive(password, salt, 100000, 32, "sha256");
  return `${salt}:${result.toString("hex")}`;
}
async function verify(password: string, encoded: string) {
  const [salt, expected] = encoded.split(":");
  if (!salt || !expected) return false;
  const actual = await derive(password, salt, 100000, 32, "sha256");
  const stored = Buffer.from(expected, "hex");
  return stored.length === actual.length && timingSafeEqual(actual, stored);
}
async function auth(req: Request) {
  const token = tokenFrom(req);
  if (!token || token.length > 256) return null;
  const session = await (await getDatabase())
    .prepare("SELECT user FROM sessions WHERE id=? AND expires>?")
    .get(digest(token), Date.now());
  return users.find((user) => user.id === session?.user) || null;
}
function origin(req: Request) {
  return process.env.APP_URL
    ? new URL(process.env.APP_URL).origin
    : new URL(req.url).origin;
}
function sessionCookie(req: Request, token: string, maxAge: number) {
  return `tf_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${origin(req).startsWith("https:") ? "; Secure" : ""}`;
}
function validString(value: unknown, max: number): value is string {
  return (
    typeof value === "string" && value.trim().length > 0 && value.length <= max
  );
}

async function notify(db: Store, actor: typeof users[number], task: Record<string, any>, message: string) {
  const recipients = users.filter(person => person.id !== actor.id && (
    person.role === "director" ||
    (person.role === "manager" && person.department === task.department) ||
    person.id === task.assignee
  ));
  for (const person of recipients) {
    await db.prepare("INSERT INTO notifications(id,recipient,task_id,message,created) VALUES(?,?,?,?,?)")
      .run(crypto.randomUUID(), person.id, task.id, message, new Date().toISOString());
  }
}

export async function GET(req: Request) {
  try {
    const admin = new URL(req.url).searchParams.get("view") === "admin";
    if (admin && !(await adminAuth(req))) return json({ error: "Vui lòng đăng nhập bằng mật khẩu admin." }, 401);
    const user = admin ? null : await auth(req);
    if (!admin && !user) return json({ user: null });
    const db = await getDatabase();
    if (admin) {
      const since = new Date(Date.now() - 30 * 86400000 + 7 * 3600000).toISOString().replace("Z", "+07:00");
      return json({ users, tasks: await db.prepare("SELECT * FROM tasks WHERE deleted_at IS NULL ORDER BY updated DESC").all(),
        analytics: await db.prepare("SELECT user_id, COUNT(*) AS views, MIN(visited_at) AS first_visit, MAX(visited_at) AS last_visit FROM access_events WHERE visited_at>=? GROUP BY user_id ORDER BY last_visit DESC").all(since),
        daily: await db.prepare("SELECT SUBSTR(visited_at,1,10) AS day, COUNT(*) AS views, COUNT(DISTINCT user_id) AS visitors FROM access_events WHERE visited_at>=? GROUP BY SUBSTR(visited_at,1,10) ORDER BY day").all(since),
        pages: await db.prepare("SELECT path, COUNT(*) AS views FROM access_events WHERE visited_at>=? GROUP BY path ORDER BY views DESC").all(since),
        devices: await db.prepare("SELECT device, COUNT(*) AS views FROM access_events WHERE visited_at>=? GROUP BY device").all(since),
        recent: await db.prepare("SELECT user_id,path,device,visited_at FROM access_events WHERE visited_at>=? ORDER BY visited_at DESC LIMIT 100").all(since),
      });
    }
    if (!user) return json({ user: null });
    const tasks =
      user.role === "director"
        ? await db.prepare("SELECT * FROM tasks WHERE deleted_at IS NULL ORDER BY updated DESC").all()
        : await db.prepare(
              "SELECT * FROM tasks WHERE department=? AND deleted_at IS NULL ORDER BY updated DESC",
            )
            .all(user.department);
    return json({
      user,
      users:
        user.role === "director"
          ? users
          : users.filter((p) => p.department === user.department),
      tasks,
      notifications: await db.prepare("SELECT * FROM notifications WHERE recipient=? ORDER BY created DESC LIMIT 100").all(user.id),
      unreadNotifications: (await db.prepare("SELECT COUNT(*) AS count FROM notifications WHERE recipient=? AND read_at IS NULL").get(user.id))?.count || 0,
    });
  } catch (error) {
    console.error("GET /api/work failed", error);
    return json({ error: "Không thể kết nối dữ liệu. Vui lòng thử lại." }, 500);
  }
}

export async function POST(req: Request) {
  try {
    if (
      req.headers.get("origin") &&
      req.headers.get("origin") !== origin(req)
    ) {
      return json(
        {
          error:
            "Tên miền gửi yêu cầu không hợp lệ. Kiểm tra cấu hình APP_URL.",
        },
        403,
      );
    }
    if (!req.headers.get("content-type")?.includes("application/json")) {
      return json({ error: "Yêu cầu phải có định dạng JSON." }, 415);
    }
    const raw = await req.text();
    if (Buffer.byteLength(raw) > 32768)
      return json({ error: "Nội dung yêu cầu quá lớn." }, 413);
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw);
    } catch {
      return json({ error: "Dữ liệu JSON không hợp lệ." }, 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body))
      return json({ error: "Yêu cầu không hợp lệ." }, 400);
    const db = await getDatabase();

    if (body.action === "adminLogin") {
      const password = process.env.ADMIN_PASSWORD;
      if (!password) return json({ error: "Chưa cấu hình mật khẩu admin trên máy chủ." }, 503);
      const now = Date.now();
      const key = "__admin_login__";
      await db.prepare("DELETE FROM login_attempts WHERE reset_at<=?").run(now);
      const attempt = await db.prepare("SELECT failures FROM login_attempts WHERE username=?").get(key);
      if (attempt && Number(attempt.failures) >= 10) return json({ error: "Nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút." }, 429, { "Retry-After": "900" });
      if (typeof body.password !== "string" || body.password.length > 128 || !timingSafeEqual(Buffer.from(digest(body.password)), Buffer.from(digest(password)))) {
        await db.prepare("INSERT INTO login_attempts(username,failures,reset_at) VALUES(?,1,?) ON CONFLICT(username) DO UPDATE SET failures=failures+1").run(key, now + LOGIN_WINDOW_MS);
        return json({ error: "Mật khẩu admin không đúng." }, 401);
      }
      await db.prepare("DELETE FROM login_attempts WHERE username=?").run(key);
      await db.prepare("DELETE FROM sessions WHERE expires<=?").run(now);
      const token = randomBytes(32).toString("hex");
      await db.prepare("INSERT INTO sessions(id,user,expires) VALUES(?,?,?)").run(digest(token), adminIdentity(), now + SESSION_MS);
      return json({ ok: true }, 200, { "Set-Cookie": adminCookie(req, token, SESSION_MS / 1000) });
    }
    if (body.action === "adminLogout") {
      const token = adminTokenFrom(req);
      if (token) await db.prepare("DELETE FROM sessions WHERE id=?").run(digest(token));
      return json({ ok: true }, 200, { "Set-Cookie": adminCookie(req, "", 0) });
    }
    if (body.action === "deleteTask") {
      if (!(await adminAuth(req))) return json({ error: "Vui lòng đăng nhập bằng mật khẩu admin." }, 401);
      if (!validString(body.id, 100)) return json({ error: "Nhiệm vụ không hợp lệ." }, 400);
      const task = await db.prepare("SELECT id FROM tasks WHERE id=? AND deleted_at IS NULL").get(body.id);
      if (!task) return json({ error: "Nhiệm vụ không còn tồn tại." }, 404);
      await db.transaction(async tx => {
        const tree = await tx.prepare("WITH RECURSIVE branch(id) AS (SELECT id FROM tasks WHERE id=? UNION SELECT t.id FROM tasks t JOIN branch b ON t.parent=b.id) SELECT id FROM branch").all(body.id);
        for (const row of tree) {
          await tx.prepare("UPDATE tasks SET deleted_at=?,deleted_by=? WHERE id=? AND deleted_at IS NULL").run(new Date().toISOString(), "admin", row.id);
          await tx.prepare("DELETE FROM notifications WHERE task_id=?").run(row.id);
        }
      });
      return json({ ok: true });
    }
    if (body.action === "login") {
      if (
        !validString(body.username, 100) ||
        typeof body.password !== "string" ||
        body.password.length > 128
      ) {
        return json({ error: "Tên đăng nhập hoặc mật khẩu không đúng." }, 401);
      }
      const username = body.username.trim().toLowerCase();
      const user = users.find((p) => p.id === username);
      if (!user)
        return json({ error: "Tên đăng nhập hoặc mật khẩu không đúng." }, 401);
      const now = Date.now();
      await db.prepare("DELETE FROM sessions WHERE expires<=?").run(now);
      await db.prepare("DELETE FROM login_attempts WHERE reset_at<=?").run(now);
      const attempt = await db.prepare("SELECT failures FROM login_attempts WHERE username=?")
        .get(username);
      if (attempt && Number(attempt.failures) >= 10) {
        return json(
          {
            error: "Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.",
          },
          429,
          { "Retry-After": "900" },
        );
      }
      let account = await db.prepare("SELECT password FROM accounts WHERE id=?")
        .get(user.id);
      let accepted = account
        ? await verify(body.password, String(account.password))
        : body.password === "0000";
      if (!accepted) {
        await db.prepare(
          `INSERT INTO login_attempts(username,failures,reset_at) VALUES(?,1,?)
          ON CONFLICT(username) DO UPDATE SET failures=failures+1`,
        ).run(username, now + LOGIN_WINDOW_MS);
        return json({ error: "Tên đăng nhập hoặc mật khẩu không đúng." }, 401);
      }
      if (!account) {
        const encoded = await encode("0000");
        await db.prepare(
          "INSERT OR IGNORE INTO accounts(id,password) VALUES(?,?)",
        ).run(user.id, encoded);
        account = await db.prepare("SELECT password FROM accounts WHERE id=?")
          .get(user.id);
        // Recheck if another request created or changed the account while hashing.
        accepted =
          !!account && (await verify(body.password, String(account.password)));
        if (!accepted)
          return json(
            { error: "Tên đăng nhập hoặc mật khẩu không đúng." },
            401,
          );
      }
      await db.prepare("DELETE FROM login_attempts WHERE username=?").run(username);
      const token = randomBytes(32).toString("hex");
      await db.prepare("INSERT INTO sessions(id,user,expires) VALUES(?,?,?)").run(
        digest(token),
        user.id,
        now + SESSION_MS,
      );
      return json({ ok: true }, 200, {
        "Set-Cookie": sessionCookie(req, token, SESSION_MS / 1000),
      });
    }

    const user = await auth(req);
    if (!user) return json({ error: "Vui lòng đăng nhập." }, 401);
    if (body.action === "visit") {
      if (typeof body.path !== "string" || !["dashboard", "tasks", "departments", "people", "admin"].includes(body.path)) return json({ error: "Màn hình không hợp lệ." }, 400);
      if (body.path === "admin" && user.role !== "director") return json({ error: "Không có quyền truy cập." }, 403);
      const agent = req.headers.get("user-agent") || "";
      const device = /mobile|android|iphone|ipad/i.test(agent) ? "Mobile / Tablet" : "PC";
      // Store Vietnam local calendar dates consistently in both database backends.
      const visited = new Date(Date.now() + 7 * 3600000).toISOString().replace("Z", "+07:00");
      await db.prepare("INSERT INTO access_events(id,user_id,path,device,visited_at) VALUES(?,?,?,?,?)").run(crypto.randomUUID(), user.id, body.path, device, visited);
      return json({ ok: true });
    }
    if (body.action === "readNotifications") {
      if (!Array.isArray(body.ids) || body.ids.length > 100 || !body.ids.every(id => typeof id === "string")) return json({ error: "Thông báo không hợp lệ." }, 400);
      for (const id of body.ids) await db.prepare("UPDATE notifications SET read_at=? WHERE id=? AND recipient=? AND read_at IS NULL").run(new Date().toISOString(), id, user.id);
      return json({ ok: true });
    }

    if (body.action === "logout") {
      await db.prepare("DELETE FROM sessions WHERE id=?").run(
        digest(tokenFrom(req) || ""),
      );
      return json({ ok: true }, 200, {
        "Set-Cookie": sessionCookie(req, "", 0),
      });
    }
    if (body.action === "password") {
      if (
        typeof body.current !== "string" ||
        body.current.length > 128 ||
        typeof body.next !== "string" ||
        body.next.length < 4 ||
        body.next.length > 128
      ) {
        return json({ error: "Mật khẩu mới cần từ 4 đến 128 ký tự." }, 400);
      }
      const account = await db.prepare("SELECT password FROM accounts WHERE id=?")
        .get(user.id);
      if (!account || !(await verify(body.current, String(account.password))))
        return json({ error: "Mật khẩu hiện tại không đúng." }, 400);
      const encoded = await encode(body.next);
      await db.transaction(async (tx) => {
        await tx.prepare("UPDATE accounts SET password=? WHERE id=?").run(encoded, user.id);
        await tx.prepare("DELETE FROM sessions WHERE user=?").run(user.id);
      });
      return json({ ok: true }, 200, {
        "Set-Cookie": sessionCookie(req, "", 0),
      });
    }
    if (body.action === "create") {
      if (!["director", "manager"].includes(user.role))
        return json({ error: "Bạn không có quyền giao việc." }, 403);
      const target = users.find((p) => p.id === body.assignee);
      if (
        !target ||
        (user.role === "director"
          ? target.role !== "manager"
          : target.department !== user.department || target.id === user.id)
      ) {
        return json({ error: "Người nhận không hợp lệ." }, 403);
      }
      if (
        !validString(body.title, 200) ||
        !validString(body.content, 10000) ||
        !validString(body.deadline, 50) ||
        !Number.isFinite(Date.parse(body.deadline))
      ) {
        return json(
          { error: "Vui lòng nhập tên, nội dung và thời hạn hợp lệ." },
          400,
        );
      }
      const parentId = body.parent || null;
      let taskTitle = body.title.trim();
      if (parentId) {
        if (typeof parentId !== "string")
          return json({ error: "Công việc gốc không hợp lệ." }, 400);
        const parent = await db.prepare("SELECT * FROM tasks WHERE id=? AND deleted_at IS NULL")
          .get(parentId);
        if (
          !parent ||
          parent.department !== target.department ||
          (user.role !== "director" && parent.assignee !== user.id)
        ) {
          return json({ error: "Công việc gốc không hợp lệ." }, 403);
        }
        taskTitle = String(parent.title);
      }
      const taskId = crypto.randomUUID();
      await db.transaction(async transaction => {
      await transaction.prepare(
        `INSERT INTO tasks(id,title,content,department,assignee,creator,deadline,progress,priority,parent,note,updated)
        VALUES(?,?,?,?,?,?,?,0,?,?,?,?)`,
      ).run(
        taskId,
        taskTitle,
        String(body.content).trim(),
        target.department,
        target.id,
        user.id,
        new Date(String(body.deadline)).toISOString(),
        ["Cao", "Bình thường", "Thấp"].includes(String(body.priority))
          ? String(body.priority)
          : "Bình thường",
        parentId as string | null,
        "",
        new Date().toISOString(),
      );
      await notify(transaction, user, { id: taskId, department: target.department, assignee: target.id }, `${user.name} ${parentId ? "phân công tiếp" : "giao công việc"} “${taskTitle}” cho ${target.name}.`);
      });
      return json({ ok: true });
    }
    if (body.action === "update") {
      if (typeof body.id !== "string")
        return json({ error: "Công việc không hợp lệ." }, 400);
      const task = await db.prepare("SELECT * FROM tasks WHERE id=? AND deleted_at IS NULL").get(body.id);
      if (
        !task ||
        (user.role !== "director" &&
          !(user.role === "manager" && task.department === user.department) &&
          task.assignee !== user.id)
      ) {
        return json({ error: "Bạn không có quyền cập nhật." }, 403);
      }
      if (
        typeof body.progress !== "number" ||
        !Number.isInteger(body.progress) ||
        body.progress < 0 ||
        body.progress > 100 ||
        (body.completedQuantity !== undefined && body.completedQuantity !== null &&
          (typeof body.completedQuantity !== "number" || !Number.isSafeInteger(body.completedQuantity) || body.completedQuantity < 0)) ||
        (body.note !== undefined &&
          (typeof body.note !== "string" || body.note.length > 5000))
      ) {
        return json(
          { error: "Số lượng hoàn thành phải là số nguyên không âm hoặc để trống; ghi chú tối đa 5.000 ký tự." },
          400,
        );
      }
      await db.transaction(async transaction => {
      await transaction.prepare("UPDATE tasks SET progress=?,note=?,updated=?,completed_quantity=? WHERE id=?").run(
        body.progress, String(body.note || ""), new Date().toISOString(),
        body.completedQuantity === undefined ? task.completed_quantity ?? null : body.completedQuantity,
        body.id,
      );
      const changes: string[] = [];
      if (body.progress !== task.progress) changes.push(body.progress === 100 ? "đã hoàn thành" : "cập nhật trạng thái");
      if (body.completedQuantity !== undefined && body.completedQuantity !== (task.completed_quantity ?? null)) changes.push(`số lượng hoàn thành: ${body.completedQuantity ?? "chưa nhập"}`);
      if (String(body.note || "") !== task.note) changes.push(`ghi chú: ${String(body.note || "đã xóa ghi chú")}`);
      if (changes.length) await notify(transaction, user, task, `${user.name} cập nhật “${task.title}”: ${changes.join("; ")}.`);
      });
      return json({ ok: true });
    }
    return json({ error: "Thao tác không hợp lệ." }, 400);
  } catch (error) {
    console.error("POST /api/work failed", error);
    return json({ error: "Không thể xử lý yêu cầu. Vui lòng thử lại." }, 500);
  }
}
