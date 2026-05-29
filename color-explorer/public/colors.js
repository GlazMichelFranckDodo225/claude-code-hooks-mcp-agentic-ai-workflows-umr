// 20 handpicked, aesthetically pleasing colors spread across the spectrum.
// RGB and HSL are computed in the browser from these hex values.
const COLORS = [
  { name: 'Coral Sunset',   hex: '#FF6B6B' },
  { name: 'Tangerine Glow', hex: '#FF9F1C' },
  { name: 'Golden Hour',    hex: '#FFD166' },
  { name: 'Lemon Zest',     hex: '#FFE066' },
  { name: 'Mint Breeze',    hex: '#06D6A0' },
  { name: 'Emerald Forest', hex: '#2A9D8F' },
  { name: 'Sea Glass',      hex: '#83C5BE' },
  { name: 'Sky Lagoon',     hex: '#48CAE4' },
  { name: 'Ocean Deep',     hex: '#0077B6' },
  { name: 'Royal Indigo',   hex: '#4361EE' },
  { name: 'Twilight Blue',  hex: '#3A0CA3' },
  { name: 'Amethyst Haze',  hex: '#7209B7' },
  { name: 'Orchid Bloom',   hex: '#B5179E' },
  { name: 'Rose Quartz',    hex: '#F72585' },
  { name: 'Blush Petal',    hex: '#FFAFCC' },
  { name: 'Lavender Mist',  hex: '#CDB4DB' },
  { name: 'Terracotta',     hex: '#E76F51' },
  { name: 'Sandstone',      hex: '#E9C46A' },
  { name: 'Slate Storm',    hex: '#264653' },
  { name: 'Graphite Night', hex: '#22223B' },
];

// Exposed globally for app.js (no module system on the static frontend).
window.COLORS = COLORS;
