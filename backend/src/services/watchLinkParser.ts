import * as cheerio from "cheerio";

const TELEKOM_HINTS = ["telekom.de", "magenta-tv", "magenta sport"];
const ARD_HINTS = ["ardmediathek.de", "ard.de"];
const ZDF_HINTS = ["zdf.de"];

function normalizeUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `https://www.fifa.com${url}`;
  return url;
}

function hasAnyHint(input: string, hints: string[]): boolean {
  const text = input.toLowerCase();
  return hints.some((hint) => text.includes(hint));
}

export function parseWatchLinksFromHtml(html: string): {
  telekomUrl: string;
  ardUrl: string;
  zdfUrl: string;
} {
  const $ = cheerio.load(html);

  let telekomUrl = "";
  let ardUrl = "";
  let zdfUrl = "";

  $("a[href]").each((_, element) => {
    const href = normalizeUrl($(element).attr("href") ?? "");
    if (!href) return;

    const context = [
      href,
      $(element).text(),
      $(element).attr("aria-label") ?? "",
      $(element).attr("title") ?? "",
      $(element).closest("section,div").text(),
    ]
      .join(" ")
      .toLowerCase();

    if (!telekomUrl && hasAnyHint(context, TELEKOM_HINTS)) {
      telekomUrl = href;
      return;
    }

    if (!ardUrl && hasAnyHint(context, ARD_HINTS)) {
      ardUrl = href;
      return;
    }

    if (!zdfUrl && hasAnyHint(context, ZDF_HINTS)) {
      zdfUrl = href;
    }
  });

  return {
    telekomUrl,
    ardUrl,
    zdfUrl,
  };
}
