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
  EyeOff,
  Settings,
  HelpCircle,
  FileText,
  Heart,
  FolderPlus,
  Loader2,
  LogOut,
  ShieldCheck,
  KeyRound,
} from "lucide-react";
import { generateCSV, generateTXT, downloadFile, SelectionExportItem, formatDate } from "@/lib/utils";

export default function AdminPage() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"albums" | "guide">("albums");

  // Auth states
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [adminUser, setAdminUser] = useState<string | null>(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  // Change password states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

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
    allowDownloads: true,
    maxSelections: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Utility states
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Drive organizing states
  const [organizeModalOpen, setOrganizeModalOpen] = useState(false);
  const [organizeSessionId, setOrganizeSessionId] = useState<string | null>(null);
  const [organizeFolderName, setOrganizeFolderName] = useState("");
  const [organizingDrive, setOrganizingDrive] = useState(false);
  const [organizeResult, setOrganizeResult] = useState<any>(null);
  const [organizeError, setOrganizeError] = useState<string | null>(null);

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
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      if (!res.ok) throw new Error("Không thể tải danh sách album.");
      const data = await res.json();
      setAlbums(data);
    } catch (error: any) {
      console.warn("fetchAlbums error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Check auth status on load
  const checkAuth = async () => {
    try {
      const res = await fetch("/api/admin/auth");
      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(true);
        setAdminUser(data.username || "admin");
        fetchAlbums();
      } else {
        setIsAuthenticated(false);
        setLoading(false);
      }
    } catch {
      setIsAuthenticated(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Handle Login submit
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setLoginError("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.");
      return;
    }

    setLoggingIn(true);
    setLoginError(null);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginUsername.trim(),
          password: loginPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Tên đăng nhập hoặc mật khẩu không đúng.");
      }

      setIsAuthenticated(true);
      setAdminUser(data.username || loginUsername.trim());
      setLoginPassword("");
      fetchAlbums();
    } catch (err: any) {
      setLoginError(err.message || "Tên đăng nhập hoặc mật khẩu không chính xác.");
    } finally {
      setLoggingIn(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth", { method: "DELETE" });
    } catch (err) {
      console.error("Logout error:", err);
    }
    setIsAuthenticated(false);
    setAdminUser(null);
    setAlbums([]);
    setSelectedAlbum(null);
  };

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError(null);
    setPasswordChangeSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordChangeError("Vui lòng nhập đầy đủ các trường.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordChangeError("Mật khẩu mới và xác nhận mật khẩu không khớp.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordChangeError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    setChangingPassword(true);

    try {
      const res = await fetch("/api/admin/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Đổi mật khẩu thất bại.");
      }

      setPasswordChangeSuccess("Đổi mật khẩu thành công!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordChangeSuccess(null);
      }, 1500);
    } catch (err: any) {
      setPasswordChangeError(err.message);
    } finally {
      setChangingPassword(false);
    }
  };

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

  // Open modal for organizing files on Google Drive
  const handleOpenOrganizeModal = (sessionId: string) => {
    if (!selectedAlbum) return;
    
    setOrganizeSessionId(sessionId);
    setOrganizeResult(null);
    setOrganizeError(null);
    setOrganizingDrive(false);
    
    // Suggest default folder name, removing characters Google Drive/OS might find problematic
    const cleanAlbumTitle = selectedAlbum.title.replace(/[\\\/*?:"<>|]/g, "");
    const dateStr = new Date().toLocaleDateString("vi-VN").replace(/\//g, "-");
    
    if (sessionId === "all") {
      setOrganizeFolderName(`${cleanAlbumTitle} - Anh Da Chon - Tat Ca - ${dateStr}`);
    } else {
      const shortSess = sessionId.substring(4, 10).toUpperCase();
      setOrganizeFolderName(`${cleanAlbumTitle} - Anh Da Chon - Khach ${shortSess} - ${dateStr}`);
    }
    
    setOrganizeModalOpen(true);
  };

  // Trigger Google Drive organization API
  const handleExecuteOrganize = async () => {
    if (!selectedAlbum || !organizeFolderName.trim()) return;
    
    setOrganizingDrive(true);
    setOrganizeError(null);
    setOrganizeResult(null);
    
    try {
      const res = await fetch(`/api/admin/albums/${selectedAlbum.slug}/organize-drive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: organizeSessionId,
          folderName: organizeFolderName.trim(),
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Gặp lỗi trong quá trình tạo thư mục và sao chép ảnh.");
      }
      
      setOrganizeResult(data);
    } catch (err: any) {
      setOrganizeError(err.message || "Không thể kết nối đến máy chủ.");
    } finally {
      setOrganizingDrive(false);
    }
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
      allowDownloads: true,
      maxSelections: "",
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
      allowDownloads: album.allowDownloads !== undefined ? album.allowDownloads : true,
      maxSelections: album.maxSelections ? String(album.maxSelections) : "",
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
    const formattedPayload = {
      ...formData,
      maxSelections: formData.maxSelections ? parseInt(formData.maxSelections, 10) : null,
    };
    const payload = isEdit ? { ...formattedPayload, id: editingAlbum.id } : formattedPayload;

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

  // Loading check state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <p className="text-xs text-zinc-400 font-medium tracking-wider uppercase">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  // Login view if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-white relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-white/5 blur-3xl pointer-events-none" />

        <div className="w-full max-w-sm relative z-10 space-y-6 animate-in fade-in zoom-in-95 duration-300">
          {/* Logo & Header */}
          <div className="text-center space-y-3">
            <div className="mx-auto h-20 w-20 rounded-full overflow-hidden border-2 border-white/20 p-0.5 shadow-2xl bg-white flex items-center justify-center">
              <img src="/logo.jpg" alt="Tô Studio" className="h-full w-full object-cover rounded-full" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wider text-white font-serif uppercase">TÔ STUDIO</h1>
              <p className="text-[11px] text-zinc-400 mt-1 tracking-widest uppercase font-sans">Đăng Nhập Quản Trị Hệ Thống</p>
            </div>
          </div>

          {/* Login Card */}
          <div className="rounded-2xl border border-white/10 bg-zinc-900/90 p-6 backdrop-blur-xl shadow-2xl space-y-5">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Tài khoản Quản trị
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-3.5 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    required
                    placeholder="Tên tài khoản (admin)"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-zinc-950/60 py-2.5 pl-10 pr-4 text-xs text-white placeholder-zinc-500 outline-none transition-all focus:border-white/30 focus:bg-zinc-950"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Mật khẩu
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 h-4 w-4 text-zinc-500" />
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    required
                    placeholder="Mật khẩu quản trị"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-zinc-950/60 py-2.5 pl-10 pr-10 text-xs text-white placeholder-zinc-500 outline-none transition-all focus:border-white/30 focus:bg-zinc-950"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                    title={showLoginPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-2.5 text-center text-xs font-semibold text-red-400 animate-shake">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={loggingIn}
                className="w-full rounded-xl bg-white py-2.5 text-xs font-bold text-black transition-all hover:bg-zinc-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
              >
                {loggingIn ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang xác thực...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Đăng Nhập Quản Trị</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 border-t border-white/5 text-center space-y-1.5">
              <p className="text-[10px] text-zinc-400">
                💡 Mặc định: <span className="font-mono text-white font-bold">admin</span> / Mật khẩu: <span className="font-mono text-white font-bold">tostudio2026</span>
              </p>
              <p className="text-[9px] text-zinc-600">
                (Có thể đổi tài khoản và mật khẩu trong file .env)
              </p>
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors inline-flex items-center gap-1.5"
            >
              <span>← Quay lại Trang chủ</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50/50">
      
      {/* Top Navbar */}
      <header className="border-b border-zinc-100 bg-white sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2.5">
                <img
                  src="/logo.jpg"
                  alt="Tô Studio"
                  className="h-8 w-8 rounded-full object-cover border border-zinc-200 shadow-xs"
                />
                <div>
                  <span className="text-sm font-bold tracking-wider text-zinc-950 block font-serif">TÔ STUDIO</span>
                  <span className="text-[9px] font-semibold tracking-widest text-zinc-400 block uppercase">Trang Quản Trị</span>
                </div>
              </div>
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
            
            {/* User Profile & Logout */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 text-zinc-700 text-xs font-semibold">
                <User className="h-3.5 w-3.5 text-zinc-500" />
                <span>{adminUser || "admin"}</span>
              </div>
              <button
                onClick={() => {
                  setPasswordChangeError(null);
                  setPasswordChangeSuccess(null);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setShowPasswordModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold transition-colors cursor-pointer"
                title="Đổi mật khẩu tài khoản quản trị"
              >
                <KeyRound className="h-3.5 w-3.5 text-zinc-500" />
                <span className="hidden sm:inline">Đổi mật khẩu</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-200 hover:border-red-200 hover:bg-red-50 text-zinc-600 hover:text-red-600 text-xs font-semibold transition-colors cursor-pointer"
                title="Đăng xuất khỏi hệ thống quản trị"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Đăng xuất</span>
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
                        <div className="flex items-center gap-1.5">
                          {album.maxSelections ? (
                            <span className="text-amber-700 bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 rounded text-[9px] font-semibold">
                              Giới hạn: {album.maxSelections}
                            </span>
                          ) : (
                            <span className="text-zinc-400 text-[9px]">KGH</span>
                          )}
                          {album.expiresAt && (
                            <span className="text-red-500 font-medium">Hạn: {new Date(album.expiresAt).toLocaleDateString()}</span>
                          )}
                        </div>
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
                        {selectedAlbum.maxSelections ? (
                          <div className="flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200/80 px-3 py-1 text-[10px] font-semibold text-amber-800">
                            <span>🎯 Giới hạn: {selectedAlbum.maxSelections} ảnh</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-[10px] font-semibold text-zinc-500">
                            <span>🎯 Không giới hạn</span>
                          </div>
                        )}
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
                            <button
                              onClick={() => handleOpenOrganizeModal("all")}
                              className="flex items-center gap-1 rounded-full border border-zinc-200 hover:border-black bg-white hover:bg-zinc-50 px-3 py-1.5 text-[10px] font-bold text-zinc-700 hover:text-black cursor-pointer transition-colors animate-pulse-slow"
                            >
                              <FolderPlus className="h-3.5 w-3.5 text-violet-500" />
                              <span>Chép vào Drive</span>
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
                                  <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                                    <span>Khách hàng (Session: <span className="font-mono text-[10px]">{sessId.substring(4, 12)}...</span>)</span>
                                    <Link
                                      href={`/album/${selectedAlbum.slug}?session=${sessId}`}
                                      target="_blank"
                                      className="text-zinc-400 hover:text-black transition-colors"
                                      title="Xem trang khách của session này"
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </Link>
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
                                    <button
                                      onClick={() => handleOpenOrganizeModal(sessId)}
                                      className="rounded border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 hover:text-black px-2.5 py-1 text-[10px] font-bold cursor-pointer flex items-center gap-1"
                                      title="Tạo thư mục trên Drive và copy ảnh đã chọn của khách này vào"
                                    >
                                      <FolderPlus className="h-3 w-3 text-violet-500" />
                                      <span>Lưu vào Drive</span>
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Tiny photos thumbnail preview list */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                {sels.map((sel: any) => (
                                  <div key={sel.id} className="relative aspect-square rounded-lg border border-zinc-100 overflow-hidden bg-zinc-50 group">
                                    <img
                                      src={`https://lh3.googleusercontent.com/d/${sel.photoId}=w400`}
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
              
              {/* Method 1: Public Link */}
              <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white">★</span>
                  <span>Cách 1: Dán trực tiếp link Google Drive công khai (Khuyên dùng - Nhanh nhất)</span>
                </div>
                <p className="text-emerald-900/80 text-xs leading-relaxed">
                  Không cần cấu hình Google Cloud API phức tạp! Bạn chỉ cần đảm bảo thư mục Google Drive chứa ảnh được mở quyền xem công khai:
                </p>
                <ol className="list-decimal pl-5 space-y-1.5 text-emerald-950 font-medium text-xs">
                  <li>Mở <strong>Google Drive</strong>, nhấp chuột phải vào thư mục ảnh &gt; chọn <strong>Chia sẻ (Share)</strong>.</li>
                  <li>Tại mục <strong>Quyền truy cập chung (General access)</strong>: Đổi từ <em>Hạn chế (Restricted)</em> sang <strong>Bất kỳ ai có đường liên kết (Anyone with the link)</strong> và đặt quyền là <strong>Người xem (Viewer)</strong>.</li>
                  <li>Bấm <strong>Sao chép đường liên kết (Copy link)</strong>.</li>
                  <li>Dán thẳng đường link vừa sao chép (hoặc Folder ID) vào ô <strong>Google Drive Link</strong> khi Tạo Album. Hệ thống sẽ tự động quét và hiển thị toàn bộ ảnh!</li>
                </ol>
              </div>

              {/* Method 2: Service Account */}
              <div className="border border-zinc-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-zinc-900 font-bold text-sm">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] text-white">⚙</span>
                  <span>Cách 2: Cấu hình Google Cloud Service Account (Dành cho tài khoản doanh nghiệp)</span>
                </div>
                <p className="text-zinc-600 text-xs">
                  Cấu hình này phù hợp khi bạn muốn giữ thư mục ở chế độ riêng tư nội bộ hoặc sử dụng tính năng tạo thư mục con & sao chép ảnh trực tiếp trên Google Drive:
                </p>

                <section className="space-y-2">
                  <h4 className="font-bold text-zinc-800 text-xs">1. Tạo Service Account trên Google Cloud</h4>
                  <ol className="list-decimal pl-5 space-y-1 text-zinc-600 text-xs">
                    <li>Truy cập <a href="https://console.cloud.google.com/" target="_blank" className="text-zinc-900 font-semibold underline">Google Cloud Console</a>.</li>
                    <li>Vào mục <strong>APIs & Services &gt; Library</strong>, tìm <strong>Google Drive API</strong> và bấm <strong>Enable</strong>.</li>
                    <li>Vào mục <strong>IAM & Admin &gt; Service Accounts</strong> &gt; bấm <strong>Create Service Account</strong>.</li>
                    <li>Sau khi tạo, nhấn vào Service Account đó, chuyển sang tab <strong>Keys</strong> &gt; chọn <strong>Add Key &gt; Create new key (JSON)</strong>. Tải file JSON về máy.</li>
                  </ol>
                </section>

                <section className="space-y-2">
                  <h4 className="font-bold text-zinc-800 text-xs">2. Thêm Service Account Key vào file .env</h4>
                  <p className="text-zinc-600 text-xs">
                    Mở file JSON vừa tải, copy toàn bộ nội dung và gán vào biến <code>GOOGLE_SERVICE_ACCOUNT_KEY</code> trong file <code>.env</code>:
                  </p>
                  <div className="bg-zinc-900 text-zinc-200 p-3 rounded-lg font-mono text-[10px] break-all">
                    {"GOOGLE_SERVICE_ACCOUNT_KEY='{\"type\": \"service_account\", \"project_id\": \"...\", \"private_key\": \"...\", \"client_email\": \"...\"}'"}
                  </div>
                </section>
              </div>

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
                  <span>Google Drive Link hoặc Folder ID *</span>
                  <span className="text-[9px] text-emerald-600 font-medium normal-case">
                    (Hỗ trợ dán cả link chia sẻ công khai)
                  </span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Dán link Drive (VD: https://drive.google.com/drive/folders/...) hoặc ID thư mục"
                  value={formData.driveFolderId}
                  onChange={(e) => setFormData({ ...formData, driveFolderId: e.target.value })}
                  className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-xs outline-none focus:border-black font-mono text-[11px]"
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

              {/* Max Selections Limit */}
              <div className="bg-zinc-50 border border-zinc-200/80 p-3.5 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="maxSelections" className="block text-xs font-bold text-zinc-800">
                    Giới hạn số lượng ảnh khách chọn (Max Selections)
                  </label>
                  <span className="text-[10px] text-zinc-400 font-medium">Bỏ trống hoặc 0 = Không giới hạn</span>
                </div>
                <input
                  id="maxSelections"
                  type="number"
                  min="0"
                  placeholder="VD: 30 (Khách chỉ được chọn tối đa 30 tấm)"
                  value={formData.maxSelections}
                  onChange={(e) => setFormData({ ...formData, maxSelections: e.target.value })}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-xs outline-none focus:border-black font-mono"
                />
                <p className="text-[10px] text-zinc-500">
                  Khi khách chọn đủ số ảnh này, hệ thống sẽ thông báo và yêu cầu bỏ chọn bớt trước khi chọn thêm.
                </p>
              </div>

              {/* Allow Downloads Checkbox Options */}
              <div className="flex items-center gap-2.5 bg-zinc-50 border border-zinc-150/60 p-3.5 rounded-xl">
                <input
                  type="checkbox"
                  id="allowDownloads"
                  checked={formData.allowDownloads}
                  onChange={(e) => setFormData({ ...formData, allowDownloads: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-300 text-black focus:ring-black cursor-pointer"
                />
                <label htmlFor="allowDownloads" className="text-xs font-bold text-zinc-700 cursor-pointer select-none">
                  Cho phép khách hàng tải ảnh xuống thiết bị
                </label>
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
                        const previewUrl = `https://lh3.googleusercontent.com/d/${photo.id}=w220`;
                        const logoUrl = `https://lh3.googleusercontent.com/d/${photo.id}=w600`;
                        const bannerUrl = `https://lh3.googleusercontent.com/d/${photo.id}=w1200`;
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

      {/* Google Drive Organize Modal */}
      {organizeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-zinc-100 bg-white p-6 shadow-2xl space-y-4 animate-in scale-in duration-200">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <FolderPlus className="h-5 w-5 text-violet-500" />
                <h3 className="text-sm font-bold text-zinc-950">Sao chép ảnh vào Google Drive</h3>
              </div>
              <button
                type="button"
                onClick={() => setOrganizeModalOpen(false)}
                disabled={organizingDrive}
                className="text-zinc-400 hover:text-zinc-600 text-sm font-bold cursor-pointer disabled:opacity-50"
              >
                ×
              </button>
            </div>

            {/* Form & Loading State */}
            {!organizeResult ? (
              <div className="space-y-4">
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Hệ thống sẽ tự động tạo một thư mục con bên trong thư mục ảnh gốc của Album trên Google Drive, sau đó sao chép toàn bộ các ảnh được lựa chọn của phiên khách hàng này vào đó.
                </p>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Tên thư mục mới
                  </label>
                  <input
                    type="text"
                    disabled={organizingDrive}
                    value={organizeFolderName}
                    onChange={(e) => setOrganizeFolderName(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs outline-none focus:border-black disabled:bg-zinc-50"
                    placeholder="Nhập tên thư mục"
                  />
                </div>

                {organizeError && (
                  <div className="bg-red-50 text-red-600 p-2.5 rounded-lg text-xs font-semibold leading-normal">
                    ⚠️ {organizeError}
                  </div>
                )}

                <div className="flex justify-end gap-2.5 pt-2 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setOrganizeModalOpen(false)}
                    disabled={organizingDrive}
                    className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 cursor-pointer disabled:opacity-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteOrganize}
                    disabled={organizingDrive || !organizeFolderName.trim()}
                    className="flex items-center gap-1.5 rounded-lg bg-black hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 text-white px-4 py-2 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    {organizingDrive ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      <>
                        <FolderPlus className="h-3.5 w-3.5" />
                        <span>Bắt đầu chép</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              // Success View
              <div className="space-y-4 text-center py-2 animate-in fade-in duration-300">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Check className="h-6 w-6 stroke-[3]" />
                </div>
                
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-zinc-900">Sao chép ảnh hoàn tất!</h4>
                  <p className="text-xs text-zinc-500">
                    Đã tạo thư mục và chép thành công <span className="text-zinc-900 font-bold">{organizeResult.successCount}</span> ảnh.
                  </p>
                </div>

                <div className="bg-zinc-50 border border-zinc-100 p-3 rounded-xl text-left space-y-1.5 text-xs">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Thư mục tạo ra:</p>
                  <p className="font-semibold text-zinc-800 truncate">{organizeFolderName}</p>
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-zinc-100">
                  <a
                    href={organizeResult.driveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-black hover:bg-zinc-800 text-white px-4 py-2.5 text-xs font-bold shadow-md cursor-pointer transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Mở thư mục trên Google Drive</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setOrganizeModalOpen(false)}
                    className="rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 px-4 py-2 text-xs font-semibold cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* CHANGE PASSWORD DIALOG MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Đổi Mật Khẩu Quản Trị</h3>
                  <p className="text-[10px] text-zinc-500">
                    Tài khoản: <span className="font-semibold text-zinc-700">{adminUser || "admin"}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-600 mb-1.5">
                  Mật khẩu hiện tại
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    required
                    placeholder="Nhập mật khẩu hiện tại"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2.5 pl-3.5 pr-10 text-xs text-zinc-900 outline-none transition-all focus:border-black focus:bg-white"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                    title={showCurrentPassword ? "Ẩn" : "Hiện"}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-600 mb-1.5">
                  Mật khẩu mới
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    placeholder="Tối thiểu 6 ký tự"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2.5 pl-3.5 pr-10 text-xs text-zinc-900 outline-none transition-all focus:border-black focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                    title={showNewPassword ? "Ẩn" : "Hiện"}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-600 mb-1.5">
                  Xác nhận mật khẩu mới
                </label>
                <input
                  type="password"
                  required
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2.5 px-3.5 text-xs text-zinc-900 outline-none transition-all focus:border-black focus:bg-white"
                />
              </div>

              {passwordChangeError && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-2.5 text-center text-xs font-medium text-red-600">
                  {passwordChangeError}
                </div>
              )}

              {passwordChangeSuccess && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-center text-xs font-semibold text-emerald-700 flex items-center justify-center gap-1.5">
                  <Check className="h-4 w-4" />
                  <span>{passwordChangeSuccess}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 rounded-xl border border-zinc-200 py-2.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="flex-1 rounded-xl bg-zinc-950 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  {changingPassword ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Lưu Mật Khẩu</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
