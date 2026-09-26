import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import prisma from "@/lib/db";
import { verifyAdminAuth } from "@/lib/auth";
import {
  getSampleAlbumData,
  getAlbumBySlugOrId,
  getAllSelectionsForAlbum,
  getGroupedSelectionsForAlbum,
} from "@/lib/mockStore";

export async function GET(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Chưa đăng nhập quyền quản trị." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const albumId = searchParams.get("albumId");

  if (!albumId) {
    return NextResponse.json({ error: "Missing albumId parameter" }, { status: 400 });
  }

  try {
    if (process.env.DATABASE_URL) {
      // 1. Fetch album details
      const album = await prisma.album.findUnique({
        where: { id: albumId },
      });

      if (album) {
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
      }
    }
  } catch (error: any) {
    console.warn("DB error in selections GET, attempting dev fallback:", error);
  }

  // Fallback for custom local albums or sample album
  const album = getAlbumBySlugOrId(albumId);
  if (album) {
    // If it's duyen and no real selections yet, return dummy demo selections
    if (album.slug === "duyen" && getAllSelectionsForAlbum("duyen").length === 0) {
      const sample = getSampleAlbumData("duyen");
      const dummySelections = [
        {
          id: "sel-1",
          albumId: album.id,
          clientSessionId: "khach-hang-demo",
          photoId: sample?.photos?.[0]?.id || "sample-1",
          photoName: sample?.photos?.[0]?.name || "IMG_0001.JPG",
          isFavorite: true,
          isTicked: true,
          colorFlag: "red",
          updatedAt: new Date().toISOString(),
        },
        {
          id: "sel-2",
          albumId: album.id,
          clientSessionId: "khach-hang-demo",
          photoId: sample?.photos?.[1]?.id || "sample-2",
          photoName: sample?.photos?.[1]?.name || "IMG_0002.JPG",
          isFavorite: true,
          isTicked: false,
          colorFlag: "yellow",
          updatedAt: new Date().toISOString(),
        },
      ];

      return NextResponse.json({
        album,
        selections: dummySelections,
        groupedSelections: {
          "khach-hang-demo": dummySelections,
        },
      });
    }

    const { selections, groupedSelections } = getGroupedSelectionsForAlbum(album.slug, album.id);

    return NextResponse.json({
      album,
      selections,
      groupedSelections,
    });
  }

  return NextResponse.json({ error: "Album not found" }, { status: 404 });
}
