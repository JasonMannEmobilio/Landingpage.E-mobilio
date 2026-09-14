import { PartnerConfig } from './types';
import React from 'react';

/**
 * Fonts loaded via next/font get a hashed family name, so a config value of
 * "Inter, sans-serif" would not match the loaded face. Map the families we bundle
 * onto their CSS variable; anything else is passed through as a plain system stack.
 */
const BUNDLED_FONTS: Record<string, string> = {
  inter: 'var(--font-inter), system-ui, -apple-system, "Segoe UI", sans-serif',
};

function resolveFontFamily(fontFamily: string): string {
  const first = fontFamily.split(',')[0].trim().replace(/['"]/g, '').toLowerCase();
  return BUNDLED_FONTS[first] ?? fontFamily;
}

export function getThemeVariables(theme: PartnerConfig['theme']): React.CSSProperties {
  return {
    '--color-primary': theme.primaryColor,
    '--color-accent': theme.accentColor,
    '--color-button': theme.buttonColor,
    '--color-button-text': theme.buttonTextColor,
    '--color-bg': theme.backgroundColor,
    '--font-family': resolveFontFamily(theme.fontFamily),
  } as React.CSSProperties;
}
