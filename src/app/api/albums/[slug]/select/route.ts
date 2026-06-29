import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import prisma from "@/lib/db";

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
    const album = await prisma.album.findUnique({
      where: { slug },
    });

    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
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

    // 3. Upsert selection
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

    // 4. Clean up: If selection has no active ticks, hearts, or flags, remove it from DB to save space
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
