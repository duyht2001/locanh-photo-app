"use client";

import React, { use, useEffect, useState } from "react";
import { Lock, AlertCircle, ArrowLeft, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { useSessionId } from "@/hooks/useSessionId";
import Gallery from "@/components/Gallery";
import { SkeletonCard } from "@/components/Skeleton";
import { Photo, Album } from "@/types";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function AlbumGuestPage({ params }: PageProps) {
  const { slug } = use(params);
  const sessionId = useSessionId();

  // State variables
  const [album, setAlbum] = useState<any>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Password protection state
  const [password, setPassword] = useState("");
  const [isPasswordRequired, setIsPasswordRequired] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  // Fetch album details and photos
  const fetchAlbumData = async (enteredPassword = "") => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    setPasswordError(false);

    try {
      const p = enteredPassword || password;
      const res = await fetch(
        `/api/albums/${slug}/photos?sessionId=${sessionId}&password=${encodeURIComponent(p)}`
      );

      if (res.status === 401) {
        setIsPasswordRequired(true);
        if (enteredPassword) {
          setPasswordError(true);
        }
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to load album");
      }

      const data = await res.json();
      setAlbum(data.album);
      setPhotos(data.photos);
      setIsPasswordRequired(false);
      
      // Save password if correct
      if (enteredPassword) {
        setPassword(enteredPassword);
        sessionStorage.setItem(`album_pwd_${slug}`, enteredPassword);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi không xác định.");
    } finally {
      setLoading(false);
    }
  };

  // Load password from sessionStorage if available
  useEffect(() => {
    const savedPassword = sessionStorage.getItem(`album_pwd_${slug}`);
    if (savedPassword) {
      setPassword(savedPassword);
    }
  }, [slug]);

  // Refetch when sessionId or password state changes
  useEffect(() => {
    if (sessionId) {
      const savedPassword = sessionStorage.getItem(`album_pwd_${slug}`) || "";
      fetchAlbumData(savedPassword);
    }
  }, [slug, sessionId]);

  // Handle image interaction (Heart / Check / Flag)
  const handlePhotoSelect = async (
    photoId: string,
    photoName: string,
    action: "favorite" | "tick" | "flag",
    value: any
  ) => {
    if (!sessionId) return;

    try {
      const res = await fetch(`/api/albums/${slug}/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          photoId,
          photoName,
          action,
          value,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Ghi nhận lựa chọn thất bại.");
      }
    } catch (err: any) {
      console.error("Selection sync error:", err);
      // Soft fail: alert user that sync failed, but keep state for now
      alert("Đồng bộ lựa chọn lên server thất bại. Vui lòng kiểm tra lại kết nối mạng!");
    }
  };

  // Handle password submit
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;
    fetchAlbumData(passwordInput);
  };

  // Render password protection screen
  if (isPasswordRequired) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-50 border border-zinc-100">
            <Lock className="h-6 w-6 text-zinc-900" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900">Album bảo mật</h2>
          <p className="mt-2 text-xs text-zinc-500">
            Vui lòng nhập mật khẩu được cung cấp bởi nhiếp ảnh gia để xem album này.
          </p>
          <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4">
            <input
              type="password"
              placeholder="Mật khẩu album"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className={`w-full rounded-lg border px-4 py-2.5 text-sm text-zinc-800 placeholder-zinc-400 outline-none transition-all ${
                passwordError
                  ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  : "border-zinc-200 focus:border-black focus:ring-1 focus:ring-black"
              }`}
              autoFocus
            />
            {passwordError && (
              <p className="text-[11px] font-medium text-red-500">Mật khẩu không chính xác. Thử lại.</p>
            )}
            <button
              type="submit"
              className="w-full rounded-lg bg-black py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Vào Album
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Render error screen
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
        <div className="w-full max-w-md text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-zinc-400 stroke-[1.5]" />
          <h2 className="mt-4 text-lg font-bold text-zinc-950">Không thể truy cập album</h2>
          <p className="mt-2 text-sm text-zinc-500">{error}</p>
          <div className="mt-6 flex justify-center gap-4">
            <button
              onClick={() => fetchAlbumData()}
              className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Thử lại
            </button>
            <Link
              href="/"
              className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              Quay lại Trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Render loading state
  if (loading || !album) {
    return (
      <div className="min-h-screen bg-white">
        {/* Banner skeleton */}
        <div className="h-64 sm:h-96 w-full animate-shimmer bg-zinc-100" />
        
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center space-y-4 mb-10">
            {/* Logo skeleton */}
            <div className="h-16 w-16 rounded-full animate-shimmer bg-zinc-200" />
            {/* Title skeleton */}
            <div className="h-8 w-64 animate-shimmer bg-zinc-200 rounded" />
          </div>

          {/* Gallery skeletons */}
          <div className="columns-1 gap-5 sm:columns-2 md:columns-3 lg:columns-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} index={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Render main album UI
  return (
    <div className="min-h-screen bg-white pb-16">
      
      {/* Hero Banner Section */}
      <div className="relative h-64 sm:h-[420px] w-full overflow-hidden bg-zinc-900">
        {album.bannerUrl ? (
          <img
            src={album.bannerUrl}
            alt={album.title}
            className="h-full w-full object-cover opacity-85"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-50 border-b border-zinc-100">
            <ImageIcon className="h-10 w-10 text-zinc-300 stroke-[1.2]" />
            <span className="mt-2 text-xs font-medium text-zinc-400">Không có banner</span>
          </div>
        )}
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

        {/* Back navigation in overlay */}
        <div className="absolute top-6 left-6 z-10">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-zinc-900 shadow-md backdrop-blur-sm transition-transform hover:scale-105"
          >
            <ArrowLeft className="h-3 w-3 stroke-[2.5]" />
            <span>Trang chủ</span>
          </Link>
        </div>
      </div>

      {/* Album Title and Studio branding */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-12 relative z-10 mb-10">
        <div className="flex flex-col items-center text-center">
          
          {/* Logo container */}
          <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-zinc-50 shadow-md flex items-center justify-center">
            {album.logoUrl ? (
              <img src={album.logoUrl} alt="Studio Logo" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xl font-bold tracking-wider text-zinc-400">STUDIO</span>
            )}
          </div>

          {/* Title */}
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl font-serif">
            {album.title}
          </h1>

          {/* Status details */}
          <div className="mt-2 flex items-center gap-3 text-xs text-zinc-400">
            <span>Album ảnh trực tuyến</span>
            {album.expiresAt && (
              <>
                <span className="h-1 w-1 rounded-full bg-zinc-300" />
                <span className="text-amber-600 font-medium">Hạn dùng: {new Date(album.expiresAt).toLocaleDateString("vi-VN")}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Photo Gallery component */}
      <Gallery
        initialPhotos={photos}
        onSelect={handlePhotoSelect}
        albumTitle={album.title}
      />
    </div>
  );
}
