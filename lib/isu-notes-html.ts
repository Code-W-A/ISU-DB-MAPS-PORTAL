export function isHtmlContent(content: string) {
  return /^\s*</.test(content)
}

export function htmlFromLegacyPlain(content: string) {
  const raw = content ?? ""
  if (!raw.trim()) return "<p></p>"
  if (isHtmlContent(raw)) return raw
  const escaped = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
  return escaped
    .split(/\n/)
    .map((line) => (line ? `<p>${line}</p>` : "<p></p>"))
    .join("")
}

export function plainTextFromHtml(content: string) {
  if (!content) return ""
  if (!isHtmlContent(content)) return content
  return content
    .replace(/<\/(p|div|h1|h2|li|blockquote|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim()
}
