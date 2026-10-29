export const departments = [
  "Dịch vụ khách hàng",
  "Hỗ trợ kinh doanh",
  "Phát triển kinh doanh 1",
  "Phát triển kinh doanh 2",
];
const groups = [
  [
    "Trương Thị Minh Khánh",
    "Phạm Hồng Thắng",
    "Lê Thị Hòa",
    "Trần Huy Mạnh",
    "Hoàng Thị Minh Yến",
    "Phạm Thị Thanh Nga",
  ],
  [
    "Phan Hữu Tuân",
    "Trần Trịnh Thị Trinh",
    "Nguyễn Hoàng Vũ",
    "Đỗ Thị Khánh Ngọc",
    "Nguyễn Hùng Phương",
    "Võ Đức Hải",
  ],
  ["Nguyễn Thị Mai Trang", "Nguyễn Thị Trầm", "Đinh Quốc Tiến"],
  ["Nguyễn Thóc", "Nguyễn Thành Nhân", "Trần Xuân Thu"],
];
export const username = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/\s/g, "")
    .toLowerCase();
export const users = [
  {
    id: "phamthithanh",
    name: "Phạm Thị Thành",
    department: -1,
    role: "director",
    position: "Giám đốc",
  },
  ...groups.flatMap((g, d) =>
    g.map((name, i) => ({
      id: username(name),
      name,
      department: d,
      role: i === 0 ? "manager" : "member",
      position:
        i === 0
          ? "Trưởng phòng"
          : d === 0 && i === 1
            ? "Phó phòng"
            : d === 1 && i === 1
              ? "Kế toán quản trị"
              : "Chuyên viên",
    })),
  ),
];
