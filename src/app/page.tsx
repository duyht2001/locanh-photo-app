"use client";

import React, { useState } from "react";
import { ArrowRight, Image as ImageIcon } from "lucide-react";
import { useRouter } from "next/navigation";

// Bộ sưu tập ảnh nổi bật từ Tô Studio (https://tostudio.vn/bo-suu-tap/)
const toStudioShowcase = [
  { url: "/showcase/photo-1.jpg", title: "A Private Escape", tag: "Nàng Thơ" },
  { url: "/showcase/photo-2.jpg", title: "Dawn Rouge", tag: "Nàng Thơ" },
  { url: "/showcase/photo-3.jpg", title: "Cherry Kiss", tag: "Ảnh Cá Nhân" },
  { url: "/showcase/photo-4.jpg", title: "Pink Dream", tag: "Ảnh Cá Nhân" },
  { url: "/showcase/photo-5.jpg", title: "Her Quiet Moment", tag: "Nàng Thơ" },
  { url: "/showcase/photo-6.jpg", title: "Mystic Garden", tag: "Concept" },
  { url: "/showcase/photo-7.jpg", title: "Our Little Escape", tag: "Nàng Thơ" },
  { url: "/showcase/photo-8.jpg", title: "Our Summer Story", tag: "Cặp Đôi" },
  { url: "/showcase/photo-9.jpg", title: "Love & Laugh", tag: "Cặp Đôi" },
  { url: "/showcase/photo-10.jpg", title: "Couple Moment", tag: "Cặp Đôi" },
  { url: "/showcase/photo-11.jpg", title: "Biến Hóa Nàng Thơ", tag: "Kỷ Yếu" },
  { url: "/showcase/photo-12.jpg", title: "Hongkong 90s", tag: "Chân Dung" },
  { url: "/showcase/photo-13.jpg", title: "Korean Wedding", tag: "Váy Cưới" },
  { url: "/showcase/photo-14.jpg", title: "Our View", tag: "Váy Cưới" },
  { url: "/showcase/photo-15.jpg", title: "Waves Of Love", tag: "Váy Cưới" },
  { url: "/showcase/photo-16.jpg", title: "Miss World VN", tag: "Sự Kiện" },
];

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
    <div className="relative flex min-h-screen flex-col bg-zinc-950 text-white justify-between overflow-hidden">
      {/* Global CSS Styles for Animations */}
      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          width: max-content;
          animation: marquee 35s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
        @keyframes float-blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(40px, -60px) scale(1.15); }
          66% { transform: translate(-30px, 30px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: float-blob 25s infinite ease-in-out;
        }
        .animation-delay-2000 {
          animation-delay: 3s;
        }
        .animation-delay-4000 {
          animation-delay: 6s;
        }
        .animate-slide-up {
          animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Decorative Blur Ambient Blobs */}
      <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none z-0 animate-blob" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-emerald-600/10 blur-[130px] pointer-events-none z-0 animate-blob animation-delay-2000" />
      <div className="absolute top-[30%] right-[20%] h-[400px] w-[400px] rounded-full bg-blue-600/5 blur-[120px] pointer-events-none z-0 animate-blob animation-delay-4000" />

      {/* Background grid overlay */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_80%,transparent_100%)] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 bg-zinc-950/40 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3 mx-auto sm:mx-0">
            <img
              src="/logo.jpg"
              alt="Tô Studio"
              className="h-10 w-10 rounded-full object-cover border border-white/20 shadow-md bg-white"
            />
            <div className="text-left">
              <span className="text-base font-bold tracking-wider text-white font-sans block">TÔ STUDIO</span>
              <span className="text-[10px] tracking-widest text-zinc-400 font-sans block uppercase">Hệ Thống Lọc Ảnh</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Content Section */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pt-16 pb-12 text-center max-w-4xl mx-auto">
        <div className="space-y-8 animate-slide-up">
          {/* Badge */}
          <div className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-300 shadow-inner backdrop-blur-lg">
            <ImageIcon className="h-3.5 w-3.5 text-zinc-400" />
            <span>Nền tảng chọn lọc ảnh online chuyên nghiệp</span>
          </div>

          {/* Heading */}
          <div className="space-y-4">
            <h1 className="text-4xl font-extrabold tracking-normal sm:text-6xl font-sans bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent leading-tight">
              Lựa chọn khoảnh khắc <br />
              đẹp nhất của bạn.
            </h1>
            <p className="mx-auto max-w-lg text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Nhập mã album độc quyền được gửi từ nhiếp ảnh gia của bạn để duyệt qua bộ sưu tập, thả tim và chọn những bức ảnh ưng ý nhất.
            </p>
          </div>

          {/* Client Album Code Entry Form */}
          <form onSubmit={handleEnterAlbum} className="mx-auto max-w-md space-y-4 w-full relative z-20">
            <div className="relative flex items-center group">
              <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-violet-600 to-emerald-600 opacity-30 blur transition duration-300 group-hover:opacity-50 group-focus-within:opacity-60" />
              <input
                type="text"
                placeholder="Nhập mã Album của bạn (Ví dụ: duy-trang)"
                value={albumCode}
                onChange={(e) => {
                  setAlbumCode(e.target.value);
                  setError(false);
                }}
                className={`relative w-full rounded-full border bg-zinc-900/80 px-6 py-4 pr-14 text-sm text-white placeholder-zinc-500 outline-none transition-all duration-300 ${
                  error
                    ? "border-red-500/80 focus:border-red-500"
                    : "border-white/10 focus:border-white/20 focus:bg-zinc-900"
                }`}
                autoFocus
              />
              <button
                type="submit"
                className="absolute right-2.5 rounded-full bg-white p-2.5 text-black hover:bg-zinc-200 transition-all cursor-pointer shadow-md transform hover:scale-105 active:scale-95"
                title="Vào Album"
              >
                <ArrowRight className="h-4 w-4 stroke-[3]" />
              </button>
            </div>
            {error && (
              <p className="text-left pl-6 text-xs font-semibold text-red-500 animate-pulse">
                Mã album không hợp lệ. Vui lòng thử lại.
              </p>
            )}
          </form>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500" /> Không cần tài khoản
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Bảo mật an toàn
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Lưu trữ đám mây
            </span>
          </div>
        </div>
      </main>

      {/* Infinite Photo Marquee (Tô Studio Collection Showcase) */}
      <div className="relative w-full overflow-hidden py-8 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent z-10 border-t border-white/5">
        <div className="mx-auto max-w-7xl px-6 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-bold tracking-widest text-zinc-400 uppercase">
              Bộ Sưu Tập Nổi Bật - Tô Studio
            </span>
          </div>
          <a
            href="https://tostudio.vn/bo-suu-tap/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-zinc-400 hover:text-white transition-colors tracking-wider uppercase font-medium flex items-center gap-1"
          >
            <span>Xem thêm tại tostudio.vn</span>
            <ArrowRight className="h-3 w-3" />
          </a>
        </div>

        <div className="relative w-full overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-24 sm:w-36 bg-gradient-to-r from-zinc-950 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-24 sm:w-36 bg-gradient-to-l from-zinc-950 to-transparent z-10 pointer-events-none" />

          <div className="animate-marquee">
            {/* First loop of photos */}
            {toStudioShowcase.map((item, i) => (
              <div
                key={`p1-${i}`}
                className="relative w-44 sm:w-60 aspect-[3/4] mx-2.5 rounded-2xl overflow-hidden border border-white/10 shadow-2xl transform hover:scale-[1.03] transition-all duration-300 bg-zinc-900 group shrink-0"
              >
                <img
                  src={item.url}
                  alt={item.title}
                  loading="lazy"
                  className="h-full w-full object-cover grayscale-[15%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />
                <div className="absolute bottom-3 left-3 right-3 text-left">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md text-white border border-white/20 mb-1">
                    {item.tag}
                  </span>
                  <p className="text-xs font-bold text-white truncate drop-shadow-sm">{item.title}</p>
                </div>
              </div>
            ))}
            {/* Second loop of photos to make infinite scroll perfectly seamless */}
            {toStudioShowcase.map((item, i) => (
              <div
                key={`p2-${i}`}
                className="relative w-44 sm:w-60 aspect-[3/4] mx-2.5 rounded-2xl overflow-hidden border border-white/10 shadow-2xl transform hover:scale-[1.03] transition-all duration-300 bg-zinc-900 group shrink-0"
              >
                <img
                  src={item.url}
                  alt={item.title}
                  loading="lazy"
                  className="h-full w-full object-cover grayscale-[15%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />
                <div className="absolute bottom-3 left-3 right-3 text-left">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md text-white border border-white/20 mb-1">
                    {item.tag}
                  </span>
                  <p className="text-xs font-bold text-white truncate drop-shadow-sm">{item.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 bg-zinc-950 px-6 py-6 text-center text-[9px] tracking-widest text-zinc-500 uppercase">
        <p>© {new Date().getFullYear()} Tô Studio - Lọc Ảnh. Thiết kế cao cấp dành cho Studio & Khách hàng.</p>
      </footer>
    </div>
  );
}
