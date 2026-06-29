"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  Calendar,
  Lock,
  Download,
  User,
  Copy,
  Check,
  BookOpen,
  Eye,
  Settings,
  HelpCircle,
  FileText,
  Heart
} from "lucide-react";
import { generateCSV, generateTXT, downloadFile, SelectionExportItem, formatDate } from "@/lib/utils";

export default function AdminPage() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"albums" | "guide">("albums");

  // Data states
  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlbum, setSelectedAlbum] = useState<any>(null);
  const [albumSelections, setAlbumSelections] = useState<any>(null);
  const [loadingSelections, setLoadingSelections] = useState(false);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    driveFolderId: "",
    password: "",
    expiresAt: "",
    logoUrl: "",
    bannerUrl: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Utility states
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Local Copy Tool States
  const [sourceDirName, setSourceDirName] = useState<string>("");
  const [destDirName, setDestDirName] = useState<string>("");
  const [sourceHandle, setSourceHandle] = useState<any>(null);
  const [destHandle, setDestHandle] = useState<any>(null);
  const [copyProgress, setCopyProgress] = useState<{ current: number; total: number; fileName: string } | null>(null);
  const [copying, setCopying] = useState(false);
  const [copyResult, setCopyResult] = useState<{ success: number; failed: number; missingList: string[] } | null>(null);

  // Local Copy Tool input modes
  const [copyInputMode, setCopyInputMode] = useState<"client" | "manual">("client");
  const [manualPhotoNames, setManualPhotoNames] = useState<string>("");
  const [copyFilterJpeg, setCopyFilterJpeg] = useState(true);
  const [copyFilterRaw, setCopyFilterRaw] = useState(true);

  // Form Photos for directly setting Logo/Banner
  const [formPhotos, setFormPhotos] = useState<any[]>([]);
  const [loadingFormPhotos, setLoadingFormPhotos] = useState(false);
  const [showFormPhotoSelector, setShowFormPhotoSelector] = useState(false);

  const fetchFormPhotos = async () => {
    if (!editingAlbum) return;
    setLoadingFormPhotos(true);
    try {
      const res = await fetch(`/api/albums/${editingAlbum.slug}/photos?isAdmin=true`);
      if (!res.ok) throw new Error("Không thể tải ảnh từ Drive");
      const data = await res.json();
      setFormPhotos(data.photos || []);
      setShowFormPhotoSelector(true);
    } catch (error: any) {
      alert("Lỗi tải ảnh: " + error.message);
    } finally {
      setLoadingFormPhotos(false);
    }
  };

  // Request directory picker for source
  const handleSelectSource = async () => {
    try {
      if (typeof window === "undefined" || !(window as any).showDirectoryPicker) {
        alert("Trình duyệt của bạn không hỗ trợ File System Access API. Vui lòng sử dụng Chrome, Edge hoặc Opera!");
        return;
      }
      const handle = await (window as any).showDirectoryPicker();
      setSourceHandle(handle);
      setSourceDirName(handle.name);
      setCopyResult(null);
    } catch (err: any) {
      console.error(err);
    }
  };

  // Request directory picker for destination
  const handleSelectDest = async () => {
    try {
      if (typeof window === "undefined" || !(window as any).showDirectoryPicker) {
        alert("Trình duyệt của bạn không hỗ trợ File System Access API. Vui lòng sử dụng Chrome, Edge hoặc Opera!");
        return;
      }
      const handle = await (window as any).showDirectoryPicker({ mode: "readwrite" });
      setDestHandle(handle);
      setDestDirName(handle.name);
      setCopyResult(null);
    } catch (err: any) {
      console.error(err);
    }
  };

  // Scan directory recursively - groups FileHandles by their lowercase filename without extension
  const scanDirectory = async (dirHandle: any, fileMap: Map<string, any[]>) => {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === "file") {
        const name = entry.name.toLowerCase();
        const nameWithoutExt = name.replace(/\.[^/.]+$/, "");
        
        if (!fileMap.has(nameWithoutExt)) {
          fileMap.set(nameWithoutExt, []);
        }
        fileMap.get(nameWithoutExt)!.push(entry);
      } else if (entry.kind === "directory") {
        await scanDirectory(entry, fileMap);
      }
    }
  };

  // Perform local photo copy
  const handleStartCopy = async () => {
    if (!sourceHandle || !destHandle) return;

    if (!copyFilterJpeg && !copyFilterRaw) {
      alert("Vui lòng chọn ít nhất một định dạng file cần chép (JPEG hoặc RAW)!");
      return;
    }

    // Get targets list
    let targetPhotoNames: string[] = [];
    if (copyInputMode === "client") {
      if (!albumSelections || albumSelections.selections.length === 0) {
        alert("Khách hàng chưa chọn bức ảnh nào trong album này!");
        return;
      }
      targetPhotoNames = albumSelections.selections.map((s: any) => s.photoName);
    } else {
      targetPhotoNames = manualPhotoNames
        .split(/[\n,]+/)
        .map((name) => name.trim())
        .filter(Boolean);
      
      if (targetPhotoNames.length === 0) {
        alert("Vui lòng nhập ít nhất một tên file ảnh cần lọc!");
        return;
      }
    }

    setCopying(true);
    setCopyResult(null);
    const total = targetPhotoNames.length;
    setCopyProgress({ current: 0, total, fileName: "Đang quét thư mục nguồn..." });

    const jpegExtensions = ["jpg", "jpeg"];
    const rawExtensions = ["cr2", "cr3", "arw", "nef", "dng", "raf", "orf", "rw2", "pef"];

    try {
      // 1. Scan source directory
      const fileMap = new Map<string, any[]>();
      await scanDirectory(sourceHandle, fileMap);

      let success = 0;
      let failed = 0;
      const missingList: string[] = [];

      // 2. Loop and copy
      for (let i = 0; i < targetPhotoNames.length; i++) {
        const photoName = targetPhotoNames[i];
        setCopyProgress({ current: i + 1, total, fileName: photoName });

        const lowerName = photoName.toLowerCase();
        const nameWithoutExt = lowerName.replace(/\.[^/.]+$/, "");

        // Find matched file handles having this filename (without extension)
        const handles = fileMap.get(nameWithoutExt) || [];
        
        // Filter handles based on selected file extension types (JPEG / RAW)
        const filteredHandles = handles.filter((handle) => {
          const ext = handle.name.split(".").pop()?.toLowerCase() || "";
          const isJpeg = jpegExtensions.includes(ext);
          const isRaw = rawExtensions.includes(ext);
          
          if (copyFilterJpeg && isJpeg) return true;
          if (copyFilterRaw && isRaw) return true;
          return false;
        });

        if (filteredHandles.length > 0) {
          let hasCopiedAny = false;
          for (const handle of filteredHandles) {
            try {
              const file = await handle.getFile();
              const newFileHandle = await destHandle.getFileHandle(handle.name, { create: true });
              const writable = await newFileHandle.createWritable();
              await writable.write(file);
              await writable.close();
              success++;
              hasCopiedAny = true;
            } catch (err) {
              console.error(err);
              failed++;
              missingList.push(`${handle.name} (Lỗi copy)`);
            }
          }
          if (!hasCopiedAny) {
            failed++;
            missingList.push(photoName);
          }
        } else {
          failed++;
          missingList.push(photoName);
        }
      }

      setCopyResult({ success, failed, missingList });
    } catch (err: any) {
      alert(`Đã xảy ra lỗi trong quá trình copy: ${err.message}`);
    } finally {
      setCopying(false);
      setCopyProgress(null);
    }
  };

  // Fetch all albums
  const fetchAlbums = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/albums");
      if (!res.ok) throw new Error("Không thể tải danh sách album.");
      const data = await res.json();
      setAlbums(data);
    } catch (error: any) {
      alert(error.message || "Lỗi kết nối API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlbums();
  }, []);

  // Fetch detailed selections for an album
  const fetchAlbumSelections = async (albumId: string) => {
    setLoadingSelections(true);
    setAlbumSelections(null);
    try {
      const res = await fetch(`/api/admin/albums/selections?albumId=${albumId}`);
      if (!res.ok) throw new Error("Không thể tải kết quả lựa chọn.");
      const data = await res.json();
      setAlbumSelections(data);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoadingSelections(false);
    }
  };

  const handleSelectAlbumForDetail = (album: any) => {
    setSelectedAlbum(album);
    fetchAlbumSelections(album.id);
  };

  // Form handlers
  const handleOpenCreate = () => {
    setEditingAlbum(null);
    setFormData({
      title: "",
      driveFolderId: "",
      password: "",
      expiresAt: "",
      logoUrl: "",
      bannerUrl: "",
    });
    setFormError(null);
    setShowForm(true);
  };

  const handleOpenEdit = (album: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAlbum(album);
    setFormData({
      title: album.title,
      driveFolderId: album.driveFolderId,
      password: album.password || "",
      expiresAt: album.expiresAt ? new Date(album.expiresAt).toISOString().split("T")[0] : "",
      logoUrl: album.logoUrl || "",
      bannerUrl: album.bannerUrl || "",
    });
    setFormError(null);
    setShowForm(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    const isEdit = !!editingAlbum;
    const url = "/api/admin/albums";
    const method = isEdit ? "PUT" : "POST";
    const payload = isEdit ? { ...formData, id: editingAlbum.id } : formData;

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gặp lỗi khi lưu album.");
      }

      setShowForm(false);
      fetchAlbums();
      if (selectedAlbum && selectedAlbum.id === data.id) {
        setSelectedAlbum(data);
      }
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteAlbum = async (albumId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Bạn có chắc chắn muốn xóa album này? Tất cả dữ liệu ảnh khách đã chọn sẽ bị xóa vĩnh viễn.")) return;

    try {
      const res = await fetch(`/api/admin/albums?id=${albumId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Xóa thất bại.");
      }
      if (selectedAlbum && selectedAlbum.id === albumId) {
        setSelectedAlbum(null);
        setAlbumSelections(null);
      }
      fetchAlbums();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Export handlers for Admin
  const handleExportSelections = (sessionId: string | "all", type: "csv" | "txt" | "json") => {
    if (!albumSelections || albumSelections.selections.length === 0) return;

    let targetSelections = albumSelections.selections;
    if (sessionId !== "all") {
      targetSelections = albumSelections.selections.filter((s: any) => s.clientSessionId === sessionId);
    }

    const items: SelectionExportItem[] = targetSelections.map((photo: any) => {
      const statuses = [];
      if (photo.isFavorite) statuses.push("Heart");
      if (photo.isTicked) statuses.push("Tick");
      if (photo.colorFlag) statuses.push(`Flag:${photo.colorFlag}`);

      let status: SelectionExportItem["status"] = "Unselected";
      if (photo.isFavorite) status = "Favorite";
      else if (photo.isTicked) status = "Ticked";
      else if (photo.colorFlag) status = "Flagged";

      return {
        fileName: photo.photoName,
        fileId: photo.photoId,
        status,
        details: statuses.join("+"),
      };
    });

    const albumTitle = albumSelections.album.title;
    const suffix = sessionId === "all" ? "tat_ca" : `khach_${sessionId.substring(4, 9)}`;
    const safeTitle = `${albumTitle.replace(/\s+/g, "_").toLowerCase()}_${suffix}`;

    if (type === "csv") {
      const csv = generateCSV(items);
      downloadFile(csv, `selection_${safeTitle}.csv`, "text/csv;charset=utf-8;");
    } else if (type === "txt") {
      const txt = generateTXT(items);
      downloadFile(txt, `selection_${safeTitle}.txt`, "text/plain;charset=utf-8;");
    } else if (type === "json") {
      const json = JSON.stringify({ albumTitle, sessionId, exportTime: new Date().toISOString(), selections: items }, null, 2);
      downloadFile(json, `selection_${safeTitle}.json`, "application/json;charset=utf-8;");
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-50/50">
      
      {/* Top Navbar */}
      <header className="border-b border-zinc-100 bg-white sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-6">
              <span className="text-sm font-bold tracking-widest text-zinc-950 font-serif">LOCANH ADMIN</span>
              <nav className="hidden sm:flex gap-4">
                <button
                  onClick={() => setActiveTab("albums")}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                    activeTab === "albums" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  Quản lý Album
                </button>
                <button
                  onClick={() => setActiveTab("guide")}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                    activeTab === "guide" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  Hướng dẫn setup Drive
                </button>
              </nav>
            </div>
            
            {/* Mobile Nav Links */}
            <div className="flex sm:hidden gap-2">
              <button
                onClick={() => setActiveTab("albums")}
                className={`text-[10px] font-bold px-2.5 py-1.5 rounded-full ${
                  activeTab === "albums" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600"
                }`}
              >
                Albums
              </button>
              <button
                onClick={() => setActiveTab("guide")}
                className={`text-[10px] font-bold px-2.5 py-1.5 rounded-full ${
                  activeTab === "guide" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600"
                }`}
              >
                Setup
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Tab 1: ALBUM MANAGEMENT */}
        {activeTab === "albums" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Sidebar List of Albums */}
            <div className="lg:col-span-1 bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-bold tracking-tight text-zinc-900">Danh sách Album</h2>
                <button
                  onClick={handleOpenCreate}
                  className="flex items-center gap-1 rounded-full bg-zinc-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tạo Album</span>
                </button>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 w-full animate-shimmer bg-zinc-100 rounded-xl" />
                  ))}
                </div>
              ) : albums.length > 0 ? (
                <div className="space-y-2">
                  {albums.map((album) => (
                    <div
                      key={album.id}
                      onClick={() => handleOpenCreate !== null && handleSelectAlbumForDetail(album)}
                      className={`group p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                        selectedAlbum?.id === album.id
                          ? "border-zinc-900 bg-zinc-50"
                          : "border-zinc-100 bg-white hover:border-zinc-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Album mini logo preview */}
                        <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-zinc-50 border border-zinc-100 flex items-center justify-center shadow-sm">
                          {album.logoUrl ? (
                            <img src={album.logoUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-bold text-zinc-400 font-serif">
                              {album.title.substring(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-zinc-900 truncate pr-2">{album.title}</p>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                onClick={(e) => handleOpenEdit(album, e)}
                                className="rounded p-1 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900"
                                title="Sửa"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(e) => handleDeleteAlbum(album.id, e)}
                                className="rounded p-1 hover:bg-red-50 text-zinc-400 hover:text-red-600"
                                title="Xóa"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          <p className="text-[9px] text-zinc-400 mt-0.5 font-mono">/album/{album.slug}</p>
                        </div>
                      </div>
                      <div className="mt-3 pt-2 border-t border-zinc-50 flex items-center justify-between text-[10px] text-zinc-500">
                        <span className="font-semibold text-zinc-700">{album._count?.selections || 0} ảnh được chọn</span>
                        {album.expiresAt && (
                          <span className="text-red-500 font-medium">Hạn: {new Date(album.expiresAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-xs font-medium text-zinc-400">Chưa có album nào được tạo.</p>
                </div>
              )}
            </div>

            {/* Album details / selections view */}
            <div className="lg:col-span-2">
              {selectedAlbum ? (
                <div className="space-y-6">
                  {/* Album Info Bar */}
                  <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h1 className="text-lg font-bold text-zinc-900">{selectedAlbum.title}</h1>
                          <Link
                            href={`/album/${selectedAlbum.slug}`}
                            target="_blank"
                            className="text-zinc-400 hover:text-black transition-colors"
                            title="Xem trang khách"
                          >
                            <ExternalLink className="h-4.5 w-4.5" />
                          </Link>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1 font-mono">
                          Link khách: <span className="bg-zinc-100 px-1.5 py-0.5 rounded text-[11px] font-sans select-all">{`${window.location.origin}/album/${selectedAlbum.slug}`}</span>
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedAlbum.password && (
                          <div className="flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-[10px] font-semibold text-zinc-600">
                            <Lock className="h-3 w-3" />
                            <span>Mật khẩu: {selectedAlbum.password}</span>
                          </div>
                        )}
                        {selectedAlbum.expiresAt && (
                          <div className="flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-[10px] font-semibold text-red-600">
                            <Calendar className="h-3 w-3" />
                            <span>Hết hạn: {new Date(selectedAlbum.expiresAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Client selections table */}
                  <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-sm font-bold text-zinc-900 mb-6">Kết quả lựa chọn từ khách hàng</h2>
                    
                    {loadingSelections ? (
                      <div className="py-12 flex justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />
                      </div>
                    ) : albumSelections && Object.keys(albumSelections.groupedSelections).length > 0 ? (
                      <div className="space-y-6">
                        {/* Summary panel for all selections */}
                        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                          <span className="text-xs font-semibold text-zinc-500">
                            Tổng số ảnh được chọn trong album: <span className="text-zinc-900 font-bold">{albumSelections.selections.length}</span>
                          </span>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleExportSelections("all", "csv")}
                              className="flex items-center gap-1 rounded-full border border-zinc-200 hover:border-black px-3 py-1.5 text-[10px] font-bold text-zinc-700 hover:text-black cursor-pointer transition-colors"
                            >
                              <Download className="h-3 w-3" />
                              <span>CSV</span>
                            </button>
                            <button
                              onClick={() => handleExportSelections("all", "txt")}
                              className="flex items-center gap-1 rounded-full border border-zinc-200 hover:border-black px-3 py-1.5 text-[10px] font-bold text-zinc-700 hover:text-black cursor-pointer transition-colors"
                            >
                              <FileText className="h-3 w-3" />
                              <span>TXT</span>
                            </button>
                          </div>
                        </div>

                        {/* List per customer session */}
                        {Object.entries(albumSelections.groupedSelections).map(([sessId, sels]: [string, any]) => {
                          const favCount = sels.filter((s: any) => s.isFavorite).length;
                          const tickedCount = sels.filter((s: any) => s.isTicked).length;
                          const flaggedCount = sels.filter((s: any) => s.colorFlag).length;

                          return (
                            <div key={sessId} className="border border-zinc-100 rounded-xl p-4 space-y-4">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-zinc-50/50 p-2.5 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-zinc-400" />
                                  <span className="text-xs font-bold text-zinc-800">
                                    Khách hàng (Session: <span className="font-mono text-[10px]">{sessId.substring(4, 12)}...</span>)
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2.5 text-[10px] text-zinc-500 font-semibold">
                                    <span className="flex items-center gap-1">
                                      Heart: <span className="text-zinc-900 font-bold">{favCount}</span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                      Tick: <span className="text-zinc-900 font-bold">{tickedCount}</span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                      Gắn cờ: <span className="text-zinc-900 font-bold">{flaggedCount}</span>
                                    </span>
                                  </div>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => handleExportSelections(sessId, "csv")}
                                      className="rounded bg-zinc-900 hover:bg-zinc-800 text-white px-2.5 py-1 text-[10px] font-bold cursor-pointer"
                                      title="Xuất file CSV cho khách hàng này"
                                    >
                                      Xuất CSV
                                    </button>
                                    <button
                                      onClick={() => handleExportSelections(sessId, "txt")}
                                      className="rounded border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 px-2.5 py-1 text-[10px] font-bold cursor-pointer"
                                      title="Xuất file TXT cho khách hàng này"
                                    >
                                      Xuất TXT
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Tiny photos thumbnail preview list */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                {sels.map((sel: any) => (
                                  <div key={sel.id} className="relative aspect-square rounded-lg border border-zinc-100 overflow-hidden bg-zinc-50 group">
                                    <img
                                      src={`/api/drive/image?fileId=${sel.photoId}`}
                                      alt={sel.photoName}
                                      className="h-full w-full object-cover"
                                    />
                                    {/* Action badges on image */}
                                    <div className="absolute top-1 right-1 flex gap-0.5">
                                      {sel.isFavorite && (
                                        <div className="rounded bg-red-500 p-0.5 text-white">
                                          <Heart className="h-2.5 w-2.5 fill-current" />
                                        </div>
                                      )}
                                      {sel.isTicked && (
                                        <div className="rounded bg-emerald-500 p-0.5 text-white">
                                          <Check className="h-2.5 w-2.5 stroke-[3.5]" />
                                        </div>
                                      )}
                                      {sel.colorFlag && (
                                        <div className={`rounded p-0.5 h-3.5 w-3.5 flex items-center justify-center bg-white shadow-sm border border-zinc-200`}>
                                          <div className={`h-1.5 w-1.5 rounded-full ${
                                            sel.colorFlag === "red" ? "bg-red-500" :
                                            sel.colorFlag === "yellow" ? "bg-yellow-400" :
                                            sel.colorFlag === "green" ? "bg-emerald-500" : "bg-blue-500"
                                          }`} />
                                        </div>
                                      )}
                                    </div>
                                    {/* File Name Tooltip on hover */}
                                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center p-1.5 transition-opacity">
                                      <p className="text-[9px] font-medium text-white truncate w-full text-center">
                                        {sel.photoName}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-16 text-center border border-dashed border-zinc-200 rounded-xl">
                        <User className="mx-auto h-8 w-8 text-zinc-300 stroke-[1.2] mb-2" />
                        <p className="text-xs font-semibold text-zinc-400">Chưa có lượt chọn ảnh nào từ khách.</p>
                      </div>
                    )}
                  </div>

                  {/* Local Copy Tool */}
                  {selectedAlbum && (
                    <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-50 pb-4">
                        <div>
                          <h2 className="text-sm font-bold text-zinc-900">Chép ảnh đã chọn sang thư mục mới</h2>
                          <p className="text-[11px] text-zinc-400 mt-1">
                            Công cụ lọc ảnh chạy trực tiếp trên máy tính. Tìm và chép các file tương ứng sang thư mục đích (hỗ trợ cả ảnh RAW như .CR3, .NEF, .ARW).
                          </p>
                        </div>
                        
                        {/* Selector mode toggles */}
                        <div className="flex rounded-lg bg-zinc-100 p-0.5 self-start sm:self-center">
                          <button
                            type="button"
                            onClick={() => { setCopyInputMode("client"); setCopyResult(null); }}
                            className={`rounded-md px-3 py-1 text-[10px] font-bold transition-all cursor-pointer ${
                              copyInputMode === "client" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
                            }`}
                          >
                            Lấy từ khách chọn
                          </button>
                          <button
                            type="button"
                            onClick={() => { setCopyInputMode("manual"); setCopyResult(null); }}
                            className={`rounded-md px-3 py-1 text-[10px] font-bold transition-all cursor-pointer ${
                              copyInputMode === "manual" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
                            }`}
                          >
                            Tự nhập tên file
                          </button>
                        </div>
                      </div>

                      {/* Manual input textarea */}
                      {copyInputMode === "manual" && (
                        <div className="space-y-2 animate-in fade-in duration-200">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                            Nhập danh sách tên file cần chép
                          </label>
                          <textarea
                            placeholder="Nhập hoặc dán danh sách tên file, cách nhau bằng dấu xuống dòng hoặc dấu phẩy.&#10;Ví dụ:&#10;wedding_001.jpg&#10;wedding_002.jpg"
                            value={manualPhotoNames}
                            onChange={(e) => setManualPhotoNames(e.target.value)}
                            className="w-full rounded-lg border border-zinc-200 p-3 text-xs outline-none focus:border-black font-mono min-h-24 placeholder-zinc-300"
                          />
                        </div>
                      )}

                      {/* File format checkbox filters */}
                      <div className="flex flex-wrap items-center gap-4 bg-zinc-50 border border-zinc-100 p-3 rounded-xl animate-in fade-in duration-150">
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Định dạng chép:</span>
                        <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={copyFilterJpeg}
                            onChange={(e) => setCopyFilterJpeg(e.target.checked)}
                            className="rounded border-zinc-300 text-black focus:ring-black h-4 w-4"
                          />
                          <span>Ảnh JPEG (.jpg, .jpeg)</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={copyFilterRaw}
                            onChange={(e) => setCopyFilterRaw(e.target.checked)}
                            className="rounded border-zinc-300 text-black focus:ring-black h-4 w-4"
                          />
                          <span>Ảnh RAW (.cr2, .cr3, .arw, .nef, .raf, .dng)</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Source selector button */}
                        <div
                          onClick={handleSelectSource}
                          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-5 cursor-pointer transition-all duration-200 ${
                            sourceDirName
                              ? "border-emerald-200 bg-emerald-50/10"
                              : "border-zinc-200 hover:border-zinc-400 bg-zinc-50/50 hover:bg-zinc-50"
                          }`}
                        >
                          <div className={`rounded-xl p-3 flex items-center justify-center shadow-sm ${sourceDirName ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'}`}>
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                          </div>
                          <span className="mt-2 text-[9px] font-bold uppercase tracking-wider text-zinc-400">Nguồn</span>
                          <p className="mt-1 text-xs font-semibold text-zinc-800 text-center truncate max-w-full">
                            {sourceDirName ? `Thư mục: ${sourceDirName}` : "Chọn thư mục gốc trên máy tính"}
                          </p>
                        </div>

                        {/* Destination selector button */}
                        <div
                          onClick={handleSelectDest}
                          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-5 cursor-pointer transition-all duration-200 ${
                            destDirName
                              ? "border-emerald-200 bg-emerald-50/10"
                              : "border-zinc-200 hover:border-zinc-400 bg-zinc-50/50 hover:bg-zinc-50"
                          }`}
                        >
                          <div className={`rounded-xl p-3 flex items-center justify-center shadow-sm ${destDirName ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'}`}>
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8m-5 5h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293h3.172a1 1 0 00.707-.293l2.414-2.414a1 1 0 01.707-.293H20" />
                            </svg>
                          </div>
                          <span className="mt-2 text-[9px] font-bold uppercase tracking-wider text-zinc-400">Đích</span>
                          <p className="mt-1 text-xs font-semibold text-zinc-800 text-center truncate max-w-full">
                            {destDirName ? `Thư mục: ${destDirName}` : "Chọn thư mục chứa file sau khi lọc"}
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {copyProgress && (
                        <div className="space-y-2 border border-zinc-100 p-4 rounded-xl bg-zinc-50/30">
                          <div className="flex items-center justify-between text-xs font-semibold text-zinc-600">
                            <span className="truncate max-w-xs">Đang chép: <span className="font-bold text-zinc-950">{copyProgress.fileName}</span></span>
                            <span>{copyProgress.current} / {copyProgress.total}</span>
                          </div>
                          <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-black transition-all duration-150"
                              style={{ width: `${(copyProgress.current / copyProgress.total) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Results block */}
                      {copyResult && (
                        <div className="border border-zinc-100 p-4 rounded-xl bg-zinc-50/30 space-y-3 animate-in fade-in duration-200">
                          <div className="flex items-center justify-between text-xs font-bold text-zinc-800">
                            <span>KẾT QUẢ SAO CHÉP CỤC BỘ</span>
                            <span className="text-emerald-600">Thành công: {copyResult.success} | Thất bại: {copyResult.failed}</span>
                          </div>
                          {copyResult.missingList.length > 0 && (
                            <div className="text-[10px] text-zinc-500 font-medium space-y-1">
                              <p className="font-bold text-red-500">Các file không tìm thấy ở thư mục nguồn:</p>
                              <div className="max-h-24 overflow-y-auto bg-white border border-zinc-100 rounded p-2 font-mono">
                                {copyResult.missingList.map((name, idx) => (
                                  <div key={idx}>- {name}</div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Trigger copy button */}
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleStartCopy}
                          disabled={!sourceHandle || !destHandle || copying}
                          className="rounded-full bg-black px-6 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 disabled:bg-zinc-100 disabled:text-zinc-400 transition-colors cursor-pointer"
                        >
                          {copying ? "Đang sao chép..." : "Bắt đầu sao chép"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-64 flex-col items-center justify-center border border-dashed border-zinc-200 rounded-2xl bg-white text-center p-6">
                  <HelpCircle className="h-10 w-10 text-zinc-300 stroke-[1.2] mb-3" />
                  <p className="text-xs font-bold text-zinc-800">Xem kết quả lựa chọn ảnh</p>
                  <p className="text-[11px] text-zinc-400 mt-1.5 max-w-xs">
                    Vui lòng chọn một Album từ danh sách bên trái để cấu hình chi tiết và tải kết quả chọn ảnh từ khách hàng.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: GOOGLE DRIVE CONFIGURATION GUIDE */}
        {activeTab === "guide" && (
          <div className="max-w-3xl mx-auto bg-white border border-zinc-100 rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 border-b border-zinc-100 pb-5 mb-6">
              <BookOpen className="h-6 w-6 text-zinc-900" />
              <h2 className="text-base font-bold text-zinc-900">Hướng dẫn kết nối Google Drive API</h2>
            </div>
            
            <div className="space-y-6 text-xs text-zinc-600 leading-relaxed">
              
              <section className="space-y-2.5">
                <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] text-white">1</span>
                  Tạo Google Service Account
                </h3>
                <p>
                  Ứng dụng của chúng ta sử dụng phương pháp <strong>Service Account</strong> (Tài khoản dịch vụ) để đọc thư mục Google Drive ở server-side mà không cần yêu cầu người dùng phải đăng nhập tài khoản Google.
                </p>
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li>Truy cập <a href="https://console.cloud.google.com/" target="_blank" className="text-zinc-900 font-semibold underline">Google Cloud Console</a>.</li>
                  <li>Tạo một dự án mới (hoặc chọn dự án có sẵn).</li>
                  <li>Truy cập mục <strong>APIs & Services</strong> &gt; <strong>Library</strong>. Tìm kiếm <strong>Google Drive API</strong> và chọn <strong>Enable</strong>.</li>
                  <li>Truy cập mục <strong>IAM & Admin</strong> &gt; <strong>Service Accounts</strong> và chọn <strong>Create Service Account</strong>.</li>
                  <li>Đặt tên cho Service Account và bấm <strong>Create and Continue</strong>, sau đó nhấn <strong>Done</strong>.</li>
                  <li>Tại danh sách Service Accounts, nhấn vào email Service Account vừa tạo, chuyển sang tab <strong>Keys</strong>.</li>
                  <li>Chọn <strong>Add Key</strong> &gt; <strong>Create new key</strong>. Chọn định dạng <strong>JSON</strong> và bấm <strong>Create</strong>. Một file JSON chứa private key sẽ được tải về máy của bạn.</li>
                </ol>
              </section>

              <section className="space-y-2.5">
                <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] text-white">2</span>
                  Liên kết biến môi trường (Environment Variables)
                </h3>
                <p>
                  Mở file JSON vừa tải về ở bước trên, sao chép toàn bộ nội dung của file JSON này. Dán nội dung đó vào file cấu hình môi trường <code>.env</code> (hoặc thiết lập trên Dashboard của Vercel khi deploy) với tên biến:
                </p>
                <div className="bg-zinc-900 text-zinc-200 p-3 rounded-lg font-mono text-[10px] relative">
                  {"GOOGLE_SERVICE_ACCOUNT_KEY='{\"type\": \"service_account\", \"project_id\": \"...\", \"private_key\": \"...\", \"client_email\": \"...\"}'"}
                </div>
                <p className="text-[11px] text-amber-600 font-semibold">
                  ⚠️ Lưu ý: Nội dung JSON này chứa private key tuyệt mật, không được đưa lên GitHub công khai!
                </p>
              </section>

              <section className="space-y-2.5">
                <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] text-white">3</span>
                  Cấp quyền công khai cho Thư mục Google Drive
                </h3>
                <p>
                  Để website có thể đọc được ảnh mà không cần chia sẻ email thủ công cho Service Account, bạn chỉ cần thiết lập thư mục ở chế độ công khai:
                </p>
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li>Mở Google Drive, nhấp chuột phải vào thư mục ảnh của bạn, chọn <strong>Share</strong> (Chia sẻ) &gt; <strong>Share</strong>.</li>
                  <li>Tại mục General Access (Quyền truy cập chung), thay đổi từ <strong>Restricted</strong> (Hạn chế) thành <strong>Anyone with the link</strong> (Bất kỳ ai có liên kết).</li>
                  <li>Đặt quyền bên cạnh là <strong>Viewer</strong> (Người xem). Bấm <strong>Done</strong>. Hệ thống sẽ kết nối trực tiếp qua liên kết công khai này!</li>
                </ol>
              </section>

              <section className="space-y-2.5">
                <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] text-white">4</span>
                  Lấy ID của Thư mục Google Drive
                </h3>
                <p>
                  Mở thư mục Google Drive đó trên trình duyệt web, URL trên thanh địa chỉ sẽ có định dạng:
                </p>
                <div className="bg-zinc-100 p-3 rounded-lg font-mono text-[10px]">
                  https://drive.google.com/drive/folders/<span className="bg-yellow-100 border border-yellow-300 font-bold px-1 text-zinc-900">1a2B3c4D_xYz_9876543210</span>
                </div>
                <p>
                  Sao chép chuỗi ký tự nằm sau <code>/folders/</code> (chuỗi bôi màu vàng trong ví dụ). Đó chính là <strong>Drive Folder ID</strong> bạn cần điền vào Form tạo Album trên bảng điều khiển quản trị.
                </p>
              </section>

            </div>
          </div>
        )}
      </main>

      {/* CREATE & EDIT ALBUM DIALOG MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden border border-zinc-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
              <h3 className="text-sm font-bold text-zinc-900">
                {editingAlbum ? "Chỉnh sửa Album" : "Tạo Album mới"}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-zinc-400 hover:text-zinc-600 text-base cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600 font-medium border border-red-100">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Tiêu đề Album *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Đám cưới Duy & Trang 2026"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-xs outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5 flex items-center justify-between">
                  <span>Google Drive Folder ID *</span>
                  <span className="text-[9px] text-zinc-400 font-normal normal-case">
                    (Thư mục cần được thiết lập chia sẻ công khai)
                  </span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: 1a2B3c4D_xYz_9876543210"
                  value={formData.driveFolderId}
                  onChange={(e) => setFormData({ ...formData, driveFolderId: e.target.value })}
                  className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-xs outline-none focus:border-black"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                    Mật khẩu Album (Tùy chọn)
                  </label>
                  <input
                    type="password"
                    placeholder="Bỏ trống nếu muốn xem tự do"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-xs outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                    Ngày hết hạn (Tùy chọn)
                  </label>
                  <input
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-xs outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                    Studio Logo URL (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    placeholder="https://example.com/logo.png"
                    value={formData.logoUrl}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-xs outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                    Banner Cover URL (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    placeholder="https://example.com/banner.png"
                    value={formData.bannerUrl}
                    onChange={(e) => setFormData({ ...formData, bannerUrl: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-xs outline-none focus:border-black"
                  />
                </div>
              </div>

              {/* Directly select from album photos */}
              {editingAlbum && (
                <div className="space-y-2 border border-zinc-100 rounded-xl p-3 bg-zinc-50/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">Đặt từ ảnh trong Album</span>
                    <button
                      type="button"
                      onClick={fetchFormPhotos}
                      disabled={loadingFormPhotos}
                      className="text-[10px] text-zinc-800 hover:text-black font-bold underline cursor-pointer disabled:opacity-50"
                    >
                      {loadingFormPhotos ? "Đang tải..." : showFormPhotoSelector ? "Làm mới danh sách" : "🖼️ Chọn ảnh trực tiếp"}
                    </button>
                  </div>

                  {showFormPhotoSelector && formPhotos.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto p-1 bg-white border border-zinc-100 rounded-lg animate-in fade-in duration-200">
                      {formPhotos.map((photo) => {
                        const previewUrl = `https://drive.google.com/thumbnail?id=${photo.id}&w=220&sz=w220`;
                        const logoUrl = `https://drive.google.com/thumbnail?id=${photo.id}&w=600&sz=w600`;
                        const bannerUrl = `https://drive.google.com/thumbnail?id=${photo.id}&w=1200&sz=w1200`;
                        return (
                          <div key={photo.id} className="relative aspect-square rounded-md overflow-hidden border border-zinc-100 group bg-zinc-50">
                            <img src={previewUrl} className="h-full w-full object-cover" alt="" />
                            <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 items-center justify-center p-1">
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, logoUrl: logoUrl })}
                                className="text-[8px] font-bold text-white bg-blue-500 hover:bg-blue-600 rounded py-0.5 w-full text-center cursor-pointer"
                              >
                                Làm Logo
                              </button>
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, bannerUrl: bannerUrl })}
                                className="text-[8px] font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded py-0.5 w-full text-center cursor-pointer"
                              >
                                Làm Banner
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-zinc-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="flex items-center gap-1.5 rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:bg-zinc-300 transition-colors cursor-pointer"
                >
                  {formSubmitting && (
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  )}
                  <span>{editingAlbum ? "Cập nhật" : "Tạo Album"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
