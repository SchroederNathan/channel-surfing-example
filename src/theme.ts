import { useColorScheme } from 'react-native';

export type Variant = 'production' | 'pr';

const VARIANT_COLORS: Record<Variant, string> = {
  production: '#208AEF',
  pr: '#D9480F',
};

export function variantColor(variant: Variant): string {
  return VARIANT_COLORS[variant];
}

const PALETTES = {
  light: {
    background: '#F2F2F7',
    card: '#FFFFFF',
    text: '#111111',
    muted: '#6B6B73',
    border: '#D8D8DE',
    danger: '#C92A2A',
  },
  dark: {
    background: '#000000',
    card: '#1C1C1E',
    text: '#F2F2F7',
    muted: '#9A9AA2',
    border: '#38383C',
    danger: '#FF6B6B',
  },
};

export type Palette = (typeof PALETTES)['light'];

export function usePalette(): Palette {
  return PALETTES[useColorScheme() === 'dark' ? 'dark' : 'light'];
}
