import { QUOTE_IMAGE_LIMITS, QuoteAttachment } from '../models/catalog.model';

let cachedWebpSupport: boolean | null = null;

function supportsWebpEncoding(): boolean {
  if (cachedWebpSupport !== null) return cachedWebpSupport;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;
    const url = canvas.toDataURL('image/webp', 0.8);
    cachedWebpSupport = url.startsWith('data:image/webp');
  } catch {
    cachedWebpSupport = false;
  }
  return cachedWebpSupport;
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb >= 100 ? Math.round(kb) : Number(kb.toFixed(1))} KB`;
  }
  const mb = kb / 1024;
  return `${Number(mb.toFixed(2))} MB`;
}

function isAllowedImageFile(file: File): boolean {
  const mime = (file.type || '').toLowerCase();
  if ((QUOTE_IMAGE_LIMITS.allowedMimeTypes as readonly string[]).includes(mime)) {
    return true;
  }
  const lowerName = (file.name || '').toLowerCase();
  return (
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.webp')
  );
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`No se pudo leer la imagen "${file.name}". Verifica que el archivo no esté dañado.`));
    };
    img.src = objectUrl;
  });
}

/**
 * Valida, redimensiona y comprime adaptativamente una imagen cargada por el usuario
 * garantizando que cumpla el presupuesto estricto de peso para localStorage, sincronización y PDF.
 */
export async function optimizeQuoteImage(
  file: File,
  maxAllowedBytes: number = QUOTE_IMAGE_LIMITS.maxSingleCompressedBytes,
): Promise<QuoteAttachment> {
  if (!isAllowedImageFile(file)) {
    throw new Error(
      `Formato no permitido en "${file.name}". Solo se aceptan imágenes JPG, PNG o WEBP.`,
    );
  }

  if (file.size <= 0) {
    throw new Error(`El archivo "${file.name}" está vacío.`);
  }

  if (file.size > QUOTE_IMAGE_LIMITS.maxRawFileBytes) {
    throw new Error(
      `"${file.name}" pesa ${formatFileSize(file.size)} y supera el máximo permitido de ${formatFileSize(QUOTE_IMAGE_LIMITS.maxRawFileBytes)} por imagen.`,
    );
  }

  const img = await loadImageFromFile(file);
  const srcWidth = img.naturalWidth || img.width;
  const srcHeight = img.naturalHeight || img.height;

  if (!srcWidth || !srcHeight) {
    throw new Error(`Dimensiones inválidas en la imagen "${file.name}".`);
  }

  const baseScale = Math.min(
    1,
    QUOTE_IMAGE_LIMITS.maxDimensionPx / Math.max(srcWidth, srcHeight),
  );
  const baseWidth = Math.max(1, Math.round(srcWidth * baseScale));
  const baseHeight = Math.max(1, Math.round(srcHeight * baseScale));

  const outputMime = supportsWebpEncoding() ? 'image/webp' : 'image/jpeg';
  const targetGoalBytes = Math.min(QUOTE_IMAGE_LIMITS.targetImageBytes, maxAllowedBytes);
  const hardCeilingBytes = Math.min(QUOTE_IMAGE_LIMITS.maxSingleCompressedBytes, maxAllowedBytes);

  const dimensionFactors = [1, 0.84, 0.7, 0.56];
  const qualitySteps = [0.78, 0.66, 0.54, 0.44];

  let bestCandidate: {
    dataUrl: string;
    width: number;
    height: number;
    sizeBytes: number;
  } | null = null;

  const canvas = document.createElement('canvas');

  try {
    outerLoop:
    for (const factor of dimensionFactors) {
      const targetW = Math.max(120, Math.round(baseWidth * factor));
      const targetH = Math.max(90, Math.round(baseHeight * factor));
      canvas.width = targetW;
      canvas.height = targetH;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('No fue posible inicializar el compresor gráfico del navegador.');
      }

      // Fondo blanco para preservar legibilidad en PNG con transparencia
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetW, targetH);

      for (const quality of qualitySteps) {
        const dataUrl = canvas.toDataURL(outputMime, quality);
        const sizeBytes = dataUrl.length; // Peso real serializado en JSON / localStorage

        if (!bestCandidate || sizeBytes < bestCandidate.sizeBytes) {
          bestCandidate = {
            dataUrl,
            width: targetW,
            height: targetH,
            sizeBytes,
          };
        }

        if (sizeBytes <= targetGoalBytes) {
          break outerLoop;
        }
      }
    }
  } finally {
    // Liberar memoria de canvas inmediatamente
    canvas.width = 0;
    canvas.height = 0;
  }

  if (!bestCandidate || bestCandidate.sizeBytes > hardCeilingBytes) {
    throw new Error(
      `No se pudo optimizar "${file.name}" dentro del presupuesto disponible (${formatFileSize(hardCeilingBytes)}). Prueba con una imagen más liviana o elimina otra imagen adjunta.`,
    );
  }

  return {
    id: 'att-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
    name: file.name,
    caption: '',
    dataUrl: bestCandidate.dataUrl,
    mimeType: outputMime,
    width: bestCandidate.width,
    height: bestCandidate.height,
    originalBytes: file.size,
    sizeBytes: bestCandidate.sizeBytes,
  };
}
