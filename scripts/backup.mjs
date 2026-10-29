import { DatabaseSync, backup } from "node:sqlite";
import { mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
const source = resolve(process.env.DATABASE_PATH || "./data/teamflow.sqlite");
if (!existsSync(source))
  throw new Error(
    "Chưa có cơ sở dữ liệu. Hãy đăng nhập ứng dụng trước khi sao lưu.",
  );
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const destination = resolve(
  process.argv[2] || `./backups/teamflow-${timestamp}.sqlite`,
);
if (source === destination || existsSync(destination))
  throw new Error(
    "Đường dẫn sao lưu phải là tệp mới, khác cơ sở dữ liệu hiện tại.",
  );
mkdirSync(dirname(destination), { recursive: true });
const db = new DatabaseSync(source, { readOnly: true });
try {
  await backup(db, destination);
  console.log(`Đã sao lưu: ${destination}`);
} finally {
  db.close();
}
