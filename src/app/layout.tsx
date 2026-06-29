import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Locanh - Hệ thống chọn lọc ảnh online chuyên nghiệp",
  description:
    "Chọn lọc ảnh trực tiếp từ Google Drive của bạn một cách nhanh chóng, bảo mật, tối giản và đẹp mắt. Giải pháp tối ưu cho các Studio ảnh cưới, kỷ yếu và nhiếp ảnh gia.",
  keywords: ["chọn lọc ảnh", "chọn ảnh online", "pixieset vietnam", "shoptik", "lọc ảnh google drive", "nhiếp ảnh"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
