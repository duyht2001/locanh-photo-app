import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import prisma from "@/lib/db";
import { updateLocalSelection, getAlbumBySlugOrId } from "@/lib/mockStore";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const body = await request.json();
    const { sessionId, photoId, photoName, action, value } = body;

    if (!slug) {
      return NextResponse.json({ error: "Missing album slug" }, { status: 400 });
    }
    if (!sessionId || !photoId || !photoName || !action) {
      return NextResponse.json(
        { error: "Missing required fields (sessionId, photoId, photoName, action, value)" },
        { status: 400 }
      );
    }

    // 1. Fetch album
    let album: any = null;
    let dbAvailable = !!process.env.DATABASE_URL;

    if (dbAvailable) {
      try {
        album = await prisma.album.findUnique({
          where: { slug },
        });
      } catch (dbErr) {
        console.warn("DB connection error in select route, attempting dev fallback:", dbErr);
        dbAvailable = false;
      }
    }

    if (!album) {
      album = getAlbumBySlugOrId(slug);
    }

    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    // If running in local fallback mode
    if (!dbAvailable) {
      const maxLimit = album.maxSelections ?? null;
      const res = updateLocalSelection(slug, sessionId, photoId, photoName, action, value, maxLimit);
      if (!res.success) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }
      return NextResponse.json({ message: "Selection updated", selection: res.selection });
    }

    // 2. Validate action types and map database update data
    const updateData: any = {};
    if (action === "favorite") {
      updateData.isFavorite = !!value;
    } else if (action === "tick") {
      updateData.isTicked = !!value;
    } else if (action === "flag") {
      updateData.colorFlag = typeof value === "string" ? value : null;
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // 3. Selection limit check
    const isActivating = action === "flag" ? !!value : !!value;
    if (isActivating && album.maxSelections && album.maxSelections > 0) {
      // Check if photo is already selected
      const existingSelection = await prisma.selection.findUnique({
        where: {
          albumId_clientSessionId_photoId: {
            albumId: album.id,
            clientSessionId: sessionId,
            photoId: photoId,
          },
        },
      });

      const isAlreadyActive = !!(
        existingSelection &&
        (existingSelection.isFavorite || existingSelection.isTicked || !!existingSelection.colorFlag)
      );

      if (!isAlreadyActive) {
        // Count active selections for this client
        const currentActiveCount = await prisma.selection.count({
          where: {
            albumId: album.id,
            clientSessionId: sessionId,
            OR: [
              { isFavorite: true },
              { isTicked: true },
              { colorFlag: { not: null } },
            ],
          },
        });

        if (currentActiveCount >= album.maxSelections) {
          return NextResponse.json(
            {
              error: `Đã đạt giới hạn tối đa ${album.maxSelections} ảnh được chọn cho album này. Vui lòng bỏ chọn bớt ảnh khác nếu muốn chọn thêm ảnh này.`,
              maxSelections: album.maxSelections,
              currentCount: currentActiveCount,
            },
            { status: 400 }
          );
        }
      }
    }

    // 4. Upsert selection
    const selection = await prisma.selection.upsert({
      where: {
        albumId_clientSessionId_photoId: {
          albumId: album.id,
          clientSessionId: sessionId,
          photoId: photoId,
        },
      },
      update: updateData,
      create: {
        albumId: album.id,
        clientSessionId: sessionId,
        photoId: photoId,
        photoName: photoName,
        isFavorite: action === "favorite" ? !!value : false,
        isTicked: action === "tick" ? !!value : false,
        colorFlag: action === "flag" ? (value as string) : null,
      },
    });

    // 5. Clean up: If selection has no active ticks, hearts, or flags, remove it from DB to save space
    if (!selection.isFavorite && !selection.isTicked && !selection.colorFlag) {
      await prisma.selection.delete({
        where: { id: selection.id },
      });
      return NextResponse.json({ message: "Selection cleared and deleted", selection: null });
    }

    return NextResponse.json({ message: "Selection updated successfully", selection });
  } catch (error: any) {
    console.error("Error updating photo selection:", error);
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message}` },
      { status: 500 }
    );
  }
}
