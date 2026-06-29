import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import prisma from "@/lib/db";
import { listImagesInFolder } from "@/lib/drive";

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
    // 1. Fetch album
    const album = await prisma.album.findUnique({
      where: { slug },
    });

    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

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

    // 4. Fetch photos from Google Drive
    let photos = [];
    try {
      photos = await listImagesInFolder(album.driveFolderId);
    } catch (driveError: any) {
      console.error("Failed to list Google Drive files for album:", driveError);
      return NextResponse.json(
        { error: `Google Drive folder empty or inaccessible: ${driveError.message}` },
        { status: 502 }
      );
    }

    // 5. Get current client selections
    let selections: any[] = [];
    if (sessionId) {
      selections = await prisma.selection.findMany({
        where: {
          albumId: album.id,
          clientSessionId: sessionId,
        },
      });
    }

    // Create a map of photo selections for fast lookup
    const selectionMap = new Map<string, any>(
      selections.map((sel: any) => [
        sel.photoId,
        {
          isFavorite: sel.isFavorite,
          isTicked: sel.isTicked,
          colorFlag: sel.colorFlag,
        },
      ])
    );

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

    // Strip password from album object before sending to client
    const safeAlbum = {
      id: album.id,
      slug: album.slug,
      title: album.title,
      expiresAt: album.expiresAt,
      logoUrl: album.logoUrl,
      bannerUrl: album.bannerUrl,
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
