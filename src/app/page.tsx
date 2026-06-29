"use client";

import React, { useState } from "react";
import { Camera, ArrowRight, Settings, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [albumCode, setAlbumCode] = useState("");
  const [error, setError] = useState(false);

  const handleEnterAlbum = (e: React.FormEvent) => {
    e.preventDefault();
    if (!albumCode.trim()) return;

    // Convert to lowercase and trim spaces to guess matching slug
    const cleanSlug = albumCode
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "");

    if (cleanSlug) {
      router.push(`/album/${cleanSlug}`);
    } else {
      setError(true);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-white text-zinc-900 justify-between">
      
      {/* Background decoration grid */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#f4f4f5_1px,transparent_1px),linear-gradient(to_bottom,#f4f4f5_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60" />

      {/* Header */}
      <header className="relative z-10 border-b border-zinc-100 bg-white/80 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-black stroke-[2]" />
            <span className="text-sm font-bold tracking-widest text-zinc-950 font-serif">LOCANH</span>
          </div>
          <Link
            href="/admin"
            className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white hover:border-black px-4 py-2 text-xs font-semibold text-zinc-700 hover:text-black transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Nhiếp ảnh gia</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <div className="max-w-2xl space-y-6">
          <div className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            <ImageIcon className="h-3 w-3" />
            <span>Nền tảng chọn lọc ảnh online chuyên nghiệp</span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl font-serif">
            Lựa chọn khoảnh khắc <br />
            đẹp nhất của bạn.
          </h1>

          <p className="mx-auto max-w-md text-sm text-zinc-500 leading-relaxed">
            Nhập mã album được gửi từ studio của bạn để xem bộ sưu tập, thả tim và chọn những bức ảnh ưng ý nhất để in ấn hoặc chỉnh sửa.
          </p>

          {/* Client Album Code Entry Form */}
          <form onSubmit={handleEnterAlbum} className="mx-auto max-w-md mt-10 space-y-4">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Nhập mã Album của bạn (Ví dụ: duy-trang)"
                value={albumCode}
                onChange={(e) => {
                  setAlbumCode(e.target.value);
                  setError(false);
                }}
                className={`w-full rounded-full border bg-zinc-50/50 px-6 py-3.5 pr-14 text-sm text-zinc-800 placeholder-zinc-400 outline-none transition-smooth focus:bg-white focus:ring-1 ${
                  error
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-zinc-200 focus:border-black focus:ring-black"
                }`}
                autoFocus
              />
              <button
                type="submit"
                className="absolute right-2.5 rounded-full bg-black p-2 text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Vào Album"
              >
                <ArrowRight className="h-4.5 w-4.5" />
              </button>
            </div>
            {error && (
              <p className="text-left pl-4 text-xs font-semibold text-red-500">
                Mã album không hợp lệ. Vui lòng thử lại.
              </p>
            )}
          </form>

          {/* Prompt options */}
          <div className="flex items-center justify-center gap-6 pt-6 text-[11px] font-semibold text-zinc-400">
            <span className="flex items-center gap-1.5">
              ✓ Không cần tài khoản
            </span>
            <span className="flex items-center gap-1.5">
              ✓ Bảo mật an toàn
            </span>
            <span className="flex items-center gap-1.5">
              ✓ Lưu trữ đám mây
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-100 bg-white px-6 py-6 text-center text-[10px] tracking-wider text-zinc-400 uppercase">
        <p>© {new Date().getFullYear()} Locanh. Thiết kế dành cho các Studio ảnh chuyên nghiệp.</p>
      </footer>
    </div>
  );
}
