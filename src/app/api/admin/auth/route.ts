import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import {
  getAdminCredentials,
  createSessionToken,
  verifySessionToken,
  AUTH_COOKIE_NAME,
} from "@/lib/auth";

// GET: Check current auth status
export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const result = verifySessionToken(token);

  if (result.valid) {
    return NextResponse.json({ authenticated: true, username: result.username });
  }

  return NextResponse.json({ authenticated: false }, { status: 401 });
}

// POST: Login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    const creds = getAdminCredentials();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu." },
        { status: 400 }
      );
    }

    if (username.trim() !== creds.username || password !== creds.password) {
      return NextResponse.json(
        { error: "Tên đăng nhập hoặc mật khẩu không chính xác!" },
        { status: 401 }
      );
    }

    // Credentials valid -> create token
    const token = createSessionToken(username.trim());

    const response = NextResponse.json({
      success: true,
      message: "Đăng nhập thành công!",
      username: creds.username,
    });

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: `Lỗi máy chủ: ${err.message}` },
      { status: 500 }
    );
  }
}

// DELETE: Logout
export async function DELETE() {
  const response = NextResponse.json({ success: true, message: "Đã đăng xuất" });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
