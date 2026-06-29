import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import prisma from "@/lib/db";
import { generateSlug } from "@/lib/utils";
import { getFolderMetadata } from "@/lib/drive";

function extractFolderId(input: string): string {
  const trimmed = input.trim();
  if (trimmed.includes("drive.google.com")) {
    const match = trimmed.match(/\/folders\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) return match[1];
    
    const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9-_]+)/);
    if (idMatch && idMatch[1]) return idMatch[1];
  }
  return trimmed;
}

// GET: List all albums with selection counts
export async function GET() {
  try {
    const albums = await prisma.album.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { selections: true },
        },
      },
    });
    return NextResponse.json(albums);
  } catch (error: unknown) {
    console.error("GET albums error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to fetch albums: ${message}` },
      { status: 500 }
    );
  }
}

// POST: Create a new album
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, driveFolderId, password, expiresAt, logoUrl, bannerUrl } = body;

    if (!title || !driveFolderId) {
      return NextResponse.json(
        { error: "Title and Google Drive Folder ID are required." },
        { status: 400 }
      );
    }

    const cleanFolderId = extractFolderId(driveFolderId);

    // 1. Validate Google Drive folder
    try {
      await getFolderMetadata(cleanFolderId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        {
          error: `Google Drive Folder validation failed: ${message}. Make sure the folder exists and is shared with your Service Account email.`,
        },
        { status: 400 }
      );
    }

    // 2. Generate a unique slug
    let slug = generateSlug(title);
    const originalSlug = slug;
    let slugExists = await prisma.album.findUnique({ where: { slug } });
    let counter = 1;

    while (slugExists) {
      slug = `${originalSlug}-${counter}`;
      slugExists = await prisma.album.findUnique({ where: { slug } });
      counter++;
    }

    // 3. Create album in DB
    const album = await prisma.album.create({
      data: {
        title,
        slug,
        driveFolderId: cleanFolderId,
        password: password || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        logoUrl: logoUrl || null,
        bannerUrl: bannerUrl || null,
      },
    });

    return NextResponse.json(album, { status: 201 });
  } catch (error: unknown) {
    console.error("POST album error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to create album: ${message}` },
      { status: 500 }
    );
  }
}

// PUT: Update an existing album
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, driveFolderId, password, expiresAt, logoUrl, bannerUrl } = body;

    if (!id) {
      return NextResponse.json({ error: "Album ID is required for update." }, { status: 400 });
    }

    // Find existing album
    const existing = await prisma.album.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Album not found." }, { status: 404 });
    }

    const cleanFolderId = driveFolderId ? extractFolderId(driveFolderId) : existing.driveFolderId;

    // If folder changed, validate new folder
    if (driveFolderId && cleanFolderId !== existing.driveFolderId) {
      try {
        await getFolderMetadata(cleanFolderId);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json(
          {
            error: `Google Drive Folder validation failed: ${message}. Make sure the folder is shared with your Service Account.`,
          },
          { status: 400 }
        );
      }
    }

    // Update album
    const updatedAlbum = await prisma.album.update({
      where: { id },
      data: {
        title: title !== undefined ? title : existing.title,
        driveFolderId: driveFolderId !== undefined ? cleanFolderId : existing.driveFolderId,
        password: password !== undefined ? (password || null) : existing.password,
        expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : existing.expiresAt,
        logoUrl: logoUrl !== undefined ? logoUrl : existing.logoUrl,
        bannerUrl: bannerUrl !== undefined ? bannerUrl : existing.bannerUrl,
      },
    });

    return NextResponse.json(updatedAlbum);
  } catch (error: unknown) {
    console.error("PUT album error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to update album: ${message}` },
      { status: 500 }
    );
  }
}

// DELETE: Remove an album (selections will cascade delete)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Album ID is required." }, { status: 400 });
    }

    await prisma.album.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Album deleted successfully" });
  } catch (error: unknown) {
    console.error("DELETE album error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to delete album: ${message}` },
      { status: 500 }
    );
  }
}
