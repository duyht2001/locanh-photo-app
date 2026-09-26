import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { generateSlug } from "@/lib/utils";
import { getFolderMetadata } from "@/lib/drive";
import { verifyAdminAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  getSampleAlbumData,
  getCustomAlbums,
  saveCustomAlbum,
  updateCustomAlbum,
  deleteCustomAlbum,
  getAllSelectionsForAlbum,
} from "@/lib/mockStore";
import {
  extractMaxSelections,
  cleanBannerUrl,
  encodeBannerWithMaxSelections,
} from "@/lib/albumHelper";

function extractFolderId(input: string): string {
  const trimmed = input.trim();
  if (trimmed.includes("drive.google.com")) {
    const match = trimmed.match(/\/folders\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) return match[1];

    const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9-_]+)/);
    if (idMatch && idMatch[1]) return idMatch[1];
  }
  return trimmed;
}

// GET: List all albums with selection counts from Supabase + Local backup
export async function GET(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Chưa đăng nhập quyền quản trị." }, { status: 401 });
  }

  const localCustom = getCustomAlbums();
  const customMap = new Map(localCustom.map((a) => [a.slug, a]));

  try {
    const { data: supaAlbums, error } = await supabase
      .from("Album")
      .select("*, selections:Selection(id)")
      .order("createdAt", { ascending: false });

    if (!error && supaAlbums) {
      const formatted = supaAlbums.map((a: any) => {
        const local = customMap.get(a.slug);
        const maxSel = extractMaxSelections(a, local);
        return {
          ...a,
          bannerUrl: cleanBannerUrl(a.bannerUrl),
          maxSelections: maxSel,
          _count: {
            selections: Array.isArray(a.selections) ? a.selections.length : 0,
          },
        };
      });

      // Include any local albums not yet in Supabase
      for (const ca of localCustom) {
        if (!formatted.some((a: any) => a.slug === ca.slug || a.id === ca.id)) {
          formatted.push({
            ...ca,
            _count: { selections: getAllSelectionsForAlbum(ca.slug).length },
          });
        }
      }

      return NextResponse.json(formatted);
    }
  } catch (error: unknown) {
    console.warn("Supabase fetch error in GET albums, falling back to local:", error);
  }

  // Fallback to local albums
  const formatted = localCustom.map((ca) => ({
    ...ca,
    _count: { selections: getAllSelectionsForAlbum(ca.slug).length },
  }));

  const sample = getSampleAlbumData("duyen");
  if (sample && sample.album && !formatted.some((a) => a.slug === "duyen" || a.id === sample.album.id)) {
    formatted.push({
      ...sample.album,
      _count: { selections: 1 },
    });
  }

  return NextResponse.json(formatted);
}

