import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm, cp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer } from "node:net";
import { DatabaseSync } from "node:sqlite";

// Runs against the built standalone server and an isolated, disposable database.
test("TeamFlow: standalone, authentication, authorization and persistence", async (t) => {
  const folder = await mkdtemp(join(tmpdir(), "teamflow-test-"));
  const database = join(folder, "teamflow.sqlite");
  const reservation = createServer();
  await new Promise((done) => reservation.listen(0, "127.0.0.1", done));
  const port = reservation.address().port;
  await new Promise((done) => reservation.close(done));
  const base = `http://127.0.0.1:${port}`;
  const standalone = resolve(".next/standalone");
  await mkdir(join(standalone, ".next"), { recursive: true });
  await cp(resolve(".next/static"), join(standalone, ".next/static"), {
    recursive: true,
  });
  await cp(resolve("public"), join(standalone, "public"), { recursive: true });
  let server,
    logs = "";
  async function stop() {
    if (!server || server.exitCode !== null) return;
    const exited = once(server, "exit");
    server.kill();
    await exited;
  }
  async function start() {
    logs = "";
    server = spawn(process.execPath, ["server.js"], {
      cwd: standalone,
      env: {
        ...process.env,
        NODE_ENV: "production",
        NEXT_TELEMETRY_DISABLED: "1",
        DATABASE_PATH: database,
        SUPABASE_DATABASE_URL: "",
        VERCEL: "",
        ADMIN_PASSWORD: "1795",
        APP_URL: base,
        HOSTNAME: "127.0.0.1",
        PORT: String(port),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    server.stdout.on("data", (b) => {
      logs += b;
    });
    server.stderr.on("data", (b) => {
      logs += b;
    });
    server.on("error", (error) => {
      logs += error.message;
    });
    for (let i = 0; i < 100; i++) {
      try {
        if ((await fetch(base + "/api/work")).ok) return;
      } catch {}
      if (server.exitCode !== null) break;
      await new Promise((done) => setTimeout(done, 100));
    }
    throw new Error("Server did not start: " + logs);
  }
  async function post(body, cookie = "", origin = base) {
    const response = await fetch(base + "/api/work", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie, Origin: origin },
      body: JSON.stringify(body),
    });
    return {
      status: response.status,
      data: await response.json(),
      cookie: response.headers.get("set-cookie")?.split(";")[0],
      rawCookie: response.headers.get("set-cookie"),
    };
  }
  async function get(cookie = "") {
    return (await fetch(base + "/api/work", { headers: { cookie } })).json();
  }
  async function login(username, password = "0000") {
    const result = await post({ action: "login", username, password });
    assert.equal(result.status, 200, JSON.stringify(result));
    assert.match(result.rawCookie, /HttpOnly/);
    assert.match(result.rawCookie, /SameSite=Strict/);
    return result.cookie;
  }
  try {
    await start();
    const director = await login("phamthithanh"),
      managers = [],
      members = [];
    const pairs = [
      ["truongthiminhkhanh", "lethihoa"],
      ["phanhuutuan", "nguyenhoangvu"],
      ["nguyenthimaitrang", "nguyenthitram"],
      ["nguyenthoc", "nguyenthanhnhan"],
    ];
    for (const [manager, member] of pairs) {
      managers.push(await login(manager));
      members.push(await login(member));
    }
    let parent, child;
    await t.test("Anonymous requests and static page", async () => {
      assert.deepEqual(await get(), { user: null });
      assert.equal(
        (await post({ action: "update", id: "unknown", progress: 0 })).status,
        401,
      );
      const page = await fetch(base);
      assert.equal(page.status, 200);
      assert.match(await page.text(), /Bảo Việt Nhân thọ/);
      const roster = (await get(director)).users;
      assert.equal(roster.length, 19);
      assert.equal(new Set(roster.map((p) => p.id)).size, 19);
      for (const p of roster) await login(p.id);
    });
    await t.test(
      "Four departments: assignment, visibility and progress",
      async () => {
        for (let i = 0; i < 4; i++) {
          const title = `Test department ${i}`;
          assert.equal(
            (
              await post(
                {
                  action: "create",
                  title,
                  content: "Nội dung kiểm tra",
                  assignee: pairs[i][0],
                  deadline: "2030-12-31T10:00:00Z",
                  priority: "Cao",
                },
                director,
              )
            ).status,
            200,
          );
          const own = await get(managers[i]);
          assert.equal(own.tasks.length, 1);
          assert(own.tasks.every((task) => task.department === i));
          const task = own.tasks[0];
          if (i === 3) parent = task;
          assert.equal(
            (
              await post(
                {
                  action: "update",
                  id: task.id,
                  progress: 25,
                  note: "Đang thực hiện",
                },
                managers[i],
              )
            ).status,
            200,
          );
          assert.equal(
            (
              await post(
                { action: "update", id: task.id, progress: 100 },
                members[i],
              )
            ).status,
            403,
          );
          assert.equal(
            (
              await post(
                { action: "update", id: task.id, progress: 100 },
                managers[(i + 1) % 4],
              )
            ).status,
            403,
          );
          assert.equal(
            (
              await post(
                {
                  action: "create",
                  title: "Subtask",
                  content: "Nội dung",
                  assignee: pairs[i][1],
                  parent: task.id,
                  deadline: "2030-12-30T10:00:00Z",
                },
                managers[i],
              )
            ).status,
            200,
          );
          const visible = await get(members[i]);
          assert.equal(visible.tasks.length, 2);
          assert(visible.tasks.every((task) => task.department === i));
          assert(visible.users.every((person) => person.department === i));
          const sub = visible.tasks.find((task) => task.parent);
          if (i === 3) child = sub;
          assert.equal(
            (
              await post(
                {
                  action: "update",
                  id: sub.id,
                  progress: 70,
                  note: "Đã xử lý 70%",
                },
                members[i],
              )
            ).status,
            200,
          );
        }
        assert.equal((await get(director)).tasks.length, 8);
      },
    );
    await t.test("Notifications are scoped by recipient and reading is private", async () => {
      const company = await get(director);
      assert(company.notifications.length >= 8);
      for (let i = 0; i < 4; i++) {
        const manager = await get(managers[i]);
        assert(manager.notifications.length >= 2);
        assert(manager.notifications.every(item => manager.tasks.some(task => task.id === item.task_id)));
        const member = await get(members[i]);
        assert.equal(member.notifications.length, 1);
        assert(member.notifications.every(item => member.tasks.find(task => task.id === item.task_id)?.assignee === pairs[i][1]));
        const id = member.notifications[0].id;
        assert.equal((await post({ action: "readNotifications", ids: [id] }, members[(i + 1) % 4])).status, 200);
        assert.equal((await get(members[i])).unreadNotifications, 1);
        assert.equal((await post({ action: "readNotifications", ids: [id] }, members[i])).status, 200);
        assert.equal((await get(members[i])).unreadNotifications, 0);
        assert((await get(members[i])).notifications[0].read_at);
      }
    });
    await t.test("Enforce role and validate request data", async () => {
      const task = {
        action: "create",
        title: "Invalid",
        content: "Nội dung",
        assignee: pairs[0][1],
        deadline: "2030-12-30T10:00:00Z",
      };
      assert.equal((await post(task, director)).status, 403);
      assert.equal((await post(task, members[0])).status, 403);
      assert.equal((await post(task, managers[1])).status, 403);
      assert.equal(
        (await post({ ...task, parent: parent.id }, managers[0])).status,
        403,
      );
      for (const completedQuantity of [297, null]) {
        assert.equal((await post({ action: "update", id: child.id, progress: 70, completedQuantity }, members[3])).status, 200);
        const state = await (await fetch(base + "/api/work", { headers: { Cookie: members[3] } })).json();
        assert.equal(state.tasks.find((item) => item.id === child.id).completed_quantity, completedQuantity);
      }
      for (const completedQuantity of [-1, 5.5, "297"]) {
        assert.equal((await post({ action: "update", id: child.id, progress: 70, completedQuantity }, members[3])).status, 400);
      }
      assert.equal(
        (
          await post(
            { action: "update", id: child.id, progress: 101 },
            members[3],
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await post(
            { action: "update", id: child.id, progress: 5.5 },
            members[3],
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await post(
            { action: "update", id: child.id, progress: 1 },
            members[3],
            "https://other.example",
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await post(
            { ...task, assignee: pairs[0][0], deadline: "invalid" },
            director,
          )
        ).status,
        400,
      );
    });
    await t.test("Change password invalidates every session", async () => {
      const second = await login("nguyenthanhnhan");
      assert.equal(
        (
          await post(
            {
              action: "password",
              current: "wrong",
              next: "local-test-password",
            },
            members[3],
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await post(
            {
              action: "password",
              current: "0000",
              next: "local-test-password",
            },
            members[3],
          )
        ).status,
        200,
      );
      assert.deepEqual(await get(members[3]), { user: null });
      assert.deepEqual(await get(second), { user: null });
      assert.equal(
        (
          await post({
            action: "login",
            username: "nguyenthanhnhan",
            password: "0000",
          })
        ).status,
        401,
      );
      members[3] = await login("nguyenthanhnhan", "local-test-password");
    });
    await t.test(
      "Data, password and sessions survive a server restart",
      async () => {
        await stop();
        await start();
        assert.equal((await get(director)).tasks.length, 8);
        const state = await get(members[3]);
        assert.equal(state.user.id, "nguyenthanhnhan");
        assert.equal(
          state.tasks.find((task) => task.id === child.id).progress,
          70,
        );
        await login("nguyenthanhnhan", "local-test-password");
        assert.equal(
          (await post({ action: "logout" }, members[3])).status,
          200,
        );
        assert.deepEqual(await get(members[3]), { user: null });
      },
    );
    await t.test("Limit repeated failed login attempts", async () => {
      for (let i = 0; i < 10; i++)
        assert.equal(
          (
            await post({
              action: "login",
              username: "voduchai",
              password: "wrong",
            })
          ).status,
          401,
        );
      assert.equal(
        (
          await post({
            action: "login",
            username: "voduchai",
            password: "0000",
          })
        ).status,
        429,
      );
    });
    await t.test("Backup includes work records", async () => {
      const output = join(folder, "backup.sqlite");
      const child = spawn(process.execPath, ["scripts/backup.mjs", output], {
        cwd: resolve("."),
        env: { ...process.env, DATABASE_PATH: database },
        stdio: "pipe",
      });
      let error = "";
      child.stderr.on("data", (b) => (error += b));
      const [code] = await once(child, "exit");
      assert.equal(code, 0, error);
      const backup = new DatabaseSync(output, { readOnly: true });
      try {
        assert.equal(
          backup.prepare("SELECT count(*) AS n FROM tasks").get().n,
          8,
        );
      } finally {
        backup.close();
      }
    });
    await t.test("Admin authorization, analytics and deletion of task trees", async () => {
      const adminGet = (cookie = "") => fetch(base + "/api/work?view=admin", { headers: { cookie } });
      assert.equal((await adminGet()).status, 401);
      assert.equal((await adminGet(managers[0])).status, 401);
      assert.equal((await adminGet(director)).status, 401);
      assert.equal((await post({ action: "deleteTask", id: parent.id }, managers[0])).status, 401);
      assert.equal((await post({ action: "deleteTask", id: parent.id }, director)).status, 401);
      assert.equal((await post({ action: "adminLogin", password: "wrong" })).status, 401);
      assert.equal((await post({ action: "adminLogin", password: "1795" }, "", "https://untrusted.example")).status, 403);
      const loginAdmin = await post({ action: "adminLogin", password: "1795" });
      assert.equal(loginAdmin.status, 200);
      assert.match(loginAdmin.rawCookie, /^tf_admin_session=/);
      assert.match(loginAdmin.rawCookie, /HttpOnly/);
      assert.match(loginAdmin.rawCookie, /SameSite=Strict/);
      let adminCookie = loginAdmin.cookie;
      assert.deepEqual(await get(adminCookie), { user: null });
      assert.equal((await adminGet(adminCookie.replace(/.$/, "x"))).status, 401);
      assert.equal((await post({ action: "visit", path: "tasks" })).status, 401);
      assert.equal((await post({ action: "visit", path: "invalid" }, managers[0])).status, 400);
      assert.equal((await post({ action: "visit", path: "admin" }, managers[0])).status, 403);
      assert.equal((await post({ action: "visit", path: "tasks" }, managers[0])).status, 200);
      assert.equal((await post({ action: "visit", path: "dashboard" }, managers[0])).status, 200);
      await get(managers[0]); await get(managers[0]);
      const analytics = await (await adminGet(adminCookie)).json();
      assert.equal(analytics.analytics[0].views, 2);
      assert.equal(analytics.daily[0].visitors, 1);
      assert.equal(analytics.recent.length, 2);
      const root = analytics.tasks.find(task => !task.parent);
      const children = analytics.tasks.filter(task => task.parent === root.id);
      assert.ok(children.length > 0);
      assert.equal((await post({ action: "deleteTask", id: root.id }, adminCookie, "https://untrusted.example")).status, 403);
      assert.equal((await post({ action: "deleteTask", id: root.id }, adminCookie)).status, 200);
      const remaining = (await get(director)).tasks;
      assert.equal(remaining.length, analytics.tasks.length - children.length - 1);
      assert.ok(!remaining.some(task => task.id === root.id || task.parent === root.id));
      assert.equal((await post({ action: "update", id: root.id, progress: 100 }, director)).status, 403);
      assert.equal((await post({ action: "deleteTask", id: root.id }, adminCookie)).status, 404);
      const audit = new DatabaseSync(database, { readOnly: true });
      try {
        assert.equal(audit.prepare("SELECT deleted_by FROM tasks WHERE id=?").get(root.id).deleted_by, "admin");
        for (const task of [root, ...children]) assert.equal(audit.prepare("SELECT COUNT(*) AS n FROM notifications WHERE task_id=?").get(task.id).n, 0);
      } finally { audit.close(); }
      await stop(); await start();
      assert.equal((await (await adminGet(adminCookie)).json()).analytics[0].views, 2);
      assert.ok(!(await get(director)).tasks.some(task => task.id === root.id));
      assert.equal((await post({ action: "adminLogout" }, `${adminCookie}; ${managers[0]}`)).status, 200);
      assert.equal((await adminGet(adminCookie)).status, 401);
      assert.ok((await get(managers[0])).user);
      adminCookie = (await post({ action: "adminLogin", password: "1795" })).cookie;
      const expire = new DatabaseSync(database);
      try { expire.prepare("UPDATE sessions SET expires=0 WHERE user LIKE '__admin__:%'").run(); } finally { expire.close(); }
      assert.equal((await adminGet(adminCookie)).status, 401);
      assert.equal((await post({ action: "deleteTask", id: "unknown" }, adminCookie)).status, 401);
      for (let i = 0; i < 10; i++) assert.equal((await post({ action: "adminLogin", password: "wrong" })).status, 401);
      assert.equal((await post({ action: "adminLogin", password: "1795" })).status, 429);
    });
  } finally {
    await stop();
    await rm(folder, { recursive: true, force: true });
  }
});

