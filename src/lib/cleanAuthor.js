export function cleanAuthor(value) {
  return String(value || '').replace(/(?:\s*\[[0-9٠-٩۰-۹]+\])+\s*$/u, '').trim()
}
