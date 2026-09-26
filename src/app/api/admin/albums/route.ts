import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import prisma from "@/lib/db";
import { generateSlug } from "@/lib/utils";
import { getFolderMetadata } from "@/lib/drive";
import { verifyAdminAuth } from "@/lib/auth";
import {
  getSampleAlbumData,
  getCustomAlbums,
  saveCustomAlbum,
  updateCustomAlbum,
  deleteCustomAlbum,
  getAllSelectionsForAlbum,
} from "@/lib/mockStore";

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

// GET: List all albums with selection counts
export async function GET(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Chưa đăng nhập quyền quản trị." }, { status: 401 });
  }

  let dbAlbums: any[] = [];
  try {
    if (process.env.DATABASE_URL) {
      dbAlbums = await prisma.album.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { selections: true },
          },
        },
      });
    }
  } catch (error: unknown) {
    console.warn("DB connection error in GET albums, attempting dev fallback:", error);
  }

  const customAlbums = getCustomAlbums().map((ca) => ({
    ...ca,
    _count: { selections: getAllSelectionsForAlbum(ca.slug).length },
  }));

  // Combine DB albums and custom local albums
  const combined = [...dbAlbums];
  for (const ca of customAlbums) {
    if (!combined.some((a) => a.id === ca.id || a.slug === ca.slug)) {
      combined.push(ca);
    }
  }

  // Include sample album duyen if not present
  const sample = getSampleAlbumData("duyen");
  if (sample && sample.album && !combined.some((a) => a.slug === "duyen" || a.id === sample.album.id)) {
    combined.push({
      ...sample.album,
      _count: { selections: 1 },
    });
  }

  return NextResponse.json(combined);
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
        { error: "Vui lòng nhập Tiêu đề và Google Drive Folder Link/ID." },
        { status: 400 }
      );
    }

    const cleanFolderId = extractFolderId(driveFolderId);

    // 1. Validate Google Drive folder (supports both Service Account & Public links)
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
    while (allCustom.some((a) => a.slug === slug) || slug === "duyen") {
      slug = `${originalSlug}-${counter}`;
      counter++;
    }

    const parsedMaxSelections =
      maxSelections !== undefined && maxSelections !== "" && maxSelections !== null
        ? Math.max(0, parseInt(String(maxSelections), 10)) || null
        : null;

    const albumData: any = {
      title,
      slug,
      driveFolderId: cleanFolderId,
      password: password || null,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      logoUrl: logoUrl || "/logo.jpg",
      bannerUrl: bannerUrl || null,
      allowDownloads: allowDownloads !== undefined ? !!allowDownloads : true,
      maxSelections: parsedMaxSelections,
    };

    // 3. Create album in DB if DATABASE_URL is configured
    if (process.env.DATABASE_URL) {
      try {
        let slugExists = await prisma.album.findUnique({ where: { slug } });
        while (slugExists) {
          slug = `${originalSlug}-${counter}`;
          slugExists = await prisma.album.findUnique({ where: { slug } });
          counter++;
        }
        albumData.slug = slug;

        const album = await prisma.album.create({
          data: {
            title: albumData.title,
            slug: albumData.slug,
            driveFolderId: albumData.driveFolderId,
            password: albumData.password,
            expiresAt: albumData.expiresAt ? new Date(albumData.expiresAt) : null,
            logoUrl: albumData.logoUrl,
            bannerUrl: albumData.bannerUrl,
            allowDownloads: albumData.allowDownloads,
            maxSelections: albumData.maxSelections,
          },
        });
        return NextResponse.json(album, { status: 201 });
      } catch (dbErr) {
        console.warn("DB save failed, falling back to local custom albums:", dbErr);
      }
    }

    // 4. Fallback: Save to local custom albums
    const localAlbum = saveCustomAlbum(albumData);
    return NextResponse.json(localAlbum, { status: 201 });
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

    if (process.env.DATABASE_URL) {
      try {
        const existing = await prisma.album.findUnique({ where: { id } });
        if (existing) {
          const updatedAlbum = await prisma.album.update({
            where: { id },
            data: {
              title: title !== undefined ? title : existing.title,
              driveFolderId: cleanFolderId !== undefined ? cleanFolderId : existing.driveFolderId,
              password: password !== undefined ? (password || null) : existing.password,
              expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : existing.expiresAt,
              logoUrl: logoUrl !== undefined ? logoUrl : existing.logoUrl,
              bannerUrl: bannerUrl !== undefined ? bannerUrl : existing.bannerUrl,
              allowDownloads: allowDownloads !== undefined ? !!allowDownloads : existing.allowDownloads,
              maxSelections: parsedMaxSelections !== undefined ? parsedMaxSelections : existing.maxSelections,
            },
          });
          return NextResponse.json(updatedAlbum);
        }
      } catch (dbErr) {
        console.warn("DB update failed, attempting local update:", dbErr);
      }
    }

    const updated = updateCustomAlbum(id, {
      ...(title !== undefined ? { title } : {}),
      ...(cleanFolderId !== undefined ? { driveFolderId: cleanFolderId } : {}),
      ...(password !== undefined ? { password: password || null } : {}),
      ...(expiresAt !== undefined ? { expiresAt: expiresAt || null } : {}),
      ...(logoUrl !== undefined ? { logoUrl } : {}),
      ...(bannerUrl !== undefined ? { bannerUrl } : {}),
      ...(allowDownloads !== undefined ? { allowDownloads: !!allowDownloads } : {}),
      ...(parsedMaxSelections !== undefined ? { maxSelections: parsedMaxSelections } : {}),
    });

    if (updated) {
      return NextResponse.json(updated);
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

    if (process.env.DATABASE_URL) {
      try {
        await prisma.album.delete({ where: { id } });
        return NextResponse.json({ message: "Xóa album thành công." });
      } catch (dbErr) {
        console.warn("DB delete failed, attempting local delete:", dbErr);
      }
    }

    deleteCustomAlbum(id);
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
