import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import prisma from "@/lib/db";
import { createSubfolder, copyFileToFolder } from "@/lib/drive";
import { getAlbumBySlugOrId, getGroupedSelectionsForAlbum } from "@/lib/mockStore";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const body = await request.json();
    const { sessionId, folderName } = body;

    if (!slug) {
      return NextResponse.json({ error: "Missing album slug" }, { status: 400 });
    }
    if (!folderName || !folderName.trim()) {
      return NextResponse.json({ error: "Tên thư mục không được để trống" }, { status: 400 });
    }

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      return NextResponse.json(
        {
          error:
            "Tính năng tự động tạo thư mục và sao chép ảnh trên Google Drive yêu cầu cấu hình Service Account (GOOGLE_SERVICE_ACCOUNT_KEY trong file .env). Bạn có thể xem tab 'Hướng dẫn setup Drive' hoặc dùng công cụ 'Chép ảnh sang thư mục máy tính' ngay bên dưới rất tiện lợi và không cần cài đặt API!",
        },
        { status: 400 }
      );
    }

    // 1. Fetch album details
    let album: any = null;
    if (process.env.DATABASE_URL) {
      try {
        album = await prisma.album.findUnique({
          where: { slug },
        });
      } catch (e) {
        console.warn("DB fetch failed in organize-drive:", e);
      }
    }

    if (!album) {
      album = getAlbumBySlugOrId(slug);
    }

    if (!album) {
      return NextResponse.json({ error: "Không tìm thấy album" }, { status: 404 });
    }

    // 2. Fetch selections
    let selections: { photoId: string; photoName: string }[] = [];
    if (process.env.DATABASE_URL) {
      try {
        const selectionWhereClause: any = {
          albumId: album.id,
          OR: [
            { isFavorite: true },
            { isTicked: true },
            { colorFlag: { not: null } },
          ],
        };

        if (sessionId && sessionId !== "all") {
          selectionWhereClause.clientSessionId = sessionId;
        }

        const dbSels = await prisma.selection.findMany({
          where: selectionWhereClause,
          select: {
            photoId: true,
            photoName: true,
          },
        });
        selections = dbSels;
      } catch (e) {
        console.warn("DB selections fetch error:", e);
      }
    }

    if (selections.length === 0) {
      const { selections: localSels } = getGroupedSelectionsForAlbum(album.slug, album.id);
      selections = localSels
        .filter((s) => (sessionId === "all" || s.clientSessionId === sessionId) && (s.isFavorite || s.isTicked || !!s.colorFlag))
        .map((s) => ({ photoId: s.photoId, photoName: s.photoName }));
    }

    if (selections.length === 0) {
      return NextResponse.json(
        { error: "Không tìm thấy ảnh nào được lựa chọn để sao chép" },
        { status: 400 }
      );
    }

    // 3. Create the subfolder inside the parent Drive folder
    console.log(`Creating subfolder "${folderName}" inside parent folder ${album.driveFolderId}`);
    const subfolderId = await createSubfolder(album.driveFolderId, folderName.trim());

    // 4. Copy all selected files to the newly created subfolder
    console.log(`Copying ${selections.length} photos into subfolder ${subfolderId}`);
    
    const chunkSize = 5;
    const copiedFiles: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < selections.length; i += chunkSize) {
      const chunk = selections.slice(i, i + chunkSize);
      
      const copyPromises = chunk.map(async (sel) => {
        try {
          const newFileId = await copyFileToFolder(sel.photoId, subfolderId);
          copiedFiles.push(newFileId);
        } catch (copyErr: any) {
          console.error(`Failed to copy photo ${sel.photoName} (${sel.photoId}):`, copyErr);
          errors.push(`${sel.photoName}: ${copyErr.message}`);
        }
      });
      
      await Promise.all(copyPromises);
    }

    const driveLink = `https://drive.google.com/drive/folders/${subfolderId}`;

    return NextResponse.json({
      message: `Đã sao chép thành công ${copiedFiles.length} ảnh vào thư mục mới`,
      successCount: copiedFiles.length,
      failCount: errors.length,
      errors: errors.length > 0 ? errors : null,
      folderId: subfolderId,
      driveLink: driveLink,
    });

  } catch (error: any) {
    console.error("Error organizing Google Drive folder:", error);
    return NextResponse.json(
      { error: `Lỗi hệ thống: ${error.message}` },
      { status: 500 }
    );
  }
}
