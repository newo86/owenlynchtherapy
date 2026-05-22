export const colors = {
  deepForest: '#2A4D3C',
  forestGreen: '#2D5A42',
  sage: '#4F8A68',
  terracotta: '#C85A1A',
  terracottaDark: '#A64810',
  gold: '#D4A843',
  linen: '#F5F0E8',
  linenDark: '#EDE8DF',
  white: '#FFFFFF',
  mutedText: '#888888',
  bodyText: '#1a1a1a',
} as const;

// @react-pdf/renderer ships with the 14 standard PDF fonts. Helvetica
// is the closest clean fallback for Avenir/Montserrat. To use anything
// else we'd have to register custom fonts and ship the .ttf files.
export const fonts = {
  heading: 'Helvetica-Bold',
  body: 'Helvetica',
  italic: 'Helvetica-Oblique',
} as const;
