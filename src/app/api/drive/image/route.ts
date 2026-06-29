import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getFileStream } from "@/lib/drive";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("fileId");

  if (!fileId) {
    return NextResponse.json({ error: "Missing fileId" }, { status: 400 });
  }

  try {
    const { stream, headers } = await getFileStream(fileId);

    // Convert node stream to Web stream if necessary, or pass directly
    // Next.js Response handles Readable stream from Node.js in API routes
    return new Response(stream as any, {
      headers: {
        "Content-Type": headers["content-type"] || "image/jpeg",
        "Content-Length": headers["content-length"] || "",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: any) {
    console.error("Error proxying image:", error);
    return NextResponse.json(
      { error: `Failed to fetch image: ${error.message}` },
      { status: 500 }
    );
  }
}