// POST: Create a new album
export async function POST(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Chưa đăng nhập quyền quản trị." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, driveFolderId, password, expiresAt, logoUrl, bannerUrl, allowDownloads, maxSelections } = body;

    if (!title || !driveFolderId) {
      return NextResponse.json(
        { error: "Vui lòng nhập Tiêu đề và Google Drive Link/ID." },
        { status: 400 }
      );
    }

    const cleanFolderId = extractFolderId(driveFolderId);

    // 1. Validate Google Drive folder
    try {
      await getFolderMetadata(cleanFolderId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        {
          error: `Không thể kết nối thư mục Google Drive: ${message}. Vui lòng đảm bảo bạn đã mở quyền 'Bất kỳ ai có đường liên kết đều có thể xem' trên Google Drive.`,
        },
        { status: 400 }
      );
    }

    // 2. Generate a unique slug
    let slug = generateSlug(title);
    const originalSlug = slug;
    let counter = 1;

    const allCustom = getCustomAlbums();
    while (allCustom.some((a) => a.slug === slug)) {
      slug = `${originalSlug}-${counter}`;
      counter++;
    }

    const parsedMaxSelections =
      maxSelections !== undefined && maxSelections !== "" && maxSelections !== null
        ? Math.max(0, parseInt(String(maxSelections), 10)) || null
        : null;

    const now = new Date().toISOString();
    const albumId = `album_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const encodedBanner = encodeBannerWithMaxSelections(bannerUrl, parsedMaxSelections);

    const albumData: any = {
      id: albumId,
      title,
      slug,
      driveFolderId: cleanFolderId,
      password: password || null,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      logoUrl: logoUrl || "/logo.jpg",
      bannerUrl: encodedBanner,
      allowDownloads: allowDownloads !== undefined ? !!allowDownloads : true,
      maxSelections: parsedMaxSelections,
      createdAt: now,
      updatedAt: now,
    };

    // 3. Save to Supabase FIRST
    let supaInserted: any = null;
    try {
      const supaPayload: any = {
        id: albumId,
        title: albumData.title,
        slug: albumData.slug,
        driveFolderId: albumData.driveFolderId,
        password: albumData.password,
        expiresAt: albumData.expiresAt,
        logoUrl: albumData.logoUrl,
        bannerUrl: encodedBanner,
        allowDownloads: albumData.allowDownloads,
        maxSelections: parsedMaxSelections,
        createdAt: now,
        updatedAt: now,
      };

      let { data: inserted, error: supaErr } = await supabase
        .from("Album")
        .upsert(supaPayload)
        .select()
        .single();

      if (supaErr && supaErr.message && supaErr.message.includes("maxSelections")) {
        delete supaPayload.maxSelections;
        const retry = await supabase
          .from("Album")
          .upsert(supaPayload)
          .select()
          .single();
        inserted = retry.data;
        supaErr = retry.error;
      }

      if (!supaErr && inserted) {
        supaInserted = inserted;
      } else if (supaErr) {
        console.warn("Supabase insert error:", supaErr.message);
      }
    } catch (e) {
      console.warn("Supabase insert exception:", e);
    }

    // 4. Save locally/in-memory (safe against EROFS)
    let localAlbum: any = null;
    try {
      localAlbum = saveCustomAlbum(albumData);
    } catch (e) {
      console.warn("Local album save error (safe fallback):", e);
    }

    if (supaInserted) {
      return NextResponse.json({
        ...supaInserted,
        bannerUrl: cleanBannerUrl(supaInserted.bannerUrl),
        maxSelections: parsedMaxSelections,
      }, { status: 201 });
    }

    if (localAlbum) {
      return NextResponse.json({
        ...localAlbum,
        bannerUrl: cleanBannerUrl(localAlbum.bannerUrl),
      }, { status: 201 });
    }

    return NextResponse.json({
      ...albumData,
      bannerUrl: cleanBannerUrl(albumData.bannerUrl),
    }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST album error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Tạo album thất bại: ${message}` },
      { status: 500 }
    );
  }
}

