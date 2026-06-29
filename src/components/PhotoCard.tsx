import React, { useState } from "react";
import { Heart, Check, Flag, Maximize2 } from "lucide-react";
import { Photo } from "@/types";

interface PhotoCardProps {
  photo: Photo;
  onSelect: (photoId: string, photoName: string, action: "favorite" | "tick" | "flag", value: any) => void;
  onImageClick: () => void;
}

export default function PhotoCard({ photo, onSelect, onImageClick }: PhotoCardProps) {
  const [showFlagMenu, setShowFlagMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Convert default low-res thumbnail link (=s220) to a high-quality preview (=s600)
  const getOptimizedThumbnail = (link?: string) => {
    if (!link) return "/placeholder.svg";
    return link.replace(/=s\d+$/, "=s600");
  };

  const flagColors = [
    { name: "red", class: "bg-red-500 hover:bg-red-600" },
    { name: "yellow", class: "bg-yellow-400 hover:bg-yellow-500" },
    { name: "green", class: "bg-emerald-500 hover:bg-emerald-600" },
    { name: "blue", class: "bg-blue-500 hover:bg-blue-600" },
  ];

  return (
    <div
      className="break-inside-avoid mb-5 overflow-hidden rounded-xl border border-zinc-100 bg-white p-2.5 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowFlagMenu(false);
      }}
    >
      {/* Image Container */}
      <div className="relative overflow-hidden rounded-lg bg-zinc-50 cursor-zoom-in group/img" onClick={onImageClick}>
        <img
          src={getOptimizedThumbnail(photo.thumbnailLink)}
          alt={photo.name}
          loading="lazy"
          className="w-full h-auto object-cover transition-transform duration-500 group-hover/img:scale-[1.02]"
        />
        
        {/* Hover overlay with maximize icon */}
        <div className="absolute inset-0 bg-black/10 opacity-0 transition-opacity duration-300 group-hover/img:opacity-100 flex items-center justify-center">
          <div className="rounded-full bg-white/90 p-2.5 shadow-md transform translate-y-2 transition-transform duration-300 group-hover/img:translate-y-0">
            <Maximize2 className="h-4.5 w-4.5 text-zinc-800" />
          </div>
        </div>

        {/* Flag Color Indicator on Top Left */}
        {photo.colorFlag && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-white/90 px-2 py-0.5 shadow-sm">
            <div className={`h-2.5 w-2.5 rounded-full bg-${photo.colorFlag}-500 ${photo.colorFlag === "yellow" ? "bg-yellow-400" : photo.colorFlag === "green" ? "bg-emerald-500" : ""}`} />
            <span className="text-[10px] font-medium capitalize text-zinc-600">{photo.colorFlag}</span>
          </div>
        )}
      </div>

      {/* Footer Info & Actions */}
      <div className="mt-3 flex items-center justify-between px-1">
        {/* File Name */}
        <div className="min-w-0 flex-1 pr-3">
          <p className="truncate text-xs font-medium text-zinc-800" title={photo.name}>
            {photo.name}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0 relative">
          
          {/* Flag Picker Dropdown */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowFlagMenu(!showFlagMenu);
              }}
              className={`rounded-full p-1.5 transition-colors duration-200 hover:bg-zinc-100 ${
                photo.colorFlag ? "text-zinc-800" : "text-zinc-400 hover:text-zinc-600"
              }`}
              title="Gắn cờ màu"
            >
              <Flag className="h-4 w-4 fill-current" style={{ fill: photo.colorFlag ? "currentColor" : "none" }} />
            </button>

            {showFlagMenu && (
              <div className="absolute bottom-9 right-0 z-20 flex gap-1 rounded-full border border-zinc-200 bg-white p-1 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
                {flagColors.map((color) => (
                  <button
                    key={color.name}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(photo.id, photo.name, "flag", color.name);
                      setShowFlagMenu(false);
                    }}
                    className={`h-5 w-5 rounded-full transition-transform hover:scale-110 cursor-pointer ${color.class}`}
                  />
                ))}
                {photo.colorFlag && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(photo.id, photo.name, "flag", null);
                      setShowFlagMenu(false);
                    }}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 cursor-pointer"
                    title="Xóa cờ"
                  >
                    <span className="text-[10px] font-bold">×</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Heart Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(photo.id, photo.name, "favorite", !photo.isFavorite);
            }}
            className={`rounded-full p-1.5 transition-colors duration-200 cursor-pointer ${
              photo.isFavorite
                ? "bg-red-50/50 text-red-500"
                : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            }`}
            title="Yêu thích"
          >
            <Heart
              className="h-4 w-4 transition-transform duration-200 hover:scale-110 fill-current"
              style={{ fill: photo.isFavorite ? "currentColor" : "none" }}
            />
          </button>

          {/* Tick Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(photo.id, photo.name, "tick", !photo.isTicked);
            }}
            className={`rounded-full p-1.5 transition-colors duration-200 cursor-pointer ${
              photo.isTicked
                ? "bg-emerald-50 text-emerald-600"
                : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            }`}
            title="Chọn ảnh"
          >
            <div className={`flex h-4.5 w-4.5 items-center justify-center rounded border transition-colors ${
              photo.isTicked 
                ? "border-emerald-600 bg-emerald-600 text-white" 
                : "border-zinc-300"
            }`}>
              {photo.isTicked && <Check className="h-3 w-3 stroke-[3]" />}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
