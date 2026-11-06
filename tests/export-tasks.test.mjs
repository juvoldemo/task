import test from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { buildTaskWorkbook } from "../lib/export-tasks.ts";

test("Excel export preserves details, statuses, dates and report controls", async () => {
  const now = new Date("2026-11-06T03:00:00Z");
  const base = { content: "Nội dung đầy đủ", department: 0, assignee: "a", creator: "b", deadline: "2026-11-30T17:00:00Z", priority: "Cao", updated: now.toISOString(), note: "Ghi chú" };
  const tasks = [
    { ...base, id: "1", title: "Chưa bắt đầu", progress: 0 },
    { ...base, id: "2", title: "=HYPERLINK(\"test\")", progress: 1, parent: "1", completed_quantity: 200 },
    { ...base, id: "3", title: "Quá hạn", progress: 0, deadline: "2026-11-01T17:00:00Z" },
    { ...base, id: "4", title: "Hoàn thành", progress: 100, completed_at: "2026-11-05T18:00:00Z" },
    { ...base, id: "5", title: "Hoàn thành cũ", progress: 100 },
  ];
  const book = await buildTaskWorkbook(tasks, [{ id: "a", name: "Người nhận" }, { id: "b", name: "Người giao" }], ["Phòng ban"], "Tất cả trạng thái", now);
  const loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(await book.xlsx.writeBuffer());
  const summary = loaded.getWorksheet("Tổng quan");
  const detail = loaded.getWorksheet("Chi tiết công việc");
  assert.equal(summary.getCell("C6").value, 5);
  assert.deepEqual([9, 10, 11, 12].map(r => summary.getCell(`C${r}`).value), [1, 1, 1, 2]);
  assert.equal(detail.getCell("B8").value, tasks[1].title);
  assert.equal(detail.getCell("J8").value, 200);
  assert.equal(detail.getCell("E7").value, "Người nhận");
  assert.equal(detail.getCell("M8").value, "Chưa bắt đầu");
  assert.equal(detail.getCell("K10").value.toISOString(), "2026-11-06T01:00:00.000Z");
  assert.equal(detail.getCell("K11").value, "Chưa ghi nhận");
  assert.equal(detail.getCell("I9").value, "Quá hạn");
  assert.equal(detail.views[0].ySplit, 6);
  assert.ok(detail.autoFilter);
  assert.equal(detail.getCell("K10").numFmt, "dd/mm/yyyy");
  for (const cell of [summary.getCell("B9"), summary.getCell("D12"), summary.getCell("C16"), detail.getCell("C7"), detail.getCell("P7")]) {
    for (const side of ["top", "left", "bottom", "right"]) assert.equal(cell.border[side].style, "thin");
  }
  assert.equal(summary.getCell("C17").value, 5);
  assert.equal(summary.getCell("G17").value, 2);
  const empty = await buildTaskWorkbook([], [], [], "Không có công việc", now);
  assert.equal(empty.getWorksheet("Tổng quan").getCell("F6").value, 0);
});
