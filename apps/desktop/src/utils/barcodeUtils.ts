/**
 * Utilitários para Geração e Renderização de Códigos de Barras (Code-128 e EAN-13)
 * Gera elementos SVG limpos e vetoriais de alta nitidez para impressão térmica e A4.
 */

// Tabela de padrões Code 128 (Conjunto B - suporta ASCII 32 a 126)
const CODE128_PATTERNS: string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0-9
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10-19
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20-29
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30-39
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40-49
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', // 50-59
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', // 60-69
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', // 70-79
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', // 80-89
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', // 90-99
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112' // 100-106 (104=Start B, 106=Stop)
];

const START_B_INDEX = 104;
const STOP_INDEX = 106;

/**
 * Codifica uma string alfanumérica em padrão de larguras de barras e espaços Code-128B
 */
export function encodeCode128(text: string): string {
  if (!text) return '';
  const clean = text.trim();
  if (!clean) return '';

  const charCodes: number[] = [START_B_INDEX];
  let checksum = START_B_INDEX;

  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i) - 32;
    if (code >= 0 && code <= 95) {
      charCodes.push(code);
      checksum += code * (i + 1);
    }
  }

  const checkIndex = checksum % 103;
  charCodes.push(checkIndex);
  charCodes.push(STOP_INDEX);

  let patternStr = '';
  for (const idx of charCodes) {
    patternStr += CODE128_PATTERNS[idx] || '';
  }

  return patternStr;
}

/**
 * Gera os dados de retângulos (SVG paths / rects) para renderização do código de barras
 */
export function generateBarcodeSvgElements(
  text: string,
  options: {
    height?: number;
    barWidth?: number;
    showText?: boolean;
    fontSize?: number;
    textColor?: string;
    barColor?: string;
  } = {}
): {
  svgContent: string;
  totalWidth: number;
  height: number;
} {
  const {
    height = 36,
    barWidth = 1.6,
    showText = true,
    fontSize = 10,
    textColor = '#000000',
    barColor = '#000000',
  } = options;

  const pattern = encodeCode128(text);
  if (!pattern) {
    return { svgContent: '', totalWidth: 0, height };
  }

  let currentX = 0;
  let isBar = true;
  let rects = '';

  const textPadding = showText ? fontSize + 4 : 0;
  const barHeight = showText ? Math.max(12, height - textPadding) : height;
  const totalSvgHeight = barHeight + (showText ? textPadding : 0);

  for (let i = 0; i < pattern.length; i++) {
    const moduleCount = parseInt(pattern[i], 10);
    const width = moduleCount * barWidth;

    if (isBar) {
      rects += `<rect x="${currentX.toFixed(2)}" y="0" width="${width.toFixed(2)}" height="${barHeight}" fill="${barColor}" />`;
    }

    currentX += width;
    isBar = !isBar;
  }

  const totalWidth = currentX;

  let textElement = '';
  if (showText) {
    // textY posicionado com baseline no centro do padding inferior para nunca cortar os números
    const textY = barHeight + fontSize + 0.5;
    textElement = `<text x="${(totalWidth / 2).toFixed(2)}" y="${textY.toFixed(2)}" font-family="monospace, monospace" font-size="${fontSize}" font-weight="bold" fill="${textColor}" text-anchor="middle" letter-spacing="0.5" dominant-baseline="alphabetic">${text}</text>`;
  }

  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth.toFixed(2)} ${totalSvgHeight.toFixed(2)}" width="100%" height="${totalSvgHeight.toFixed(2)}" style="display:block; max-width: 100%; overflow: visible;">
      ${rects}
      ${textElement}
    </svg>
  `.trim();

  return {
    svgContent,
    totalWidth,
    height: totalSvgHeight,
  };
}

/**
 * Calcula o dígito verificador padrão EAN-13 (Módulo 10)
 */
export function calculateEan13Checksum(code12: string): number {
  const digits = code12.replace(/\D/g, '').padStart(12, '0').slice(0, 12);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = parseInt(digits[i], 10);
    sum += i % 2 === 0 ? d : d * 3;
  }
  const mod = sum % 10;
  return mod === 0 ? 0 : 10 - mod;
}

/**
 * Gera um código de barras numérico compacto de 9 dígitos baseado no código interno ou timestamp
 */
export function generateAutoBarcode(partCodeOrId?: string): string {
  if (partCodeOrId) {
    const numOnly = String(partCodeOrId).replace(/\D/g, '');
    if (numOnly.length > 0) {
      // Formata em exatamente 9 dígitos preenchendo com zeros à esquerda
      return numOnly.padStart(9, '0').slice(-9);
    }
  }

  // Gera número de 9 dígitos baseado no timestamp
  return String(Date.now()).slice(-9);
}

