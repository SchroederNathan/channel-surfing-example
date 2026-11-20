export type Show = { readonly number: number; readonly name: string };

export const LINEUP: readonly Show[] = [
  { number: 2, name: 'Dawn Patrol' },
  { number: 4, name: 'Reef Report' },
  { number: 7, name: 'Tide Tables Live' },
  { number: 9, name: 'Big Wave Classics' },
  { number: 11, name: 'Board Shop Hour' },
];

// The remote wraps past either end of the lineup, like a TV.
export function stepChannel(index: number, delta: 1 | -1): number {
  return (index + delta + LINEUP.length) % LINEUP.length;
}

export type TuneResult = { ok: true; index: number } | { ok: false; message: string };

export function tuneTo(input: string): TuneResult {
  const trimmed = input.trim();
  if (!/^\d{1,3}$/.test(trimmed)) return { ok: false, message: 'Enter a channel number.' };
  const number = Number(trimmed);
  const index = LINEUP.findIndex((show) => show.number === number);
  return index === -1 ? { ok: false, message: `Channel ${number} is off the air.` } : { ok: true, index };
}

export function toggleFavorite(favorites: readonly number[], number: number): number[] {
  return favorites.includes(number)
    ? favorites.filter((favorite) => favorite !== number)
    : [...favorites, number].sort((a, b) => a - b);
}
