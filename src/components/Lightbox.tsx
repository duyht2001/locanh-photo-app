import React, { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Heart, Check, Flag, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Photo } from "@/types";

interface LightboxProps {
  photo: Photo;
  photos: Photo[];
  onClose: () => void;
  onSelect: (photoId: string, photoName: string, action: "favorite" | "tick" | "flag", value: any) => void;
  onNavigate: (index: number) => void;
}

export default function Lightbox({ photo, photos, onClose, onSelect, onNavigate }: LightboxProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showFlagMenu, setShowFlagMenu] = useState(false);
  const currentIndex = photos.findIndex((p) => p.id === photo.id);

  // Navigate handlers
  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
    } else {
      // Wrap around to end
      onNavigate(photos.length - 1);
    }
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex < photos.length - 1) {
      onNavigate(currentIndex + 1);
    } else {
      // Wrap around to start
      onNavigate(0);
    }
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    // Prevent scrolling behind the lightbox
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [currentIndex, onClose, photos]);

  const flagColors = [
    { name: "red", class: "bg-red-500 hover:bg-red-600" },
    { name: "yellow", class: "bg-yellow-400 hover:bg-yellow-500" },
    { name: "green", class: "bg-emerald-500 hover:bg-emerald-600" },
    { name: "blue", class: "bg-blue-500 hover:bg-blue-600" },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex flex-col justify-between bg-black/95 text-white animate-in fade-in duration-300">
        
        {/* Top Control Bar */}
        <div className="flex items-center justify-between p-4 z-10 bg-gradient-to-b from-black/60 to-transparent">
          {/* Index indicator */}
          <div className="text-sm font-medium tracking-wide text-zinc-300">
            {currentIndex + 1} / {photos.length}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            
            {/* Flag Menu */}
            <div className="relative">
              <button
                onClick={() => setShowFlagMenu(!showFlagMenu)}
                className={`rounded-full p-2 hover:bg-white/10 transition-colors ${
                  photo.colorFlag ? "text-white" : "text-zinc-400 hover:text-white"
                }`}
                title="Gắn cờ"
              >
                <Flag className="h-5 w-5 fill-current" style={{ fill: photo.colorFlag ? "currentColor" : "none" }} />
              </button>

              {showFlagMenu && (
                <div className="absolute top-11 right-0 flex gap-1.5 rounded-full border border-white/10 bg-zinc-900 p-1.5 shadow-xl">
                  {flagColors.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => {
                        onSelect(photo.id, photo.name, "flag", color.name);
                        setShowFlagMenu(false);
                      }}
                      className={`h-5 w-5 rounded-full cursor-pointer transition-transform hover:scale-110 ${color.class}`}
                    />
                  ))}
                  {photo.colorFlag && (
                    <button
                      onClick={() => {
                        onSelect(photo.id, photo.name, "flag", null);
                        setShowFlagMenu(false);
                      }}
                      className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-white cursor-pointer"
                    >
                      <span className="text-[10px] font-bold">×</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Heart Selection */}
            <button
              onClick={() => onSelect(photo.id, photo.name, "favorite", !photo.isFavorite)}
              className={`rounded-full p-2 hover:bg-white/10 transition-colors cursor-pointer ${
                photo.isFavorite ? "text-red-500" : "text-zinc-400 hover:text-white"
              }`}
              title="Yêu thích"
            >
              <Heart className="h-5 w-5 fill-current" style={{ fill: photo.isFavorite ? "currentColor" : "none" }} />
            </button>

            {/* Check/Tick Selection */}
            <button
              onClick={() => onSelect(photo.id, photo.name, "tick", !photo.isTicked)}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 border text-xs font-semibold cursor-pointer transition-all duration-200 ${
                photo.isTicked
                  ? "border-emerald-500 bg-emerald-600/90 text-white hover:bg-emerald-600"
                  : "border-zinc-500 text-zinc-300 hover:border-white hover:text-white"
              }`}
            >
              <Check className={`h-4 w-4 stroke-[3.5] ${photo.isTicked ? "block" : "hidden"}`} />
              <span>{photo.isTicked ? "Đã chọn" : "Chọn ảnh"}</span>
            </button>

            <div className="h-5 w-[1px] bg-zinc-700/60" />

            {/* Info toggle */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className={`rounded-full p-2 hover:bg-white/10 transition-colors cursor-pointer ${
                showDetails ? "text-white bg-white/10" : "text-zinc-400 hover:text-white"
              }`}
              title="Chi tiết ảnh"
            >
              <Info className="h-5 w-5" />
            </button>

            {/* Close Lightbox */}
            <button
              onClick={onClose}
              className="rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white cursor-pointer"
              title="Đóng (ESC)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Main Image Area */}
        <div className="relative flex flex-1 items-center justify-center p-4">
          {/* Navigation Arrows */}
          <button
            onClick={handlePrev}
            className="absolute left-6 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black/40 border border-white/5 text-zinc-400 hover:bg-black/60 hover:text-white cursor-pointer transition-colors"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          {/* Active Image */}
          <div className="relative max-h-[80vh] max-w-[85vw] flex items-center justify-center">
            <motion.img
              key={photo.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              src={`/api/drive/image?fileId=${photo.id}`}
              alt={photo.name}
              className="max-h-[80vh] max-w-[85vw] rounded object-contain shadow-2xl"
            />
          </div>

          <button
            onClick={handleNext}
            className="absolute right-6 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black/40 border border-white/5 text-zinc-400 hover:bg-black/60 hover:text-white cursor-pointer transition-colors"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>

        {/* Details Panel or Bottom Metadata */}
        <div className="w-full z-10 bg-gradient-to-t from-black/80 to-transparent">
          {/* Always show filename */}
          <div className="p-5 flex flex-col items-center justify-center gap-1 text-center">
            <p className="text-sm font-medium tracking-wide text-zinc-100">{photo.name}</p>
            {showDetails && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-xs text-zinc-400 space-y-1.5 border-t border-white/10 pt-2.5 max-w-sm w-full"
              >
                {photo.width && photo.height && (
                  <p>Kích thước: {photo.width} × {photo.height} pixels</p>
                )}
                {photo.size && (
                  <p>Dung lượng: {(parseInt(photo.size) / (1024 * 1024)).toFixed(2)} MB</p>
                )}
                <p>Google Drive ID: {photo.id}</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
}
