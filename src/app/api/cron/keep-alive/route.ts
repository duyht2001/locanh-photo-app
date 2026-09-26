import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Truy vấn nhẹ nhàng 1 bản ghi để Supabase ghi nhận database đang hoạt động (chống sleep / auto-pause)
    const { data, error } = await supabase
      .from("Album")
      .select("id, title")
      .limit(1);

    if (error) {
      console.warn("[Keep-Alive] Supabase ping warning:", error.message);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Supabase pinged successfully! Project will stay active.",
      timestamp: new Date().toISOString(),
      albumCountSample: data?.length || 0,
    });
  } catch (err: any) {
    console.error("[Keep-Alive] Exception:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
