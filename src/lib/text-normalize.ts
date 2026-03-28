const ESCAPED_TEXT_PATTERN =
  /\\\\(?=u(?:\{[0-9a-fA-F]+\}|[0-9a-fA-F]{4})|[nrt"'\\])|\\u(?:\{[0-9a-fA-F]+\}|[0-9a-fA-F]{4})|\\[nrt"'\\]/;

function decodeUnicodeEscape(match: string, hex: string) {
  try {
    if (match.startsWith("\\u{")) {
      return String.fromCodePoint(Number.parseInt(hex, 16));
    }

    return String.fromCharCode(Number.parseInt(hex, 16));
  } catch {
    return match;
  }
}

export function decodeEscapedText(value: string | null | undefined): string {
  if (typeof value !== "string" || !ESCAPED_TEXT_PATTERN.test(value)) {
    return typeof value === "string" ? value : "";
  }

  let normalized = value;

  for (let pass = 0; pass < 2; pass += 1) {
    const next = normalized
      .replace(/\\\\(?=u(?:\{[0-9a-fA-F]+\}|[0-9a-fA-F]{4})|[nrt"'\\])/g, "\\")
      .replace(/\\u\{([0-9a-fA-F]+)\}/g, (match, hex: string) =>
        decodeUnicodeEscape(match, hex),
      )
      .replace(/\\u([0-9a-fA-F]{4})/g, (match, hex: string) =>
        decodeUnicodeEscape(match, hex),
      )
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, "\\");

    if (next === normalized) {
      break;
    }

    normalized = next;
  }

  return normalized;
}

export function decodeEscapedObjectStrings<T>(value: T): T {
  if (typeof value === "string") {
    return decodeEscapedText(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => decodeEscapedObjectStrings(entry)) as T;
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, decodeEscapedObjectStrings(entry)]),
  ) as T;
}
