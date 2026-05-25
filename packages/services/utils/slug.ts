import { nanoid } from "nanoid";

export function generateSlug(): string {
  return nanoid(12)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
}
