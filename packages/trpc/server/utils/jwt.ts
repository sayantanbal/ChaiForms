import jwt from "jsonwebtoken";
import { createHash, randomUUID } from "node:crypto";

const ACCESS_EXPIRY = "15m";
const REFRESH_EXPIRY = "30d";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters");
  }
  return secret;
}

export function signAccessJwt(
  userId: string,
  role: "creator" | "admin" = "creator",
): string {
  return jwt.sign({ sub: userId, role }, getJwtSecret(), {
    expiresIn: ACCESS_EXPIRY,
  });
}

export function verifyAccessJwt(token: string): {
  sub: string;
  role?: "creator" | "admin";
} {
  return jwt.verify(token, getJwtSecret()) as {
    sub: string;
    role?: "creator" | "admin";
  };
}

export function signRefreshJwt(userId: string, family: string): string {
  return jwt.sign({ sub: userId, family }, getJwtSecret(), {
    expiresIn: REFRESH_EXPIRY,
  });
}

export function verifyRefreshJwt(token: string): { sub: string; family: string } {
  return jwt.verify(token, getJwtSecret()) as { sub: string; family: string };
}

export function generateTokenId(): string {
  return randomUUID();
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function signUnlockToken(formId: string): string {
  return jwt.sign({ formId, purpose: "unlock" }, getJwtSecret(), {
    expiresIn: "1h",
  });
}

export function verifyUnlockToken(
  token: string,
  formId: string,
): boolean {
  try {
    const payload = jwt.verify(token, getJwtSecret()) as {
      formId?: string;
      purpose?: string;
    };
    return payload.purpose === "unlock" && payload.formId === formId;
  } catch {
    return false;
  }
}
