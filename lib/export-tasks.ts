import ExcelJS from "exceljs";

type Task = { id: string; title: string; content: string; department: number; assignee: string; creator: string; deadline: string; progress: number; priority: string; parent?: string; note?: string; updated: string; completed_quantity?: number | null; completed_at?: string | null };
type Person = { id: string; name: string };
const navy = "102E65", blue = "0065FF", muted = "61738F";
const states = ["Chưa bắt đầu", "Đang thực hiện", "Quá hạn", "Hoàn thành"];
const colors = ["EEF1F5", "EEE8FF", "FDE5E5", "E2F4EA"];
const grid: Partial<ExcelJS.Borders> = Object.fromEntries(
  ["top", "left", "bottom", "right"].map(side => [side, { style: "thin", color: { argb: "B9C9DD" } }]),
);
// Excel dates are timezone-free: store the Vietnam wall-clock date/time.
const excelDate = (value?: string | null) => value && Number.isFinite(Date.parse(value))
  ? new Date(new Date(value).getTime() + (value.includes("T") ? 7 * 3600000 : 0)) : null;
export async function buildTaskWorkbook(tasks: Task[], people: Person[], departments: string[], scope: string, now = new Date(), context: Task[] = tasks) {
  const book = new ExcelJS.Workbook();
  book.creator = "Bảo Việt Nhân thọ";
  book.created = now;
  const person = (id: string) => people.find(p => p.id === id)?.name || id;
  const state = (t: Task) => t.progress === 100 ? 3 : new Date(t.deadline) < now ? 2 : t.progress > 0 ? 1 : 0;
  const summary = book.addWorksheet("Tổng quan", { views: [{ showGridLines: false }] });
  const detail = book.addWorksheet("Chi tiết công việc", { views: [{ state: "frozen", ySplit: 6, xSplit: 2, showGridLines: false }] });
  for (const sheet of [summary, detail]) {
    sheet.properties.defaultRowHeight = 22;
    sheet.properties.tabColor = { argb: blue };
    sheet.pageSetup = { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
    sheet.headerFooter.oddFooter = "&L Bảo Việt Nhân thọ &R Trang &P / &N";
  }
  const title = (sheet: ExcelJS.Worksheet, text: string, last: string) => {
    sheet.mergeCells(`A2:${last}2`);
    sheet.getCell("A2").value = text;
    sheet.getCell("A2").font = { name: "Arial", size: 16, bold: true, color: { argb: navy } };
    sheet.getRow(2).height = 30;
    sheet.mergeCells(`A3:${last}3`);
    sheet.getCell("A3").value = `BẢO VIỆT NHÂN THỌ · Xuất lúc ${now.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} (giờ Việt Nam)`;
    sheet.mergeCells(`A4:${last}4`);
    sheet.getCell("A4").value = scope;
    for (const row of [3, 4]) { sheet.getCell(`A${row}`).font = { name: "Arial", size: 10, color: { argb: muted } }; sheet.getRow(row).height = 24; }
  };
  const header = (row: ExcelJS.Row) => {
    row.height = 32;
    row.eachCell(cell => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: navy } };
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFF" } };
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.border = grid;
    });
  };
  title(summary, "BÁO CÁO TIẾN ĐỘ CÔNG VIỆC", "G");
  summary.columns = [{ width: 7 }, { width: 32 }, ...Array.from({ length: 5 }, () => ({ width: 20 }))];
  summary.mergeCells("A6:B6"); summary.getCell("A6").value = "Tổng số công việc";
  summary.getCell("C6").value = tasks.length;
  summary.mergeCells("D6:E6"); summary.getCell("D6").value = "Tỷ lệ hoàn thành";
  summary.getCell("F6").value = tasks.length ? tasks.filter(t => state(t) === 3).length / tasks.length : 0;
  summary.getCell("F6").numFmt = "0.0%";
  summary.mergeCells("F6:G6");
  summary.getRow(6).height = 38;
  for (let col = 1; col <= 7; col++) {
    const cell = summary.getRow(6).getCell(col);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "EAF1FB" } };
    cell.border = grid;
    cell.font = { name: "Arial", size: 11, bold: true, color: { argb: navy } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  }
  for (const address of ["C6", "F6"]) summary.getCell(address).font = { name: "Arial", size: 16, bold: true, color: { argb: blue } };
  summary.getRow(8).values = ["STT", "Trạng thái", "Số công việc", "Tỷ trọng"];
  header(summary.getRow(8));
  states.forEach((label, i) => {
    const count = tasks.filter(t => state(t) === i).length;
    const row = summary.getRow(9 + i); row.values = [i + 1, label, count, tasks.length ? count / tasks.length : 0];
    row.getCell(4).numFmt = "0.0%";
    row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors[i] } };
  });
  summary.getRow(15).values = ["STT", "Phòng ban", "Tổng công việc", ...states]; header(summary.getRow(15));
  departments.forEach((dept, i) => {
    const rows = tasks.filter(t => t.department === i);
    summary.getRow(16 + i).values = [i + 1, dept, rows.length, ...states.map((_, s) => rows.filter(t => state(t) === s).length)];
  });
  const totalRow = 16 + departments.length;
  summary.mergeCells(`A${totalRow}:B${totalRow}`);
  summary.getCell(`A${totalRow}`).value = "TỔNG CỘNG";
  summary.getCell(`C${totalRow}`).value = tasks.length;
  states.forEach((_, i) => { summary.getRow(totalRow).getCell(i + 4).value = tasks.filter(t => state(t) === i).length; });
  for (const [first, last, cols] of [[9, 12, 4], [16, totalRow, 7]]) {
    for (let r = first; r <= last; r++) {
      const row = summary.getRow(r); row.height = 30;
      for (let c = 1; c <= cols; c++) {
        const cell = row.getCell(c);
        cell.border = grid;
        cell.alignment = { vertical: "middle", horizontal: c === 2 ? "left" : "center", indent: c === 2 ? 1 : 0, wrapText: true };
        cell.numFmt = c === 4 && first === 9 ? "0.0%" : c > 2 ? "#,##0" : "General";
        if (!(first === 9 && c === 2)) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: (r - first) % 2 ? "F0F5FC" : "FFFFFF" } };
      }
    }
  }
  for (let c = 1; c <= 7; c++) {
    const cell = summary.getRow(totalRow).getCell(c);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "DFEAF9" } };
    cell.font = { name: "Arial", size: 11, bold: true, color: { argb: navy } };
  }
  const noteRow = Math.max(22, totalRow + 2);
  summary.mergeCells(`A${noteRow}:G${noteRow}`); summary.getCell(`A${noteRow}`).value = "Số liệu tính trên từng công việc, bao gồm việc được giao tiếp; nhóm trạng thái không trùng nhau.";
  summary.mergeCells(`A${noteRow + 1}:G${noteRow + 1}`); summary.getCell(`A${noteRow + 1}`).value = "Ngày hoàn thành “Chưa ghi nhận”: công việc cũ chưa có dữ liệu ngày hoàn thành.";
  for (const r of [noteRow, noteRow + 1]) { summary.getRow(r).height = 26; summary.getCell(`A${r}`).font = { name: "Arial", size: 10, italic: true, color: { argb: muted } }; }
  summary.pageSetup.printArea = `A1:G${noteRow + 1}`;
  title(detail, "DANH SÁCH CÔNG VIỆC CHI TIẾT", "P");
  const headers = ["STT", "Tiêu đề công việc", "Nội dung", "Phòng ban", "Người phụ trách", "Người giao", "Ưu tiên", "Thời hạn", "Trạng thái", "Số lượng hoàn thành", "Ngày hoàn thành", "Trễ hạn (ngày)", "Công việc cấp trên", "Ghi chú", "Cập nhật lần cuối", "Mã công việc"];
  detail.columns = [7, 40, 56, 28, 28, 28, 16, 16, 22, 20, 20, 16, 40, 48, 23, 38].map(width => ({ width }));
  detail.getRow(6).values = headers; header(detail.getRow(6));
  tasks.forEach((task, i) => {
    const s = state(task);
    const row = detail.addRow([i + 1, task.title, task.content, departments[task.department] ?? "", person(task.assignee), person(task.creator), task.priority, excelDate(task.deadline), states[s], task.completed_quantity ?? null, s === 3 ? excelDate(task.completed_at) || "Chưa ghi nhận" : null, s === 2 ? Math.max(1, Math.ceil((now.getTime() - new Date(task.deadline).getTime()) / 86400000)) : 0, task.parent ? context.find(t => t.id === task.parent)?.title || task.parent : "", task.note || "", excelDate(task.updated), task.id]);
    row.height = Math.min(240, Math.max(48, ...[task.title, task.content, task.note || ""].map(text => (text.split("\n").reduce((n, line) => n + Math.max(1, Math.ceil(line.length / 45)), 0)) * 15 + 12)));
    row.eachCell({ includeEmpty: true }, cell => {
      cell.font = { name: "Arial", size: 10, color: { argb: navy } };
      cell.alignment = { vertical: "top", wrapText: true };
      if (i % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F3F7FC" } };
      cell.border = grid;
    });
    row.getCell(9).fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors[s] } };
    row.getCell(9).font = { name: "Arial", size: 10, bold: true, color: { argb: s === 2 ? "B42318" : navy } };
    for (const c of [8, 11]) row.getCell(c).numFmt = "dd/mm/yyyy";
    row.getCell(15).numFmt = "dd/mm/yyyy hh:mm";
    row.getCell(10).numFmt = "#,##0";
    for (const c of [1, 7, 8, 9, 10, 11, 12, 15]) row.getCell(c).alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    row.getCell(2).font = { name: "Arial", size: 10, bold: true, color: { argb: navy } };
    if (s === 3 && task.completed_at) {
      const vietnamDay = (value: string) => new Date(value).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
      const completedDay = vietnamDay(task.completed_at), deadlineDay = vietnamDay(task.deadline);
      if (completedDay > deadlineDay) {
        row.getCell(9).value = "Hoàn thành trễ hạn";
        row.getCell(9).fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors[2] } };
        row.getCell(9).font = { name: "Arial", size: 10, bold: true, color: { argb: "B42318" } };
        row.getCell(12).value = Math.round((Date.parse(completedDay) - Date.parse(deadlineDay)) / 86400000);
      }
    }
  });
  detail.autoFilter = { from: "A6", to: `P${Math.max(6, detail.rowCount)}` };
  detail.pageSetup.printTitlesRow = "1:6";
  summary.eachRow(row => row.eachCell(cell => { cell.font = { name: "Arial", size: 10, color: { argb: navy }, ...cell.font }; cell.alignment = { vertical: "middle", ...cell.alignment }; }));
  return book;
}

export async function downloadTaskWorkbook(tasks: Task[], people: Person[], departments: string[], scope: string, context: Task[]) {
  const now = new Date();
  const book = await buildTaskWorkbook(tasks, people, departments, scope, now, context);
  const buffer = await book.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer as ArrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `Bao-cao-cong-viec-${now.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" })}.xlsx`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
