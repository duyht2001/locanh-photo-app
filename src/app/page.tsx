"use client";

import React, { useState } from "react";
import { Camera, ArrowRight, Image as ImageIcon } from "lucide-react";
import { useRouter } from "next/navigation";

// Pre-curated high-quality romantic/wedding portfolio images for the infinite marquee
const portfolioPhotos = [
  "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1519225495810-7512c696505a?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1520854221256-174b1ec353f3?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80",
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
      <header className="relative z-10 border-b border-white/5 bg-zinc-950/40 px-6 py-5 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2.5 mx-auto sm:mx-0">
            <div className="rounded-lg bg-white p-1.5 text-black shadow-sm">
              <Camera className="h-4 w-4 stroke-[2.5]" />
            </div>
            <span className="text-sm font-bold tracking-widest text-white font-serif">LOCANH</span>
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
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl font-serif bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent leading-none">
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

      {/* Infinite Photo Marquee (Shotpik style portfolio slider) */}
      <div className="relative w-full overflow-hidden py-6 bg-gradient-to-t from-zinc-950/80 to-transparent z-10 border-t border-white/5 pointer-events-none">
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-zinc-950 to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-zinc-950 to-transparent z-10 pointer-events-none" />

        <div className="animate-marquee pointer-events-auto">
          {/* First loop of photos */}
          {portfolioPhotos.map((url, i) => (
            <div key={`p1-${i}`} className="w-40 sm:w-52 aspect-[3/4] mx-2 rounded-xl overflow-hidden border border-white/10 shadow-lg transform hover:scale-[1.03] transition-transform duration-300 cursor-pointer bg-zinc-900 group">
              <img src={url} alt="" className="h-full w-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-300" />
            </div>
          ))}
          {/* Second loop of photos to make infinite scroll smooth */}
          {portfolioPhotos.map((url, i) => (
            <div key={`p2-${i}`} className="w-40 sm:w-52 aspect-[3/4] mx-2 rounded-xl overflow-hidden border border-white/10 shadow-lg transform hover:scale-[1.03] transition-transform duration-300 cursor-pointer bg-zinc-900 group">
              <img src={url} alt="" className="h-full w-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-300" />
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 bg-zinc-950 px-6 py-6 text-center text-[9px] tracking-widest text-zinc-500 uppercase">
        <p>© {new Date().getFullYear()} Locanh. Thiết kế cao cấp dành cho các Studio ảnh chuyên nghiệp.</p>
      </footer>
    </div>
  );
}
