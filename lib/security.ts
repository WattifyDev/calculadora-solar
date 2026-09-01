import { rateLimit } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';

// Check if hostname is a subdomain of baseDomain
function isSubdomain(hostname: string, baseDomain: string): boolean {
    // Remove www. prefix from both for comparison
    const cleanHostname = hostname.replace(/^www\./, '');
    const cleanBaseDomain = baseDomain.replace(/^www\./, '');

    // If they're exactly the same, it's not a subdomain but an exact match
    if (cleanHostname === cleanBaseDomain) {
        return false;
    }

    // Check if hostname ends with the base domain preceded by a dot
    return cleanHostname.endsWith('.' + cleanBaseDomain);
}

/**
 * Validates the embed API key and origin domain.
 * Supports exact domain matches and subdomains.
 */
export async function validateEmbedApiKey(apiKey: string | null, origin: string | null): Promise<boolean> {
    if (!apiKey || !origin) return false;

    const apiSecretKey = process.env.API_SECRET_KEY;
    const expectedKey = process.env.NODE_ENV === 'development' ? (apiSecretKey || 'dev-api-key') : apiSecretKey;

    // Validate API key first
    if (apiKey !== expectedKey) {
        console.warn('[SECURITY] Invalid API key attempt');
        return false;
    }

    try {
        // Extract hostname from origin
        const originUrl = new URL(origin);
        const hostname = originUrl.hostname;
        const originWithPort = hostname === 'localhost' && originUrl.port ? `${hostname}:${originUrl.port}` : hostname;

        // In local development or for localhost, allow immediately without querying DB
        if (process.env.NODE_ENV === 'development' || hostname === 'localhost' || hostname === '127.0.0.1') {
            return true;
        }

        // Generate potential matching domains (exact, or parent domains for subdomain support)
        const domainParts = hostname.split('.');
        const potentialDomains = [];

        // Example: sub.domain.com -> ['sub.domain.com', 'domain.com']
        for (let i = 0; i < domainParts.length - 1; i++) {
            potentialDomains.push(domainParts.slice(i).join('.'));
        }

        potentialDomains.push(hostname);

        // Direct DB query for efficient lookup
        const matchingUser = await prisma.user.findFirst({
            where: {
                domain: { in: potentialDomains },
            },
            select: { id: true }
        });

        if (!matchingUser) {
            console.warn(`[SECURITY] Domain not authorized: ${hostname}`);
            return false;
        }

        return true;
    } catch (error) {
        console.error('[SECURITY] Error validating domain:', error);
        return process.env.NODE_ENV === 'development';
    }
}

// Rate limiting configuration
export const embedRateLimit = rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 500 // Max 500 unique IPs per interval
});