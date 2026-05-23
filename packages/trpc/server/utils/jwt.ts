import jwt from "jsonwebtoken";

const EXPIRY = "7d";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters");
  }
  return secret;
}

export function signJwt(userId: string): string {
  return jwt.sign({ sub: userId }, getJwtSecret(), { expiresIn: EXPIRY });
}

export function verifyJwt(token: string): { sub: string } {
  return jwt.verify(token, getJwtSecret()) as { sub: string };
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
