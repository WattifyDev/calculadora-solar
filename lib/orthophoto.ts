import sharp from 'sharp';
import { LRUCache } from 'lru-cache';
import { Buffer } from 'buffer';

// Disable sharp's internal cache to save memory in production
sharp.cache(false);

// Create a cache for converted images (max 50 images, 1 hour TTL)
const imageCache = new LRUCache<string, Buffer>({
    max: 50,
    ttl: 1000 * 60 * 60, // 1 hour
});

/**
 * Converts a TIFF URL to a PNG buffer.
 * Calls the Google API internally and converts on the fly.
 */
export async function convertTiffToPng(tiffUrl: string): Promise<Buffer | null> {
    try {
        // Check cache first
        const cachedPng = imageCache.get(tiffUrl);
        if (cachedPng) {
            console.log('[ORTHOPHOTO] Returning cached PNG util for:', tiffUrl);
            return cachedPng;
        }

        console.log('[ORTHOPHOTO] Util: Converting TIFF to PNG:', tiffUrl);

        // Capture API key from env internally to keep it secret
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        const urlWithKey = tiffUrl.includes('key=') ? tiffUrl : `${tiffUrl}${tiffUrl.includes('?') ? '&' : '?'}key=${apiKey}`;

        const response = await fetch(urlWithKey);
        if (!response.ok) {
            console.error('[ORTHOPHOTO] Util: Failed to fetch TIFF:', response.status, response.statusText);
            return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const pngBuffer = await sharp(buffer)
            .resize(800, 800, {
                fit: 'fill'
            })
            .png({
                compressionLevel: 9,
                quality: 80,
                progressive: true
            })
            .toBuffer();

        imageCache.set(tiffUrl, pngBuffer);
        return pngBuffer;
    } catch (error) {
        console.error('[ORTHOPHOTO] Util: Error in conversion:', error);
        return null;
    }
}
