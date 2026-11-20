export type ChannelName = string & { readonly __brand: 'ChannelName' };

const CHANNEL_PATTERN = /^(production|pr-[1-9]\d{0,6})$/;

export function parseChannelName(raw: unknown): ChannelName | null {
  return typeof raw === 'string' && CHANNEL_PATTERN.test(raw) ? (raw as ChannelName) : null;
}

export const BUILD_CHANNEL = 'production' as ChannelName;

export function prChannel(prNumber: number): ChannelName | null {
  return parseChannelName(`pr-${prNumber}`);
}

export function surfLink(channel: ChannelName): string {
  return `channelsurfing://surf?channel=${channel}`;
}

export const INITIAL_LAUNCH_PARAM = 'launch';

// The surf route as a full link (channelsurfing://surf?…, channelsurfing:///surf?…) or a path (/surf?…).
const SURF_PATH = /^(?:[a-z][a-z0-9+.-]*:\/\/)?\/?surf(?:[/?#]|$)/i;

// Tags the link that cold-started the app. Other paths pass through unchanged.
export function tagInitialSurfPath(path: string, initial: boolean): string {
  if (!initial || !SURF_PATH.test(path)) return path;
  return `${path}${path.includes('?') ? '&' : '?'}${INITIAL_LAUNCH_PARAM}=1`;
}
