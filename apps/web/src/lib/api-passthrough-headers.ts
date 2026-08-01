export function apiPassthroughHeaders(
  headers: Headers,
): Record<string, string> {
  const contentType = headers.get("content-type");
  return contentType ? { "content-type": contentType } : {};
}
