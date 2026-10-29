import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Bảo Việt Nhân thọ · Điều hành công việc",
  description: "Không gian điều hành và phối hợp công việc dành cho đội ngũ.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
