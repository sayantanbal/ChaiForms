/** Strip HTML tags for safe text display (matches server-side sanitize). */
export function sanitizeText(dirty: string): string {
  return dirty
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim();
}

export function sanitizeHtml(dirty: string): string {
  return sanitizeText(dirty);
}
