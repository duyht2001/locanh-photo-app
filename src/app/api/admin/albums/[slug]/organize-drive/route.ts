import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import prisma from "@/lib/db";
import { createSubfolder, copyFileToFolder } from "@/lib/drive";

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

    // 1. Fetch album details to get the parent Google Drive folder
    const album = await prisma.album.findUnique({
      where: { slug },
    });

    if (!album) {
      return NextResponse.json({ error: "Không tìm thấy album" }, { status: 404 });
    }

    // 2. Fetch selections based on session requirements
    const selectionWhereClause: any = {
      albumId: album.id,
      OR: [
        { isFavorite: true },
        { isTicked: true },
        { colorFlag: { not: null } }
      ]
    };

    if (sessionId && sessionId !== "all") {
      selectionWhereClause.clientSessionId = sessionId;
    }

    const selections = await prisma.selection.findMany({
      where: selectionWhereClause,
      select: {
        photoId: true,
        photoName: true,
      }
    });

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
    
    // We execute copies in chunks of 5 parallel requests to prevent hitting Google Drive API rate limits
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
