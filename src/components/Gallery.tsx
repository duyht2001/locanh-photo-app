import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, Download, Heart, Check, Grid, FileText, ChevronDown, AlertCircle } from "lucide-react";
import { Photo } from "@/types";
import PhotoCard from "./PhotoCard";
import Lightbox from "./Lightbox";
import { generateCSV, generateTXT, downloadFile, SelectionExportItem } from "@/lib/utils";

interface GalleryProps {
  initialPhotos: Photo[];
  onSelect: (photoId: string, photoName: string, action: "favorite" | "tick" | "flag", value: any) => void;
  albumTitle: string;
  allowDownloads?: boolean;
  maxSelections?: number | null;
}

type FilterType = "all" | "selected" | "unselected" | "favorite" | "ticked" | "flag-red" | "flag-yellow" | "flag-green" | "flag-blue";

export default function Gallery({
  initialPhotos,
  onSelect,
  albumTitle,
  allowDownloads = true,
  maxSelections,
}: GalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const [limitWarning, setLimitWarning] = useState<string | null>(null);

  // Pagination / Infinite scroll state
  const [visibleCount, setVisibleCount] = useState(24);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Sync state when initialPhotos change
  useEffect(() => {
    setPhotos(initialPhotos);
  }, [initialPhotos]);

  // Handle local UI selection update with limit protection
  const handleSelect = (photoId: string, photoName: string, action: "favorite" | "tick" | "flag", value: any) => {
    const targetPhoto = photos.find((p) => p.id === photoId);
    const wasSelected = !!(
      targetPhoto &&
      (targetPhoto.isFavorite || targetPhoto.isTicked || targetPhoto.colorFlag)
    );

    // Determine if this action intends to select/activate the photo
    const willBeSelected = action === "flag" ? !!value : !!value;

    if (!wasSelected && willBeSelected && maxSelections && maxSelections > 0 && stats.selected >= maxSelections) {
      setLimitWarning(
        `Bạn đã chọn đủ số lượng tối đa (${maxSelections} ảnh) theo quy định của album! Vui lòng bỏ chọn bớt ảnh khác nếu muốn chọn thêm ảnh này.`
      );
      return;
    }

    // 1. Instantly update local state for snappy UI
    setPhotos((prev) =>
      prev.map((photo) => {
        if (photo.id === photoId) {
          const updated = { ...photo };
          if (action === "favorite") updated.isFavorite = !!value;
          if (action === "tick") updated.isTicked = !!value;
          if (action === "flag") updated.colorFlag = value;
          return updated;
        }
        return photo;
      })
    );

    // 2. Call parent to trigger API call in background
    onSelect(photoId, photoName, action, value);
  };

  // Helper to remove Vietnamese tones for better search matching
  const removeAccents = (str: string) => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  };

  // Filtered and Searched photos computation
  const filteredPhotos = useMemo(() => {
    return photos.filter((photo) => {
      // 1. Search term match
      const nameMatch = removeAccents(photo.name).includes(removeAccents(searchTerm));

      // 2. Filter criteria match
      let filterMatch = true;
      if (activeFilter === "selected") {
        filterMatch = !!(photo.isFavorite || photo.isTicked || photo.colorFlag);
      } else if (activeFilter === "unselected") {
        filterMatch = !(photo.isFavorite || photo.isTicked || photo.colorFlag);
      } else if (activeFilter === "favorite") {
        filterMatch = !!photo.isFavorite;
      } else if (activeFilter === "ticked") {
        filterMatch = !!photo.isTicked;
      } else if (activeFilter.startsWith("flag-")) {
        const targetColor = activeFilter.split("-")[1];
        filterMatch = photo.colorFlag === targetColor;
      }

      return nameMatch && filterMatch;
    });
  }, [photos, searchTerm, activeFilter]);

  // Reset page size when filters or search change
  useEffect(() => {
    setVisibleCount(24);
  }, [searchTerm, activeFilter]);

  // Infinite scroll logic using Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filteredPhotos.length) {
          setVisibleCount((prev) => prev + 24);
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [visibleCount, filteredPhotos.length]);

  // Statistics
  const stats = useMemo(() => {
    const total = photos.length;
    const favorite = photos.filter((p) => p.isFavorite).length;
    const ticked = photos.filter((p) => p.isTicked).length;
    const flagged = photos.filter((p) => p.colorFlag).length;
    const selected = photos.filter((p) => p.isFavorite || p.isTicked || p.colorFlag).length;

    return { total, favorite, ticked, flagged, selected };
  }, [photos]);

  // Export handlers
  const getExportItems = (): SelectionExportItem[] => {
    return photos
      .filter((photo) => photo.isFavorite || photo.isTicked || photo.colorFlag)
      .map((photo) => {
        const statuses = [];
        if (photo.isFavorite) statuses.push("Heart");
        if (photo.isTicked) statuses.push("Tick");
        if (photo.colorFlag) statuses.push(`Flag:${photo.colorFlag}`);
        
        let status: SelectionExportItem["status"] = "Unselected";
        if (photo.isFavorite) status = "Favorite";
        else if (photo.isTicked) status = "Ticked";
        else if (photo.colorFlag) status = "Flagged";

        return {
          fileName: photo.name,
          fileId: photo.id,
          status,
          details: statuses.join("+"),
        };
      });
  };

  const handleExport = (type: "csv" | "txt" | "json") => {
    const items = getExportItems();
    if (items.length === 0) {
      alert("Bạn chưa chọn ảnh nào để xuất kết quả.");
      return;
    }

    const safeTitle = albumTitle.replace(/\s+/g, "_").toLowerCase();
    
    if (type === "csv") {
      const csv = generateCSV(items);
      downloadFile(csv, `chon_anh_${safeTitle}.csv`, "text/csv;charset=utf-8;");
    } else if (type === "txt") {
      const txt = generateTXT(items);
      downloadFile(txt, `chon_anh_${safeTitle}.txt`, "text/plain;charset=utf-8;");
    } else if (type === "json") {
      const json = JSON.stringify({ albumTitle, exportTime: new Date().toISOString(), selections: items }, null, 2);
      downloadFile(json, `chon_anh_${safeTitle}.json`, "application/json;charset=utf-8;");
    }
    setShowExportMenu(false);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* Sticky Header with Search, Filter & Exports */}
      <div className="sticky top-0 z-40 -mx-4 bg-white/80 px-4 py-4 backdrop-blur-md border-b border-zinc-100 sm:mx-0 sm:px-0">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute top-3 left-3 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên file..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-full border border-zinc-200 bg-zinc-50/50 py-2.5 pr-4 pl-10 text-xs text-zinc-800 placeholder-zinc-400 outline-none transition-smooth focus:border-black focus:bg-white focus:ring-1 focus:ring-black"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute top-2.5 right-3.5 text-zinc-400 hover:text-zinc-600 text-sm cursor-pointer"
              >
                ×
              </button>
            )}
          </div>

          {/* Statistics and Export Buttons */}
          <div className="flex items-center justify-between gap-3 md:justify-end">
            {maxSelections && maxSelections > 0 ? (
              <div className="flex flex-col items-end gap-1.5">
                <div
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 shadow-xs ${
                    stats.selected >= maxSelections
                      ? "bg-amber-50 border-amber-300 text-amber-900"
                      : "bg-zinc-100 border-zinc-200 text-zinc-800"
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Đã chọn:</span>
                  <span className="font-extrabold text-sm text-zinc-950">{stats.selected}</span>
                  <span className="text-zinc-400 font-normal">/</span>
                  <span className="font-extrabold text-sm text-zinc-950">{maxSelections}</span>
                  <span className="text-zinc-500 text-[11px]">ảnh</span>
                  {stats.selected >= maxSelections && (
                    <span className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ml-0.5">
                      Đạt tối đa
                    </span>
                  )}
                </div>
                {/* Visual Progress bar */}
                <div className="w-28 sm:w-36 h-1.5 bg-zinc-200/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      stats.selected >= maxSelections ? "bg-amber-500" : "bg-zinc-900"
                    }`}
                    style={{
                      width: `${Math.min(100, (stats.selected / maxSelections) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Đã chọn: <span className="font-bold text-zinc-900">{stats.selected}</span> / {stats.total} ảnh
              </div>
            )}

            {/* Export Menu Button */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-1.5 rounded-full bg-black px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Xuất kết quả</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>

              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute right-0 mt-2 z-20 w-44 origin-top-right rounded-xl border border-zinc-100 bg-white p-1.5 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                    <button
                      onClick={() => handleExport("csv")}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                    >
                      <FileText className="h-3.5 w-3.5 text-blue-500" />
                      Tải file CSV
                    </button>
                    <button
                      onClick={() => handleExport("txt")}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                    >
                      <FileText className="h-3.5 w-3.5 text-zinc-600" />
                      Tải file TXT
                    </button>
                    <button
                      onClick={() => handleExport("json")}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                    >
                      <FileText className="h-3.5 w-3.5 text-amber-500" />
                      Tải file JSON
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Filter Badges Carousel / Row */}
        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            onClick={() => setActiveFilter("all")}
            className={`rounded-full px-4 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
              activeFilter === "all" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            Tất cả ({photos.length})
          </button>
          <button
            onClick={() => setActiveFilter("selected")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
              activeFilter === "selected" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            Đã lựa chọn ({stats.selected})
          </button>
          <button
            onClick={() => setActiveFilter("favorite")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
              activeFilter === "favorite" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            <Heart className="h-3 w-3 fill-current" />
            Yêu thích ({stats.favorite})
          </button>
          <button
            onClick={() => setActiveFilter("ticked")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
              activeFilter === "ticked" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            <Check className="h-3.5 w-3.5 stroke-[2.5]" />
            Đồng ý ({stats.ticked})
          </button>

          {/* Color Flag Filter Drops */}
          {["red", "yellow", "green", "blue"].map((color) => {
            const flagKey = `flag-${color}` as FilterType;
            const bgClass =
              color === "red"
                ? "bg-red-500"
                : color === "yellow"
                ? "bg-yellow-400"
                : color === "green"
                ? "bg-emerald-500"
                : "bg-blue-500";
            const flagCount = photos.filter((p) => p.colorFlag === color).length;

            return (
              <button
                key={color}
                onClick={() => setActiveFilter(flagKey)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                  activeFilter === flagKey
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                <div className={`h-2.5 w-2.5 rounded-full ${bgClass}`} />
                <span className="capitalize">{color === "green" ? "lục" : color === "yellow" ? "vàng" : color === "red" ? "đỏ" : "lam"} ({flagCount})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Masonry Grid Layout */}
      {filteredPhotos.length > 0 ? (
        <div className="mt-8 columns-1 gap-5 sm:columns-2 md:columns-3 lg:columns-4 break-inside-avoid">
          {filteredPhotos.slice(0, visibleCount).map((photo, index) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              onSelect={handleSelect}
              allowDownloads={allowDownloads}
              onImageClick={() => {
                // Determine absolute index of this image in the filtered list
                setActivePhotoIndex(index);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="mt-20 flex flex-col items-center justify-center text-center">
          <Grid className="h-10 w-10 text-zinc-300 stroke-[1.5] mb-3" />
          <p className="text-sm font-medium text-zinc-500">Không tìm thấy bức ảnh nào khớp bộ lọc.</p>
          <button
            onClick={() => {
              setSearchTerm("");
              setActiveFilter("all");
            }}
            className="mt-3 text-xs font-bold text-zinc-800 hover:underline cursor-pointer"
          >
            Reset bộ lọc
          </button>
        </div>
      )}

      {/* Infinite Scroll trigger node */}
      {visibleCount < filteredPhotos.length && (
        <div ref={loadMoreRef} className="my-10 flex justify-center py-5">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-800" />
        </div>
      )}

      {/* Lightbox Modal */}
      {activePhotoIndex !== null && filteredPhotos[activePhotoIndex] && (
        <Lightbox
          photo={filteredPhotos[activePhotoIndex]}
          photos={filteredPhotos}
          onClose={() => setActivePhotoIndex(null)}
          onSelect={handleSelect}
          allowDownloads={allowDownloads}
          onNavigate={(index) => setActivePhotoIndex(index)}
        />
      )}

      {/* Selection Limit Alert Modal */}
      {limitWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 border border-amber-200 text-amber-600">
              <AlertCircle className="h-7 w-7 stroke-[2.2]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-zinc-900">Đã đạt giới hạn chọn ảnh</h3>
              <p className="text-xs text-zinc-600 leading-relaxed pt-1">{limitWarning}</p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => setLimitWarning(null)}
                className="w-full rounded-xl bg-zinc-900 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800 transition-colors cursor-pointer shadow-sm"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
