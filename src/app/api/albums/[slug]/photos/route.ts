import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { listImagesInFolder } from "@/lib/drive";
import { supabase } from "@/lib/supabase";
import { getSampleAlbumData, getLocalSelections, getAlbumBySlugOrId } from "@/lib/mockStore";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");
  const password = searchParams.get("password") || request.headers.get("x-album-password") || "";
  const isAdmin = searchParams.get("isAdmin") === "true";

  if (!slug) {
    return NextResponse.json({ error: "Missing album slug" }, { status: 400 });
  }

  try {
    // 1. Fetch album from Supabase or Local
    let album: any = null;

    try {
      const { data: supaAlbum, error } = await supabase
        .from("Album")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (!error && supaAlbum) {
        album = supaAlbum;
      }
    } catch (e) {
      console.warn("Supabase album fetch error:", e);
    }

    if (!album) {
      album = getAlbumBySlugOrId(slug);
    }

    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    // Merge maxSelections from local if Supabase doesn't have the column yet
    const localAlbum = getAlbumBySlugOrId(slug);
    const maxSelections = album.maxSelections ?? localAlbum?.maxSelections ?? null;

    // 2. Check Expiration
    if (album.expiresAt && new Date() > new Date(album.expiresAt) && !isAdmin) {
      return NextResponse.json(
        { error: "Album has expired. Please contact the photographer." },
        { status: 403 }
      );
    }

    // 3. Password Verification
    if (album.password && album.password !== password && !isAdmin) {
      return NextResponse.json(
        { error: "Password required or incorrect", isPasswordProtected: true },
        { status: 401 }
      );
    }

    // 4. Fetch photos (from sample if duyen without folder, or from Google Drive)
    let photos: any[] = [];
    const sample = getSampleAlbumData(slug);
    if (slug === "duyen" && sample && sample.photos && (!album.driveFolderId || album.driveFolderId === "sample-folder-id")) {
      photos = sample.photos;
    } else {
      try {
        photos = await listImagesInFolder(album.driveFolderId);
      } catch (driveError: any) {
        console.error("Failed to list Google Drive files for album:", driveError);
        return NextResponse.json(
          { error: `Không thể đọc ảnh từ Google Drive: ${driveError.message}` },
          { status: 502 }
        );
      }
    }

    // 5. Get current client selections
    let selectionMap = new Map<string, any>();
    if (sessionId) {
      // Try Supabase first
      try {
        const { data: supaSels } = await supabase
          .from("Selection")
          .select("*")
          .eq("albumId", album.id)
          .eq("clientSessionId", sessionId);

        if (supaSels && supaSels.length > 0) {
          selectionMap = new Map(
            supaSels.map((sel: any) => [
              sel.photoId,
              {
                isFavorite: sel.isFavorite,
                isTicked: sel.isTicked,
                colorFlag: sel.colorFlag,
              },
            ])
          );
        }
      } catch (e) {
        console.warn("Supabase selection fetch error:", e);
      }

      // Fallback to local
      if (selectionMap.size === 0) {
        const localSelections = getLocalSelections(album.slug, sessionId);
        selectionMap = new Map(
          localSelections.map((sel) => [
            sel.photoId,
            {
              isFavorite: sel.isFavorite,
              isTicked: sel.isTicked,
              colorFlag: sel.colorFlag,
            },
          ])
        );
      }
    }

    // Merge selections into photos
    const photosWithSelections = photos.map((photo) => {
      const selection = selectionMap.get(photo.id);
      return {
        ...photo,
        isFavorite: selection?.isFavorite || false,
        isTicked: selection?.isTicked || false,
        colorFlag: selection?.colorFlag || null,
      };
    });

    const safeAlbum = {
      id: album.id,
      slug: album.slug,
      title: album.title,
      expiresAt: album.expiresAt,
      logoUrl: album.logoUrl || "/logo.jpg",
      bannerUrl: album.bannerUrl,
      allowDownloads: album.allowDownloads,
      maxSelections: maxSelections,
      isPasswordProtected: !!album.password,
    };

    return NextResponse.json({
      album: safeAlbum,
      photos: photosWithSelections,
    });
  } catch (error: any) {
    console.error("Error fetching album photos:", error);
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message}` },
      { status: 500 }
    );
  }
}
