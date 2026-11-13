// Add new replay platform codes and matching SVGs here as Fortnite introduces them.
const iconByPlatform: Record<string, string> = {
  PC: 'pc', WIN: 'pc',
  PLAYSTATION: 'playstation', PSN: 'playstation', PS4: 'playstation', PS5: 'playstation',
  XBOX: 'xbox', XBL: 'xbox', XSX: 'xbox', XB1: 'xbox',
  SWITCH: 'switch', SWT: 'switch', SWT2: 'switch',
  ANDROID: 'android', AND: 'android',
  IOS: 'ios',
  AI: 'epic',
};

export function platformIcon(platform: string | null | undefined, isAI = false): string | null {
  const key = isAI ? 'AI' : String(platform || '').trim().toUpperCase();
  const name = iconByPlatform[key];
  return name ? `/assets/${name}.svg` : null;
}
