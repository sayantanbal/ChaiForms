/** Strip HTML tags and normalize whitespace for stored user text. */
export function sanitizeText(dirty: string): string {
  return dirty
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim();
}
