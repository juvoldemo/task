# TeamFlow — mã nguồn độc lập

Ứng dụng quản lý công việc nội bộ bằng **Next.js + React + SQLite**. Chạy bằng Node.js trên Windows/Linux hoặc Docker; dùng domain riêng. Không cần tài khoản ChatGPT, OpenAI API key, Cloudflare D1 hay Sites.

## 1. Chạy local trên Windows

Cài **Node.js 24.x** (kèm npm), mở PowerShell tại thư mục chứa `package.json`:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Truy cập **http://localhost:3000**.

Nếu chạy trên macOS/Linux, thay lệnh sao chép bằng `cp .env.example .env.local`.

Đăng nhập giám đốc: **phamthithanh / 0000**. Các cán bộ dùng tài khoản trong bảng bên dưới. Có nút **Đổi mật khẩu** trong ứng dụng.

Chạy bản production trên máy:

```powershell
npm run build
npm start
```

Dừng bằng `Ctrl+C`. Dữ liệu vẫn còn trong `data/teamflow.sqlite`. Chỉ chạy một tiến trình ứng dụng với một file SQLite; không chạy dev và production cùng lúc trên cùng cổng/cơ sở dữ liệu.

## 2. Chức năng và quyền

- Giám đốc xem dashboard toàn công ty, xem toàn bộ công việc, giao nhiệm vụ cho trưởng phòng.
- Trưởng phòng xem dashboard và tất cả công việc của phòng mình; giao hoặc phân công tiếp cho cán bộ trong phòng.
- Thành viên xem công việc của phòng và cập nhật công việc được giao cho mình.
- Nội dung, người phụ trách, hạn hoàn thành, độ ưu tiên, % tiến độ, ghi chú cập nhật, lọc và cảnh báo quá hạn.
- Công việc phân công tiếp liên kết với nhiệm vụ gốc. Tiến độ nhiệm vụ gốc do người có quyền cập nhật, không tự cộng tiến độ các việc con.
- Phân quyền kiểm tra phía máy chủ. Mật khẩu được băm với PBKDF2 và salt riêng. Phiên đăng nhập 8 giờ, cookie HttpOnly/SameSite; đổi mật khẩu hủy các phiên cũ. Giới hạn 10 lần sai trong 15 phút cho mỗi tài khoản.
- Dashboard làm mới mỗi 30 giây khi tab đang mở, và sau mỗi thao tác lưu.

Bản source này bắt đầu với cơ sở dữ liệu công việc trống; không chứa dữ liệu hay phiên đăng nhập từ website cũ hoặc từ bài kiểm tra.

## 3. Danh sách 19 tài khoản

Mật khẩu mặc định của mỗi tài khoản: **0000**. Đổi mật khẩu cho từng cán bộ khi bắt đầu sử dụng thực tế.

| Họ tên | Chức danh | Phòng | Tài khoản |
| --- | --- | --- | --- |
| Phạm Thị Thành | Giám đốc | Ban giám đốc | phamthithanh |
| Trương Thị Minh Khánh | Trưởng phòng | Dịch vụ khách hàng | truongthiminhkhanh |
| Phạm Hồng Thắng | Phó phòng | Dịch vụ khách hàng | phamhongthang |
| Lê Thị Hòa | Chuyên viên | Dịch vụ khách hàng | lethihoa |
| Trần Huy Mạnh | Chuyên viên | Dịch vụ khách hàng | tranhuymanh |
| Hoàng Thị Minh Yến | Chuyên viên | Dịch vụ khách hàng | hoangthiminhyen |
| Phạm Thị Thanh Nga | Chuyên viên | Dịch vụ khách hàng | phamthithanhnga |
| Phan Hữu Tuân | Trưởng phòng | Hỗ trợ kinh doanh | phanhuutuan |
| Trần Trịnh Thị Trinh | Kế toán quản trị | Hỗ trợ kinh doanh | trantrinhthitrinh |
| Nguyễn Hoàng Vũ | Chuyên viên | Hỗ trợ kinh doanh | nguyenhoangvu |
| Đỗ Thị Khánh Ngọc | Chuyên viên | Hỗ trợ kinh doanh | dothikhanhngoc |
| Nguyễn Hùng Phương | Chuyên viên | Hỗ trợ kinh doanh | nguyenhungphuong |
| Võ Đức Hải | Chuyên viên | Hỗ trợ kinh doanh | voduchai |
| Nguyễn Thị Mai Trang | Trưởng phòng | Phát triển kinh doanh 1 | nguyenthimaitrang |
| Nguyễn Thị Trầm | Chuyên viên | Phát triển kinh doanh 1 | nguyenthitram |
| Đinh Quốc Tiến | Chuyên viên | Phát triển kinh doanh 1 | dinhquoctien |
| Nguyễn Thóc | Trưởng phòng | Phát triển kinh doanh 2 | nguyenthoc |
| Nguyễn Thành Nhân | Chuyên viên | Phát triển kinh doanh 2 | nguyenthanhnhan |
| Trần Xuân Thu | Chuyên viên | Phát triển kinh doanh 2 | tranxuanthu |

