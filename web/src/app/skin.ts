export function skinUrl(skin: string | null | undefined, isBot = false): string {
  if (skin && /^[A-Za-z0-9_-]{1,128}$/.test(skin))
    return `/assets/skins/${skin}.png`;
  return `/assets/skins/${isBot ? 'epic' : 'sniper'}.png`;
}

export function skinFallback(event: Event, isBot = false): void {
  const image = event.target as HTMLImageElement;
  const fallback = `/assets/skins/${isBot ? 'epic' : 'sniper'}.png`;
  if (!image.src.endsWith(fallback)) image.src = fallback;
}
