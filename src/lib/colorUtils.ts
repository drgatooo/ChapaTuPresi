/**
 * Genera una paleta de colores estilo Tailwind (50-900) 
 * basándose en un color HEX central.
 */
export function getColorShades(hex: string): Record<string, string> {
  // 1. Limpiar el hex y convertir a RGB
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  // 2. Convertir RGB a HSL
  const rNorm = r / 255, gNorm = g / 255, bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm), min = Math.min(rNorm, gNorm, bNorm);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
      case gNorm: h = (bNorm - rNorm) / d + 2; break;
      case bNorm: h = (rNorm - gNorm) / d + 4; break;
    }
    h /= 6;
  }

  // 3. Definir los niveles de luminosidad típicos de Tailwind
  const steps: Record<string, number> = {
    50: 0.95, 100: 0.9, 200: 0.75, 300: 0.6, 400: 0.45,
    500: 0.35, 600: 0.25, 700: 0.15, 800: 0.1, 900: 0.05
  };

  const palette: Record<string, string> = {};

  // 4. Generar cada tono ajustando la luminosidad (L)
  Object.entries(steps).forEach(([key, newL]) => {
    palette[key] = hslToHex(h, s, newL);
  });

  return palette;
}

/**
 * Helper: Convierte HSL de vuelta a HEX
 */
function hslToHex(h: number, s: number, l: number): string {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const f = (t: number) => {
    t = t < 0 ? t + 1 : (t > 1 ? t - 1 : t);
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  const toHex = (n: number) => 
    Math.round(n * 255).toString(16).padStart(2, '0');

  return `#${toHex(f(h + 1/3))}${toHex(f(h))}${toHex(f(h - 1/3))}`;
}