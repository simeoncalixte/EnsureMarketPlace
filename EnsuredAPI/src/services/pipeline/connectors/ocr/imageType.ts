/**
 * Detect raster image formats by magic bytes. Returns the MIME type so the
 * image-OCR providers (Gemini vision / Tesseract) can be handed the right
 * content type, or null when the buffer is not a recognized image.
 */
export function imageMimeType(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png';
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  // GIF: "GIF87a" / "GIF89a"
  if (buffer.subarray(0, 3).toString('latin1') === 'GIF') return 'image/gif';
  // BMP: "BM"
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) return 'image/bmp';
  // TIFF: "II*\0" (little-endian) or "MM\0*" (big-endian)
  if (
    (buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2a && buffer[3] === 0x00) ||
    (buffer[0] === 0x4d && buffer[1] === 0x4d && buffer[2] === 0x00 && buffer[3] === 0x2a)
  ) {
    return 'image/tiff';
  }
  // WEBP: "RIFF" .... "WEBP"
  if (buffer.subarray(0, 4).toString('latin1') === 'RIFF' && buffer.subarray(8, 12).toString('latin1') === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

/** Whether a buffer looks like a raster image we can OCR. */
export function isImage(buffer: Buffer): boolean {
  return imageMimeType(buffer) !== null;
}
