

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|bmp|svg|ico|tiff?)(?:\?.*)?$/i;

const IMAGE_DOMAINS = [
  "utfs.io/f/",
  "ucarecdn.com/",
  "res.cloudinary.com/",
  "pbs.twimg.com/media/",
  "media.discordapp.net/attachments/",
  "cdn.discordapp.com/attachments/",
  "i.imgur.com/",
  "media.giphy.com/media/",
  "media0.giphy.com/media/",
  "media1.giphy.com/media/",
  "media2.giphy.com/media/",
  "media3.giphy.com/media/",
  "media4.giphy.com/media/",
  "cdn.jsdelivr.net/gh/twitter/twemoji",
];

export function isImageUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;

  if (!url.startsWith("http://") && !url.startsWith("https://")) return false;

  if (IMAGE_EXTENSIONS.test(url)) return true;

  return IMAGE_DOMAINS.some(domain => url.includes(domain));
}

export function extractImageUrls(text: string): string[] {
  if (!text || typeof text !== "string") return [];

  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
  const matches = text.match(urlRegex) || [];

  return matches.filter(isImageUrl);
}

export function getFirstImageUrl(text: string): string | null {
  const urls = extractImageUrls(text);
  return urls[0] || null;
}

export function hasImageUrls(text: string): boolean {
  return extractImageUrls(text).length > 0;
}
