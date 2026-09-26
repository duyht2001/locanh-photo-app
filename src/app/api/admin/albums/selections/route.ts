import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { verifyAdminAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
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
    // 1. Try Supabase
    let supaAlbum: any = null;
    const { data: aData } = await supabase
      .from("Album")
      .select("*")
      .or(`id.eq.${albumId},slug.eq.${albumId}`)
      .maybeSingle();

    if (aData) supaAlbum = aData;

    if (supaAlbum) {
      const { data: supaSels } = await supabase
        .from("Selection")
        .select("*")
        .eq("albumId", supaAlbum.id)
        .order("updatedAt", { ascending: false });

      if (supaSels && supaSels.length > 0) {
        const groupedSelections: { [sessionId: string]: typeof supaSels } = {};
        for (const sel of supaSels) {
          if (!groupedSelections[sel.clientSessionId]) {
            groupedSelections[sel.clientSessionId] = [];
          }
          groupedSelections[sel.clientSessionId].push(sel);
        }

        return NextResponse.json({
          album: supaAlbum,
          selections: supaSels,
          groupedSelections,
        });
      }
    }
  } catch (error: any) {
    console.warn("Supabase selections fetch error:", error);
  }

  // 2. Fallback to local store or sample data
  const album = getAlbumBySlugOrId(albumId);
  if (album) {
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
