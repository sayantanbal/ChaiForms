import { createHash } from "node:crypto";
import { UAParser } from "ua-parser-js";
import type { ClientContextSchema } from "@repo/schemas";

export type ParsedClientContext = {
  ipAddress: string | null;
  userAgent: string | null;
  deviceFingerprint: string;
  deviceType: string;
  osName: string | null;
  osVersion: string | null;
  browserName: string | null;
  browserVersion: string | null;
  deviceVendor: string | null;
  deviceModel: string | null;
  latitude: number | null;
  longitude: number | null;
  geoCountry: string | null;
  geoRegion: string | null;
  geoCity: string | null;
};

export function getClientIp(req: {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
}): string | null {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim() ?? null;
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(",")[0]?.trim() ?? null;
  }
  return req.ip ?? null;
}

export function buildDeviceFingerprint(
  userAgent: string,
  parser: UAParser,
): string {
  const result = parser.getResult();
  const payload = JSON.stringify({
    ua: userAgent,
    device: result.device,
    os: result.os,
    browser: result.browser,
    cpu: result.cpu,
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 64);
}

export function parseClientContext(
  req: {
    ip?: string;
    headers: Record<string, string | string[] | undefined>;
  },
  clientContext?: ClientContextSchema,
): ParsedClientContext {
  const userAgent =
    typeof req.headers["user-agent"] === "string"
      ? req.headers["user-agent"]
      : null;
  const parser = new UAParser(userAgent ?? undefined);
  const result = parser.getResult();

  const deviceType =
    result.device.type ??
    (result.os.name?.toLowerCase().includes("mobile") ? "mobile" : "desktop");

  const fingerprint = buildDeviceFingerprint(userAgent ?? "", parser);

  return {
    ipAddress: getClientIp(req),
    userAgent,
    deviceFingerprint: fingerprint,
    deviceType,
    osName: result.os.name ?? null,
    osVersion: result.os.version ?? null,
    browserName: result.browser.name ?? null,
    browserVersion: result.browser.version ?? null,
    deviceVendor: result.device.vendor ?? null,
    deviceModel: result.device.model ?? null,
    latitude: clientContext?.geo?.latitude ?? null,
    longitude: clientContext?.geo?.longitude ?? null,
    geoCountry: null,
    geoRegion: null,
    geoCity: null,
  };
}

export function buildRateLimitKey(
  ip: string | null,
  deviceFingerprint: string,
): string {
  return `${ip ?? "unknown"}:${deviceFingerprint}`;
}