// PUT: Update an existing album
export async function PUT(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Chưa đăng nhập quyền quản trị." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, title, driveFolderId, password, expiresAt, logoUrl, bannerUrl, allowDownloads, maxSelections } = body;

    if (!id) {
      return NextResponse.json({ error: "Thiếu Album ID cần cập nhật." }, { status: 400 });
    }

    const cleanFolderId = driveFolderId ? extractFolderId(driveFolderId) : undefined;

    if (cleanFolderId) {
      try {
        await getFolderMetadata(cleanFolderId);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json(
          {
            error: `Kiểm tra thư mục Google Drive thất bại: ${message}`,
          },
          { status: 400 }
        );
      }
    }

    const parsedMaxSelections =
      maxSelections !== undefined
        ? (maxSelections !== "" && maxSelections !== null
            ? Math.max(0, parseInt(String(maxSelections), 10)) || null
            : null)
        : undefined;

    const encodedBanner =
      bannerUrl !== undefined || parsedMaxSelections !== undefined
        ? encodeBannerWithMaxSelections(bannerUrl, parsedMaxSelections)
        : undefined;

    // Update in Supabase FIRST
    let supaUpdated: any = null;
    try {
      const supaUpdates: any = {
        ...(title !== undefined ? { title } : {}),
        ...(cleanFolderId !== undefined ? { driveFolderId: cleanFolderId } : {}),
        ...(password !== undefined ? { password: password || null } : {}),
        ...(expiresAt !== undefined ? { expiresAt: expiresAt || null } : {}),
        ...(logoUrl !== undefined ? { logoUrl } : {}),
        ...(encodedBanner !== undefined ? { bannerUrl: encodedBanner } : {}),
        ...(allowDownloads !== undefined ? { allowDownloads: !!allowDownloads } : {}),
        ...(parsedMaxSelections !== undefined ? { maxSelections: parsedMaxSelections } : {}),
        updatedAt: new Date().toISOString(),
      };

      let { data, error } = await supabase
        .from("Album")
        .update(supaUpdates)
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error && error.message && error.message.includes("maxSelections")) {
        delete supaUpdates.maxSelections;
        if (encodedBanner !== undefined) {
          supaUpdates.bannerUrl = encodedBanner;
        }
        const retry = await supabase
          .from("Album")
          .update(supaUpdates)
          .eq("id", id)
          .select()
          .maybeSingle();
        data = retry.data;
        error = retry.error;
      }

      if (!error && data) {
        supaUpdated = data;
      }
    } catch (e) {
      console.warn("Supabase update error:", e);
    }

    // Update locally/in-memory (safe against EROFS)
    let updated: any = null;
    try {
      updated = updateCustomAlbum(id, {
        ...(title !== undefined ? { title } : {}),
        ...(cleanFolderId !== undefined ? { driveFolderId: cleanFolderId } : {}),
        ...(password !== undefined ? { password: password || null } : {}),
        ...(expiresAt !== undefined ? { expiresAt: expiresAt || null } : {}),
        ...(logoUrl !== undefined ? { logoUrl } : {}),
        ...(encodedBanner !== undefined ? { bannerUrl: encodedBanner } : {}),
        ...(allowDownloads !== undefined ? { allowDownloads: !!allowDownloads } : {}),
        ...(parsedMaxSelections !== undefined ? { maxSelections: parsedMaxSelections } : {}),
      });
    } catch (e) {
      console.warn("Local update error:", e);
    }

    if (supaUpdated) {
      return NextResponse.json({
        ...supaUpdated,
        bannerUrl: cleanBannerUrl(supaUpdated.bannerUrl),
        maxSelections: parsedMaxSelections ?? extractMaxSelections(supaUpdated, updated),
      });
    }

    if (updated) {
      return NextResponse.json({
        ...updated,
        bannerUrl: cleanBannerUrl(updated.bannerUrl),
        maxSelections: parsedMaxSelections ?? extractMaxSelections(updated),
      });
    }

    return NextResponse.json({ error: "Không tìm thấy Album." }, { status: 404 });
  } catch (error: unknown) {
    console.error("PUT album error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Cập nhật album thất bại: ${message}` },
      { status: 500 }
    );
  }
}

// DELETE: Remove an album
export async function DELETE(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Chưa đăng nhập quyền quản trị." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Thiếu Album ID cần xóa." }, { status: 400 });
    }

    // Delete in Supabase
    try {
      await supabase.from("Selection").delete().eq("albumId", id);
      await supabase.from("Album").delete().eq("id", id);
    } catch (e) {
      console.warn("Supabase delete error:", e);
    }

    try {
      deleteCustomAlbum(id);
    } catch (e) {
      console.warn("Local delete error:", e);
    }

    return NextResponse.json({ message: "Xóa album thành công." });
  } catch (error: unknown) {
    console.error("DELETE album error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Xóa album thất bại: ${message}` },
      { status: 500 }
    );
  }
}
