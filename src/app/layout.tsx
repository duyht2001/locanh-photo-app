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
  title: "To Studio - Lọc Ảnh",
  description:
    "To Studio - Hệ thống chọn lọc ảnh online chuyên nghiệp. Chọn lọc ảnh trực tiếp từ Google Drive một cách nhanh chóng, bảo mật và tiện lợi.",
  keywords: ["To Studio", "To Studio lọc ảnh", "chọn lọc ảnh", "chọn ảnh online", "lọc ảnh google drive", "nhiếp ảnh"],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon.png", sizes: "48x48", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
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
