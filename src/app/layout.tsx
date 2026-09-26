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
  title: "Tô Studio - Lọc Ảnh",
  description:
    "Tô Studio - Hệ thống chọn lọc ảnh online chuyên nghiệp. Chọn lọc ảnh trực tiếp từ Google Drive một cách nhanh chóng, bảo mật và tiện lợi.",
  keywords: ["Tô Studio", "Tô Studio lọc ảnh", "chọn lọc ảnh", "chọn ảnh online", "lọc ảnh google drive", "nhiếp ảnh"],
  icons: {
    icon: "/logo.jpg",
    shortcut: "/logo.jpg",
    apple: "/logo.jpg",
  },
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