Phó phòng và kế toán quản trị có quyền thành viên; quyền phân công thuộc trưởng phòng theo yêu cầu ban đầu. Danh sách nhân sự và chức danh ở `app/data.ts`. Tài khoản xuất hiện sẵn trong danh sách và mật khẩu mặc định được khởi tạo khi đăng nhập lần đầu.

## 4. Cấu hình

| Biến | Ví dụ | Ý nghĩa |
| --- | --- | --- |
| `APP_URL` | `http://localhost:3000` | Địa chỉ người dùng truy cập, dùng kiểm tra nguồn yêu cầu và bật cookie Secure khi là HTTPS. |
| `DATABASE_PATH` | `./data/teamflow.sqlite` | Vị trí SQLite; đường dẫn tương đối tính từ thư mục chạy ứng dụng. |
| `NEXT_TELEMETRY_DISABLED` | `1` | Tắt telemetry của Next.js. |

Khi đổi domain/cổng, sửa `APP_URL` cho đúng giao thức, tên miền và cổng rồi khởi động lại. Không dùng dấu `/` cuối hoặc đường dẫn con. Next.js đọc `.env.local` khi chạy trực tiếp; Docker Compose dùng file `.env` theo hướng dẫn sau.

Ứng dụng có backend nên không thể deploy bằng cách chỉ upload HTML lên hosting tĩnh hoặc hosting chỉ hỗ trợ PHP. Bản SQLite cần ổ đĩa lưu bền và một instance Node.js. Không dùng nguyên cấu hình này trên môi trường serverless có filesystem tạm thời; trường hợp đó cần thay SQLite bằng cơ sở dữ liệu dịch vụ.

## 5. Docker local

Cài Docker có lệnh `docker compose`, rồi chạy tại thư mục source:

```sh
docker compose up -d --build
```

Truy cập `http://localhost:3000`. File `compose.yml` gắn volume `teamflow-data` để lưu dữ liệu qua các lần cập nhật/restart. `docker compose down` giữ volume; không dùng `down -v` nếu muốn giữ dữ liệu.

## 6. Deploy VPS với domain riêng và HTTPS

Điều kiện: VPS Linux đã cài Docker Compose, domain/subdomain trỏ A record về IP VPS, cổng 80 và 443 mở và chưa bị dịch vụ khác chiếm. Nếu có AAAA record, IPv6 cũng phải trỏ đúng máy chủ.

Upload source lên VPS, ví dụ `/opt/teamflow`, rồi:

```sh
cd /opt/teamflow
cp .env.production.example .env
```

Sửa `.env` theo domain thực tế:

```dotenv
DOMAIN=congviec.congty.vn
APP_URL=https://congviec.congty.vn
```

Khởi động ứng dụng và Caddy để cấp HTTPS tự động:

```sh
docker compose -f compose.yml -f compose.production.yml up -d --build
docker compose -f compose.yml -f compose.production.yml logs --tail=100
```

Mở `https://congviec.congty.vn`. Caddy nhận kết nối Internet, ứng dụng chạy trong mạng Docker. Cổng 3000 chỉ được publish ra loopback của VPS.

Cập nhật sau khi thay source:

```sh
docker compose -f compose.yml -f compose.production.yml up -d --build
```

Volume dữ liệu vẫn được giữ. Trước khi nâng cấp, tạo backup theo mục dưới.

