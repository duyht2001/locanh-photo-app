import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import prisma from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const albumId = searchParams.get("albumId");

  if (!albumId) {
    return NextResponse.json({ error: "Missing albumId parameter" }, { status: 400 });
  }

  try {
    // 1. Fetch album details
    const album = await prisma.album.findUnique({
      where: { id: albumId },
    });

    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    // 2. Fetch all selections for this album
    const selections = await prisma.selection.findMany({
      where: { albumId },
      orderBy: { updatedAt: "desc" },
    });

    // 3. Group selections by clientSessionId
    const groupedSelections: { [sessionId: string]: typeof selections } = {};
    for (const sel of selections) {
      if (!groupedSelections[sel.clientSessionId]) {
        groupedSelections[sel.clientSessionId] = [];
      }
      groupedSelections[sel.clientSessionId].push(sel);
    }

    return NextResponse.json({
      album,
      selections,
      groupedSelections,
    });
  } catch (error: any) {
    console.error("Error fetching album selections:", error);
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message}` },
      { status: 500 }
    );
  }
}
