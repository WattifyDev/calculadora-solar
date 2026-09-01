import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Helper function to extract hostname from origin URL
function getHostnameFromOrigin(origin: string): string | null {
    try {
        const url = new URL(origin);
        // For localhost, include the port
        if (url.hostname === 'localhost' && url.port) {
            return `${url.hostname}:${url.port}`;
        }
        return url.hostname;
    } catch {
        return null;
    }
}

// Helper function to check if a hostname matches a domain (including subdomains)
function isSubdomainOf(hostname: string, domain: string): boolean {
    // For localhost, we need exact match including port
    if (hostname.startsWith('localhost') || domain.startsWith('localhost')) {
        return hostname === domain;
    }

    // For regular domains, handle subdomains
    const cleanHostname = hostname.replace(/^www\./, '');
    const cleanDomain = domain.replace(/^www\./, '');
    return cleanHostname === cleanDomain || cleanHostname.endsWith('.' + cleanDomain);
}

async function getCorsHeaders(origin: string | null) {
    const headers = new Headers();

    // Always set these headers
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version, Referer');
    headers.set('Access-Control-Allow-Credentials', 'true');

    if (!origin) return headers;

    const hostname = getHostnameFromOrigin(origin);
    const isLocal = hostname && (hostname.startsWith('localhost') || hostname.startsWith('127.0.0.1') || process.env.NODE_ENV === 'development');

    if (isLocal) {
        headers.set('Access-Control-Allow-Origin', origin);
        return headers;
    }

    try {
        const usersWithDomains = await prisma.user.findMany({
            where: {
                domain: {
                    not: null
                }
            },
            select: { domain: true }
        });

        const isAllowed = hostname && usersWithDomains.some(user =>
            user.domain && isSubdomainOf(hostname, user.domain)
        );

        if (isAllowed) {
            headers.set('Access-Control-Allow-Origin', origin);
        } else {
            console.warn(`CORS: Unauthorized origin attempt: ${origin} (hostname: ${hostname})`);
        }
    } catch (error) {
        console.error('Error checking user domains for CORS (allowing local):', error);
        if (isLocal) {
            headers.set('Access-Control-Allow-Origin', origin);
        }
    }

    return headers;
}

export async function OPTIONS(request: Request) {
    const origin = request.headers.get('origin');
    const headers = await getCorsHeaders(origin);
    return new NextResponse(null, { status: 204, headers });
}