Nếu VPS đã có Nginx hoặc một reverse proxy khác: chỉ chạy `docker compose up -d --build`, cấu hình proxy tới `http://127.0.0.1:3000`, cấp HTTPS và đặt `APP_URL` đúng domain. Không chạy thêm Caddy trên cùng cổng 80/443.

## 7. Deploy Node.js trực tiếp

Trên máy chủ có Node.js 24.x và ổ đĩa lưu bền:

```sh
npm ci
cp .env.example .env.local
# Sửa APP_URL=https://domain-cua-ban.vn và DATABASE_PATH=/duong-dan-luu-ben/teamflow.sqlite
npm run build
npm start
```

Đặt process manager/systemd của máy chủ để tự khởi động lại và cấu hình reverse proxy HTTPS tới cổng 3000. Tài khoản chạy ứng dụng phải có quyền ghi thư mục database. Chỉ cần thay `.env.local` và restart khi chuyển domain; không có URL ChatGPT trong mã nguồn.

## 8. Sao lưu và khôi phục

Chạy trực tiếp:

```sh
npm run backup
```

Tạo file mới trong `backups/`, đọc đúng `DATABASE_PATH` trong `.env.local`. Có thể chỉ định file:

```sh
npm run backup -- ./backups/ten-backup-moi.sqlite
```

Script dùng SQLite backup API để có bản sao nhất quán ngay khi ứng dụng đang chạy. Mỗi lần chọn tên file mới.

Với Docker:

```sh
docker compose exec app node scripts/backup.mjs /app/data/backups/ten-backup-moi.sqlite
mkdir -p backups
docker compose cp app:/app/data/backups/ten-backup-moi.sqlite ./backups/ten-backup-moi.sqlite
```

Sao lưu chứa cả tài khoản, mật khẩu đã băm và phiên đăng nhập; lưu ở nơi riêng tư.

Khôi phục khi chạy Node trực tiếp: dừng ứng dụng; đổi tên thư mục `data` cũ để giữ bản dự phòng; tạo lại thư mục `data`; sao chép file backup vào đúng `DATABASE_PATH`; khởi động lại. Không sao chép đè khi ứng dụng còn đang chạy, và không mang các file `-wal`/`-shm` cũ vào thư mục khôi phục. Với Docker, dừng container ứng dụng và khôi phục vào volume `teamflow-data` tương ứng, giữ đúng quyền ghi UID/GID 1001.

## 9. Kiểm tra

```sh
npm run typecheck
npm run build
npm test
```

`npm test` tự chạy bản server standalone ở cổng tạm, dùng database tạm, rồi dọn dữ liệu kiểm tra. Bao gồm: 19 tài khoản, phân quyền 4 phòng, giao việc hai cấp, cập nhật tiến độ, kiểm tra dữ liệu đầu vào, đổi mật khẩu/hủy phiên, logout, khởi động lại vẫn giữ dữ liệu, giới hạn đăng nhập sai và sao lưu. Không đụng tới database thật.

Đã chạy thành công build, kiểm tra TypeScript và 8 bài kiểm tra trên Windows/Node.js 24.16.0. Docker chưa được chạy thử ở môi trường bàn giao vì máy không cài Docker.

## 10. Cấu trúc

- `app/page.tsx`, `app/globals.css`: giao diện.
- `app/data.ts`: danh sách phòng ban và nhân sự.
- `app/api/work/route.ts`: đăng nhập, session, phân quyền và công việc.
- `lib/database.ts`: SQLite, schema và chỉ mục, tự khởi tạo khi sử dụng lần đầu.
- `scripts/backup.mjs`: sao lưu SQLite.
- `tests/api.test.mjs`: kiểm tra tích hợp trên server độc lập.
- `Dockerfile`, `compose*.yml`, `deploy/Caddyfile`: triển khai VPS.

Font Be Vietnam Pro tải từ Google Fonts; nếu máy không có Internet sẽ dùng Arial/sans-serif. Logic ứng dụng, tài khoản và dữ liệu không cần kết nối ChatGPT.

Tài liệu nền tảng: [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting), [Node.js SQLite](https://nodejs.org/docs/latest-v24.x/api/sqlite.html).

