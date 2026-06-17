const HTML_ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

const HTML_ENTITY_REGEX = /[&<>"'/]/g;

export function sanitizeHtml(input: string): string {
  return input.replace(HTML_ENTITY_REGEX, (char) => HTML_ENTITY_MAP[char]);
}
