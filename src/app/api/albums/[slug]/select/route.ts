import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { updateLocalSelection, getAlbumBySlugOrId } from "@/lib/mockStore";
import { extractMaxSelections } from "@/lib/albumHelper";
import { supabase } from "@/lib/supabase";

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

    // 1. Fetch album from Supabase or Local
    let album: any = null;

    try {
      const { data: supaAlbum } = await supabase
        .from("Album")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (supaAlbum) album = supaAlbum;
    } catch (e) {
      console.warn("Supabase fetch album error:", e);
    }

    if (!album) {
      album = getAlbumBySlugOrId(slug);
      if (album) {
        // Ensure album exists in Supabase so foreign key constraints succeed
        try {
          await supabase.from("Album").upsert({
            id: album.id,
            title: album.title,
            slug: album.slug,
            driveFolderId: album.driveFolderId,
            password: album.password || null,
            expiresAt: album.expiresAt || null,
            logoUrl: album.logoUrl || null,
            bannerUrl: album.bannerUrl || null,
            allowDownloads: album.allowDownloads !== undefined ? album.allowDownloads : true,
            createdAt: album.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        } catch (e) {
          console.warn("Failed to auto-upsert album to Supabase:", e);
        }
      }
    }

    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    const localAlbum = getAlbumBySlugOrId(slug);
    const maxLimit = extractMaxSelections(album, localAlbum);

    // 2. Update local selection & check limit
    const localRes = updateLocalSelection(slug, sessionId, photoId, photoName, action, value, maxLimit);
    if (!localRes.success) {
      return NextResponse.json({ error: localRes.error }, { status: 400 });
    }

    // 3. Sync to Supabase
    try {
      if (!localRes.selection) {
        // Selection cleared -> remove from Supabase
        await supabase
          .from("Selection")
          .delete()
          .match({ albumId: album.id, clientSessionId: sessionId, photoId });
      } else {
        const now = new Date().toISOString();
        const selId = `sel_${album.id}_${sessionId}_${photoId}`.replace(/[^a-zA-Z0-9_-]/g, "_");

        const payload = {
          id: selId,
          albumId: album.id,
          clientSessionId: sessionId,
          photoId: photoId,
          photoName: photoName,
          isFavorite: !!localRes.selection.isFavorite,
          isTicked: !!localRes.selection.isTicked,
          colorFlag: localRes.selection.colorFlag || null,
          updatedAt: now,
        };

        const { error: supaErr } = await supabase
          .from("Selection")
          .upsert(payload, { onConflict: "albumId,clientSessionId,photoId" });

        if (supaErr) {
          console.error("[Select] Supabase selection upsert error:", supaErr);
        }
      }
    } catch (supaErr) {
      console.warn("Supabase selection sync error (saved locally):", supaErr);
    }

    return NextResponse.json({ message: "Selection updated", selection: localRes.selection });
  } catch (error: any) {
    console.error("Error updating photo selection:", error);
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message}` },
      { status: 500 }
    );
  }
}
