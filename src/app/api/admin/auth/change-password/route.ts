import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import {
  getAdminCredentials,
  updateAdminPassword,
  verifyAdminAuth,
  createSessionToken,
  AUTH_COOKIE_NAME,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Chưa đăng nhập quyền quản trị." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới." },
        { status: 400 }
      );
    }

    const creds = getAdminCredentials();

    if (currentPassword !== creds.password) {
      return NextResponse.json(
        { error: "Mật khẩu hiện tại không chính xác!" },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "Mật khẩu mới và xác nhận mật khẩu không khớp!" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Mật khẩu mới phải có ít nhất 6 ký tự!" },
        { status: 400 }
      );
    }

    // Save new password
    updateAdminPassword(newPassword);

    // Refresh token
    const token = createSessionToken(creds.username);
    const response = NextResponse.json({
      success: true,
      message: "Đổi mật khẩu quản trị thành công!",
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (err: any) {
    console.error("Change password error:", err);
    return NextResponse.json(
      { error: `Lỗi máy chủ: ${err.message}` },
      { status: 500 }
    );
  }
}
