import crypto from "crypto";
import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";

const AUTH_COOKIE_NAME = "to_admin_token";
const SECRET_KEY = process.env.ADMIN_JWT_SECRET || "tostudio-super-secret-key-2026";
const CREDENTIALS_FILE = path.join(process.cwd(), "prisma", "admin-credentials.json");

export function getAdminCredentials() {
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      let content = fs.readFileSync(CREDENTIALS_FILE, "utf-8");
      if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
      const data = JSON.parse(content);
      if (data && data.password) {
        return {
          username: data.username || process.env.ADMIN_USERNAME || "admin",
          password: data.password,
        };
      }
    }
  } catch (err) {
    console.error("Error reading admin credentials file:", err);
  }

  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "tostudio2026";
  return { username, password };
}

export function updateAdminPassword(newPassword: string) {
  const current = getAdminCredentials();
  const data = {
    username: current.username,
    password: newPassword,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(data, null, 2), "utf-8");
  return data;
}

// Generate a signed session token
export function createSessionToken(username: string): string {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const payload = Buffer.from(JSON.stringify({ username, expiresAt })).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

// Verify session token
export function verifySessionToken(token?: string | null): { valid: boolean; username?: string } {
  if (!token) return { valid: false };

  const parts = token.split(".");
  if (parts.length !== 2) return { valid: false };

  const [payload, signature] = parts;
  const expectedSig = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(payload)
    .digest("base64url");

  if (signature !== expectedSig) return { valid: false };

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    if (Date.now() > data.expiresAt) return { valid: false };
    return { valid: true, username: data.username };
  } catch {
    return { valid: false };
  }
}

// Check admin authentication from NextRequest
export function verifyAdminAuth(request: NextRequest): boolean {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  return verifySessionToken(token).valid;
}

export { AUTH_COOKIE_NAME };