export async function GET(request: Request) {
    const origin = request.headers.get('origin');
    const corsHeaders = await getCorsHeaders(origin);

    try {
        const referer = request.headers.get('referer');
        if (!referer) {
            return NextResponse.json(
                { error: 'Referer header is missing. Cannot authorize domain.' },
                { status: 400, headers: corsHeaders }
            );
        }

        let hostname: string;
        let url: URL;
        try {
            url = new URL(referer);
            // For localhost, include port in the hostname
            hostname = url.hostname === 'localhost' && url.port ? `${url.hostname}:${url.port}` : url.hostname;
        } catch (error) {
            return NextResponse.json(
                { error: 'Invalid Referer header format.' },
                { status: 400, headers: corsHeaders }
            );
        }

        const mapsApiKeyFromEnv = process.env.GOOGLE_MAPS_API_KEY;
        if (!mapsApiKeyFromEnv) {
            console.error('CRITICAL: GOOGLE_MAPS_API_KEY is not set in the environment variables.');
            return NextResponse.json(
                { error: 'Server configuration error: Maps API key is missing.' },
                { status: 500, headers: corsHeaders }
            );
        }

        const isLocalhost = hostname.startsWith('localhost') || hostname.startsWith('127.0.0.1');

        // Find user with matching domain (safely handles DB offline in local dev)
        let user = null;
        try {
            const users = await prisma.user.findMany({
                where: { domain: { not: null } }
            });

            user = users.find(u => {
                if (!u.domain) return false;

                if (u.domain.startsWith('localhost')) {
                    return hostname === u.domain;
                }

                const cleanHostname = hostname.replace(/^www\./, '');
                const cleanUserDomain = u.domain.replace(/^www\./, '');

                if (cleanHostname === cleanUserDomain) return true;
                if (isSubdomainOf(hostname, u.domain)) return true;

                return false;
            });
        } catch (dbError) {
            console.warn('[CONFIG] Database not reachable, using fallback for local domain:', hostname);
        }

        if (!user && !isLocalhost && process.env.NODE_ENV !== 'development') {
            console.warn(`Embed config request from unauthorized domain: ${hostname}`);
            return NextResponse.json(
                { error: 'Domain not authorized for this embed service.' },
                { status: 403, headers: corsHeaders }
            );
        }

        const apiSecretKey = process.env.API_SECRET_KEY;
        if (!apiSecretKey) {
            console.error('Missing API_SECRET_KEY configuration.');
            return NextResponse.json(
                { error: 'Server configuration error (API secret key missing).' },
                { status: 500, headers: corsHeaders }
            );
        }

        // Detect country - first by domain TLD, then by IP geolocation
        let detectedCountry = null;

        // Check for test parameter in development
        if (process.env.NODE_ENV === 'development') {
            const url = new URL(request.url);
            const testCountry = url.searchParams.get('testCountry');
            if (testCountry) {
                detectedCountry = testCountry;
                console.log('[CONFIG] Using test country from URL parameter:', detectedCountry);
                return NextResponse.json({
                    backendApiKey: apiSecretKey,
                    mapsApiKey: mapsApiKeyFromEnv,
                    detectedCountry: detectedCountry,
                }, { headers: corsHeaders });
            }
        }

        // Step 1: Detect country by domain TLD (highest priority)
        try {
            if (hostname.endsWith('.co')) {
                detectedCountry = 'Colombia';
                console.log('[CONFIG] Detected country from domain .co:', detectedCountry);
            } else if (hostname.endsWith('.gt')) {
                detectedCountry = 'Guatemala';
                console.log('[CONFIG] Detected country from domain .gt:', detectedCountry);
            } else if (hostname.endsWith('.es')) {
                detectedCountry = 'Spain';
                console.log('[CONFIG] Detected country from domain .es:', detectedCountry);
            } else {
                // Default to Spain for other domains
                detectedCountry = 'Spain';
                console.log('[CONFIG] Default country for other domains:', detectedCountry);
            }
        } catch (error) {
            console.log('[CONFIG] Error detecting country from domain:', error);
            detectedCountry = 'Spain'; // Fallback to Spain
        }

        // Step 2: Fallback to IP geolocation only if domain detection failed
        if (!detectedCountry) {
            try {
                // Get client IP from headers
                const forwarded = request.headers.get('x-forwarded-for');
                const realIP = request.headers.get('x-real-ip');
                const cfConnecting = request.headers.get('cf-connecting-ip');
                const clientIP = forwarded?.split(',')[0] || realIP || cfConnecting;

                console.log('[CONFIG] IP detection - forwarded:', forwarded, 'realIP:', realIP, 'cfConnecting:', cfConnecting);
                console.log('[CONFIG] Detected client IP:', clientIP);

                if (clientIP && clientIP !== '127.0.0.1' && clientIP !== '::1' && !clientIP.startsWith('192.168.') && !clientIP.startsWith('10.')) {
                    console.log('[CONFIG] Making request to ipapi.co for IP:', clientIP);
                    // Use the free HTTP API from the server (no mixed content issues)
                    const response = await fetch(`http://ipapi.co/${clientIP}/json/`);
                    const data = await response.json();

                    console.log('[CONFIG] ipapi.co response:', data);

                    if (data.country) {
                        detectedCountry = data.country;
                        console.log('[CONFIG] Detected country from IP:', detectedCountry);
                    } else {
                        console.log('[CONFIG] No country in ipapi.co response');
                    }
                } else {
                    console.log('[CONFIG] Skipping IP geolocation - local/private IP or missing');

                    // Development mode: simulate country detection based on environment variable
                    if (process.env.NODE_ENV === 'development') {
                        const simulatedCountry = process.env.DEV_SIMULATE_COUNTRY;
                        if (simulatedCountry) {
                            detectedCountry = simulatedCountry;
                            console.log('[CONFIG] Development mode: simulating country:', detectedCountry);
                        }
                    }
                }
            } catch (error) {
                console.log('[CONFIG] Error detecting country by IP:', error);
                // Continue without country detection
            }
        }

        return NextResponse.json({
            backendApiKey: apiSecretKey, // Global API key
            mapsApiKey: mapsApiKeyFromEnv,     // Global Google Maps key from .env
            detectedCountry: detectedCountry, // Add detected country
        }, { headers: corsHeaders });

    } catch (error) {
        console.error('Error fetching embed configuration:', error);
        return NextResponse.json(
            { error: 'Internal server error while fetching configuration.' },
            { status: 500, headers: corsHeaders }
        );
    }
}