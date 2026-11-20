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
