import { NextResponse } from 'next/server';
import { Buffer } from 'buffer';
import { Client, AddressType, Language, ReverseGeocodingLocationType } from "@googlemaps/google-maps-services-js";
import { validateEmbedApiKey, embedRateLimit } from '@/lib/security';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { fetchBuildingInsights, fetchDataLayers } from '@/lib/google-solar';
import type { GoogleSolarData } from '@/lib/types';
import type { BuildingInsightsResponse, SolarPanelConfig } from '@/lib/google-solar-types';
import { PanelApplication, PanelType, Material, User, SystemSetting } from '@/generated/prisma';
import { sendSubmissionEmail } from '@/lib/email';
import { convertTiffToPng } from '@/lib/orthophoto';
import {
    DEFAULT_FINANCIAL_CONSTANTS_ES,
    calculateAnnualKWhEnergyConsumption,
    calculateInitialAcKwhPerYear,
    calculateLifetimeProductionAcKwh,
    calculateRemainingLifetimeUtilityBill,
    calculateCostOfElectricityWithoutSolar,
    calculateInstallationSizeKW,
    calculateTotalCostWithSolar,
    calculateTotalSavings,
    calculatePaybackYears,
    type DetailedFinancialAnalysis,
    type FinancialConstants,
    calculateSpanishIncentive,
    DEFAULT_FINANCIAL_CONSTANTS_CO,
    getColombianFinancialConstants
} from '@/lib/solar-financial-calculations';
import { getIvaRate, convertEurToCop } from '@/lib/currency';

//Example response from google maps api:
// Received submission (data before saving): {
//     consumption: '5',
//     location: 'C. Peral, 14, 28860 Paracuellos de Jarama, Madrid, España',
//     polygonCoordinates: '[{"lat":40.50940009295717,"lng":-3.5174427835172706},{"lat":40.50929405021356,"lng":-3.5172925798124366},{"lat":40.509171692993355,"lng":-3.517410597009092},{"lat":40.50929812878373,"lng":-3.5175500718778663}]',
//     latitude: '40.5108931',
//     longitude: '-3.5156229',
//     name: 'Pepe',
//     surnames: 'Lopez',
//     phone: '682737373',
//     email: 'hola@gmial.com',
//     consent: 'on',
//     origin: 'http://localhost:3000',
//     pathname: '/test',
//     referrer: null,
//     timestamp: '2025-05-19T21:39:52.397Z',
//     city: 'Paracuellos de Jarama',
//     googleSolarData: {
//       initialConsumption: 5,
//       maxSunshineHoursPerYear: 1712.3163,
//       maxArrayAreaMeters2: 45.161762,
//       maxArrayPanelsCount: 23,
//       panelsCount: 4,
//       yearlyEnergyDcKwh: 2678.9407,
//       estimatedAnnualSavingsAmount: -117.7824523452166,
//       estimatedTotalLifetimeSavingsAmount: -2355.649046904332,
//       estimatedInstallationCostAmount: 2560,
//       paybackYears: 213.33333333333334,
//       currencyCode: 'EUR',
//       monthlyElectricityBillAmount: 1,
//       averageKwhConsumption: 5
//     }
//   }


// Define the expected request data structure
interface EmbedFormData {
    consumption: string;
    location: string;
    latitude: string;
    longitude: string;
    name: string;
    surnames: string;
    phone: string;
    email: string;
    consent: string;
    origin: string;
    pathname: string;
    referrer: string | null;
    averagePricePerKWh?: string;
    panelApplication?: string;
    panelType?: string;
    averagePriceCurrency?: string;
    polygonCoordinates?: string;
}

// New type for cost breakdown (mirror from calculate route)
interface CostBreakdown {
    serviciosInstalacionPuestaMarcha: number | null;
    costePanel: number | null;
    costeInversor: number | null;
    puestaMarchaLegalizacion: number | null;
    garantiaSoporteTecnico: number | null;
    herramientaMonitorizacion: number | null;
    estructura: number | null;
}

// Helper function to extract hostname from origin URL (if not already present)
function getHostnameFromOrigin(origin: string): string | null {
    try {
        const url = new URL(origin);
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
    if (hostname.startsWith('localhost') || domain.startsWith('localhost')) {
        return hostname === domain;
    }
    const cleanHostname = hostname.replace(/^www\./, '');
    const cleanDomain = domain.replace(/^www\./, '');
    if (cleanHostname === cleanDomain) return true;
    return cleanHostname.endsWith('.' + cleanDomain);
}

// Helper to handle CORS headers
function corsHeaders(origin: string) {
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
        'Access-Control-Max-Age': '86400',
    };
}

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

// Helper function to calculate polygon area using Shoelace formula
function calculatePolygonArea(coordinates: Array<{ lat: number; lng: number }>): number {
    if (coordinates.length < 3) return 0;

    let area = 0;
    const n = coordinates.length;

    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        // Convert lat/lng to approximate meters using simple projection
        // This is approximate but good enough for small roof areas
        const lat1 = coordinates[i].lat * Math.PI / 180;
        const lng1 = coordinates[i].lng * Math.PI / 180;
        const lat2 = coordinates[j].lat * Math.PI / 180;
        const lng2 = coordinates[j].lng * Math.PI / 180;

        // Convert to meters (approximate)
        const x1 = lng1 * 6371000 * Math.cos(lat1);
        const y1 = lat1 * 6371000;
        const x2 = lng2 * 6371000 * Math.cos(lat2);
        const y2 = lat2 * 6371000;

        area += (x1 * y2 - x2 * y1);
    }

    return Math.abs(area) / 2;
}

// Initialize Google Maps client
const googleMapsClient = new Client({});

// Helper to robustly parse average price per kWh (supports comma/dot, string/number, fallback to default based on currency)
function parseAveragePricePerKWh(input: unknown, currency: 'EUR' | 'COP' = 'EUR'): number {
    if (typeof input === 'number' && input > 0) return input;
    if (typeof input === 'string') {
        const normalized = input.replace(',', '.').replace(/\s/g, '');
        const value = parseFloat(normalized);
        if (!isNaN(value) && value > 0) return value;
    }
    return currency === 'COP' ? 986 : 0.20; // Colombia rate: 986 COP/kWh (equivalent to 0.21 EUR)
}

const DEFAULT_SYSTEM_SETTINGS = {
    inverterCostPercentage: 0.15,
    panelComponentPercentage: 0.25,
};

// Helper to get the correct inverter/install percent from systemSettings (handles migration period)
function getSystemInverterCostPercent(systemSettings: SystemSetting | null, defaults: typeof DEFAULT_SYSTEM_SETTINGS): number {
    if (systemSettings) {
        if (typeof (systemSettings as any).inverterCostPercentage === 'number') {
            return (systemSettings as any).inverterCostPercentage;
        }
        if (typeof (systemSettings as any).installationServicesPercentage === 'number') {
            return (systemSettings as any).installationServicesPercentage;
        }
    }
    if (typeof defaults.inverterCostPercentage === 'number') return defaults.inverterCostPercentage;
    return 0.15; // fallback
}

export async function POST(request: Request) {
    try {
        const headersList = await headers();
        const origin = headersList.get('origin');
        const apiKey = headersList.get('x-api-key');
        let city: string | null = null;
        let country: 'spain' | 'colombia' = 'spain';
        let enforcedCurrency: 'EUR' | 'COP' = 'EUR';

        // Get API keys from environment
        const googleSolarApiKey = process.env.GOOGLE_MAPS_API_KEY;
        const googleMapsApiKey = googleSolarApiKey; // Using the same key for both
        if (!googleMapsApiKey) {
            throw new Error('Google Maps API key is not configured');
        }

        let data: EmbedFormData;
        try {
            data = await request.json();
        } catch (e) {
            console.error('[SUBMIT] Failed to parse request JSON:', e);
            return NextResponse.json(
                { success: false, message: 'Invalid JSON payload' },
                { status: 400, headers: corsHeaders(origin || '') }
            );
        }

        // Define default user/system settings & IVA Rate (values from Prisma schema defaults)
        const DEFAULT_USER_SETTINGS = {
            inverterCostPercentage: 0.15,
            commissioningLegalizationPercentage: 0.15,
            warrantySupportPercentage: 0.05,
            monitoringToolPercentage: 0.10,
            structureCostPercentage: 0.05,
            installationServicesPercentage: 0.25,
            priceKW: DEFAULT_FINANCIAL_CONSTANTS_ES.installationCostPerKw, // Default priceKW
        };

        // --- BEGIN: Fetch User and System Settings ---
        let systemSettings: SystemSetting | null = null;

        // Pre-parse lat/lng for parallel queries with validation
        const lat = parseFloat(data.latitude);
        const lng = parseFloat(data.longitude);

        if (isNaN(lat) || isNaN(lng)) {
            return NextResponse.json(
                { success: false, message: 'Invalid coordinates provided' },
                { status: 400, headers: corsHeaders(origin || '') }
            );
        }

        // --- BEGIN: Parallel External API and DB Calls ---
        console.log('[SUBMIT] Starting parallel external calls and DB lookups');
        const [
            matchedUserResult,
            systemSettingsResult,
            solarInsightsResult,
            orthophotoTiffUrlResult,
            geocodeResult
        ] = await Promise.all([
            // 1. User Settings by Domain (safely handles offline DB)
            (async () => {
                if (!origin) return null;
                const originHostname = getHostnameFromOrigin(origin);
                if (!originHostname) return null;
                const domainParts = originHostname.split('.');
                const potentialDomains = [];
                for (let i = 0; i < domainParts.length - 1; i++) {
                    potentialDomains.push(domainParts.slice(i).join('.'));
                }
                return prisma.user.findFirst({
                    where: { domain: { in: potentialDomains }, priceKW: { not: null } },
                    select: {
                        id: true,
                        domain: true,
                        priceKW: true,
                        priceKWCurrency: true,
                        inverterCostPercentage: true,
                        commissioningLegalizationPercentage: true,
                        warrantySupportPercentage: true,
                        monitoringToolPercentage: true,
                        installationServicesPercentage: true,
                        structureCostPercentage: true
                    }
                }).catch(e => {
                    console.warn('[SUBMIT] User domain DB lookup error (falling back to defaults):', e.message);
                    return null;
                });
            })(),
            // 2. System Settings (safely handles offline DB)
            prisma.systemSetting.findFirst().catch(e => {
                console.warn('[SUBMIT] System settings DB lookup error (falling back to defaults):', e.message);
                return null;
            }),
            // 3. Solar Building Insights
            googleSolarApiKey ? fetchBuildingInsights({ latitude: lat, longitude: lng }, googleSolarApiKey) : Promise.resolve(null),
            // 4. Solar Data Layers (for Orthophoto)
            googleSolarApiKey ? fetchDataLayers({ latitude: lat, longitude: lng }, googleSolarApiKey) : Promise.resolve(null),
            // 5. Google Maps Geocoding
            googleMapsApiKey ? googleMapsClient.reverseGeocode({
                params: {
                    latlng: { lat, lng },
                    key: googleMapsApiKey,
                    language: Language.es,
                    result_type: [AddressType.street_address, AddressType.route, AddressType.locality, AddressType.political],
                    location_type: [ReverseGeocodingLocationType.ROOFTOP, ReverseGeocodingLocationType.RANGE_INTERPOLATED, ReverseGeocodingLocationType.GEOMETRIC_CENTER]
                },
            }).catch(e => {
                console.error('[SUBMIT] Geocoding error:', e);
                return null;
            }) : Promise.resolve(null)
        ]);
        // --- END: Parallel External API and DB Calls ---

        let effectivePriceKW: number = DEFAULT_USER_SETTINGS.priceKW;
        let userDefinedCurrency: 'EUR' | 'COP' | null = null;

        let invCostPercent = DEFAULT_USER_SETTINGS.inverterCostPercentage;
        let commLegPercent = DEFAULT_USER_SETTINGS.commissioningLegalizationPercentage;
        let warrantyPercent = DEFAULT_USER_SETTINGS.warrantySupportPercentage;
        let monitoringPercent = DEFAULT_USER_SETTINGS.monitoringToolPercentage;
        let structurePercent = DEFAULT_USER_SETTINGS.structureCostPercentage;
        let installServicesPercent = DEFAULT_USER_SETTINGS.installationServicesPercentage;

        systemSettings = systemSettingsResult;
        let spanishIncentiveNote = '';

        if (matchedUserResult) {
            if (matchedUserResult.priceKW !== null) {
                effectivePriceKW = matchedUserResult.priceKW;
            }
            userDefinedCurrency = matchedUserResult.priceKWCurrency as 'EUR' | 'COP' | null;

            if (matchedUserResult.inverterCostPercentage !== null) invCostPercent = matchedUserResult.inverterCostPercentage;
            if (matchedUserResult.commissioningLegalizationPercentage !== null) commLegPercent = matchedUserResult.commissioningLegalizationPercentage;
            if (matchedUserResult.warrantySupportPercentage !== null) warrantyPercent = matchedUserResult.warrantySupportPercentage;
            if (matchedUserResult.monitoringToolPercentage !== null) monitoringPercent = matchedUserResult.monitoringToolPercentage;
            if (matchedUserResult.structureCostPercentage !== null) structurePercent = matchedUserResult.structureCostPercentage;
            if (matchedUserResult.installationServicesPercentage !== null) installServicesPercent = matchedUserResult.installationServicesPercentage;

            console.log(`[SUBMIT] Matched user domain: ${matchedUserResult.domain}, Price: ${effectivePriceKW}`);
        }

        // --- Process Orthophoto ---
        let orthophotoUrl: string | null = null;
        let orthophotoBase64: string | null = null;
        if (orthophotoTiffUrlResult) {
            try {
                const host = headersList.get('host');
                const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
                const baseUrl = `${protocol}://${host}`;
                orthophotoUrl = `${baseUrl}/api/orthophoto?url=${encodeURIComponent(orthophotoTiffUrlResult)}`;

                const pngBuffer = await convertTiffToPng(orthophotoTiffUrlResult);
                if (pngBuffer) {
                    orthophotoBase64 = pngBuffer.toString('base64');
                }
            } catch (e) {
                console.error('[SUBMIT] Error processing orthophoto:', e);
            }
        }

        // Determine final currency - respect user choice if provided, otherwise default to EUR
        let finalCurrency: 'EUR' | 'COP' = 'EUR';
        if (data.averagePriceCurrency && (data.averagePriceCurrency === 'EUR' || data.averagePriceCurrency === 'COP')) {
            finalCurrency = data.averagePriceCurrency;
            console.log(`[SUBMIT] Using user-selected currency: ${finalCurrency}`);
        } else if (userDefinedCurrency) {
            finalCurrency = userDefinedCurrency;
            console.log(`[SUBMIT] Using domain-defined currency: ${finalCurrency}`);
        } else {
            console.log(`[SUBMIT] Using default currency: ${finalCurrency}`);
        }

        let FINANCIAL_CONSTANTS = finalCurrency === 'COP' ? DEFAULT_FINANCIAL_CONSTANTS_CO : DEFAULT_FINANCIAL_CONSTANTS_ES;

        // Use dynamic Colombian constants if final currency is COP
        if (finalCurrency === 'COP') {
            try {
                FINANCIAL_CONSTANTS = await getColombianFinancialConstants();
            } catch (error) {
                console.error('[SUBMIT] Error getting dynamic Colombian constants:', error);
                // Fallback to static constants already set above
            }
        }

        // Validate API key and origin
        const isValidRequest = await validateEmbedApiKey(apiKey, origin);
        if (!isValidRequest) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized' },
                { status: 401, headers: corsHeaders(origin || '') }
            );
        }

        // Apply rate limiting based on origin
        try {
            const { isRateLimited } = await embedRateLimit.check(origin || 'unknown', 100); // 100 requests per minute per origin
            if (isRateLimited) {
                return NextResponse.json(
                    { success: false, message: 'Too many requests' },
                    { status: 429, headers: corsHeaders(origin || '') }
                );
            }
        } catch {
            // If rate limiting fails, continue but log the error
            console.error('Rate limiting error');
        }

        // (API Key already verified above)
        // (Orthophoto processing moved up to parallel block)

        // Validate request origin matches form origin
        if (data.origin !== origin) {
            return NextResponse.json(
                { success: false, message: 'Origin mismatch' },
                { status: 403, headers: corsHeaders(origin || '') }
            );
        }

        // Validate required fields
        const requiredFields = ['consumption', 'location', 'latitude', 'longitude', 'name', 'surnames', 'phone', 'email', 'consent'];
        for (const field of requiredFields) {
            if (!data[field as keyof EmbedFormData]) {
                return NextResponse.json(
                    {
                        success: false,
                        message: `El campo ${field} es obligatorio`
                    },
                    { status: 400, headers: corsHeaders(origin || '') }
                );
            }
        }

        // Determine country first by domain, then by geocoding
        let domainBasedCountry: 'spain' | 'colombia' | null = null;
        if (origin) {
            try {
                const originUrl = new URL(origin);
                const hostname = originUrl.hostname;

                if (hostname.endsWith('.co')) {
                    domainBasedCountry = 'colombia';
                    console.log('[SUBMIT] Detected Colombia from domain .co');
                } else if (hostname.endsWith('.es')) {
                    domainBasedCountry = 'spain';
                    console.log('[SUBMIT] Detected Spain from domain .es');
                } else {
                    domainBasedCountry = 'spain'; // Default to Spain for other domains
                    console.log('[SUBMIT] Default to Spain for other domains');
                }
            } catch (error) {
                console.error('[SUBMIT] Error parsing origin URL:', error);
                domainBasedCountry = 'spain'; // Fallback to Spain
            }
        }

        // Set initial country and currency based on domain
        if (domainBasedCountry) {
            country = domainBasedCountry;
            if (domainBasedCountry === 'colombia') {
                enforcedCurrency = 'COP';
                // Only override user selection if they haven't explicitly chosen a currency
                if (!data.averagePriceCurrency && !userDefinedCurrency) {
                    finalCurrency = 'COP';
                    // Update financial constants to match new currency
                    FINANCIAL_CONSTANTS = DEFAULT_FINANCIAL_CONSTANTS_CO;
                    try {
                        FINANCIAL_CONSTANTS = await getColombianFinancialConstants();
                    } catch (error) {
                        console.error('[SUBMIT] Error getting Colombian constants from domain detection:', error);
                    }
                    console.log('[SUBMIT] Auto-setting currency to COP for Colombian domain');
                }
            } else {
                enforcedCurrency = 'EUR';
                // Update effectivePriceKW for Spain if user-defined currency doesn't match final currency
                if ((!userDefinedCurrency || userDefinedCurrency !== finalCurrency) && finalCurrency === 'EUR') {
                    effectivePriceKW = DEFAULT_FINANCIAL_CONSTANTS_ES.installationCostPerKw;
                    console.log(`[SUBMIT] Using EUR price for Spain: ${effectivePriceKW} EUR/kW`);
                }
            }
        }

        // Process Geocoding Result
        if (geocodeResult && geocodeResult.data.status === 'OK') {
            const isInSpain = geocodeResult.data.results.some(result =>
                result.address_components.some(component =>
                    component.types.includes(AddressType.country) &&
                    component.short_name === 'ES'
                )
            );
            const isInColombia = geocodeResult.data.results.some(result =>
                result.address_components.some(component =>
                    component.types.includes(AddressType.country) &&
                    component.short_name === 'CO'
                )
            );

            if (!isInSpain && !isInColombia) {
                return NextResponse.json(
                    { success: false, message: 'La ubicación debe estar en España o Colombia' },
                    { status: 400, headers: corsHeaders(origin || '') }
                );
            }

            data.location = geocodeResult.data.results[0].formatted_address;
            const addressComponents = geocodeResult.data.results[0]?.address_components;
            if (addressComponents) {
                for (const component of addressComponents) {
                    if (component.types.includes(AddressType.locality)) {
                        city = component.long_name;
                        break;
                    }
                }
            }
        } else if (geocodeResult && geocodeResult.data.status !== 'ZERO_RESULTS') {
            console.error('[SUBMIT] Google Maps API status error:', geocodeResult.data.status);
        }

        // Validate consent
        if (!data.consent) {
            return NextResponse.json(
                { success: false, message: 'Debe aceptar el consentimiento para procesar sus datos' },
                { status: 400, headers: corsHeaders(origin || '') }
            );
        }

        // Apply CSRF protection by validating the presence of headers
        if (!headersList.get('content-type')?.includes('application/json')) {
            return NextResponse.json(
                { success: false, message: 'Invalid content type' },
                { status: 400, headers: corsHeaders(origin || '') }
            );
        }

        // After parsing data, determine the average price to use:
        const averagePrice = parseAveragePricePerKWh(data.averagePricePerKWh, finalCurrency);
        console.log(`[SUBMIT] Final settings - Currency: ${finalCurrency}, Price/kW: ${effectivePriceKW}, Average price: ${averagePrice}, Country: ${country}`);

        // Prepare data for Prisma, starting with non-solar fields
        const googleSolarData: GoogleSolarData = {
            initialConsumption: parseFloat(data.consumption),
            maxSunshineHoursPerYear: null,
            maxArrayAreaMeters2: null,
            maxArrayPanelsCount: null,
            panelsCount: null,
            yearlyEnergyDcKwh: null,
            // Initialize new financial fields
            estimatedAnnualSavingsAmount: null,
            estimatedTotalLifetimeSavingsAmount: null,
            estimatedInstallationCostAmount: null,
            paybackYears: null,
            currencyCode: null,
            monthlyElectricityBillAmount: null,
            averageKwhConsumption: null,
        };

        // Parse panel preferences from request data
        const panelApplication = data.panelApplication as PanelApplication | undefined;
        const panelType = data.panelType as PanelType | undefined;

        // Initialize variables for new detailed cost fields
        let selectedPanelName: string | null = null;
        let selectedInverterName: string | null = null;
        let selectedInverterPeakPower: number | null = null;
        let costBreakdownResult: CostBreakdown | null = null;
        let ivaAmountResult: number | null = null;
        let totalCostWithIvaResult: number | null = null;
        let baseInstallationCostForDB: number | null = null; // To store the final base cost

        // Find the user by domain instead of allowedDomain
        let domainUser = null;
        if (data.origin) {
            try {
                const originUrl = new URL(data.origin);
                const hostname = originUrl.hostname;
                const originWithPort = originUrl.port ? `${hostname}:${originUrl.port}` : hostname;

                const domainParts = hostname.split('.');
                const potentialDomains = [];
                for (let i = 0; i < domainParts.length - 1; i++) {
                    potentialDomains.push(domainParts.slice(i).join('.'));
                }

                // If it's a localhost with port, also add that specifically
                if (hostname.startsWith('localhost')) {
                    potentialDomains.push(originWithPort);
                }

                domainUser = await prisma.user.findFirst({
                    where: {
                        domain: { in: potentialDomains }
                    }
                });
            } catch (error) {
                console.error('Error parsing origin URL:', error);
            }
        }

        // Process Solar Building Insights
        const solarInsights: BuildingInsightsResponse | null = solarInsightsResult;

        if (solarInsights && solarInsights.solarPotential) {
            const { solarPotential } = solarInsights;
            googleSolarData.maxSunshineHoursPerYear = solarPotential.maxSunshineHoursPerYear ?? null;
            googleSolarData.maxArrayAreaMeters2 = solarPotential.maxArrayAreaMeters2 ?? null;
            googleSolarData.maxArrayPanelsCount = solarPotential.maxArrayPanelsCount ?? null;

            // Set currency code and financial constants based on final currency
            const financialConstants: FinancialConstants = {
                ...FINANCIAL_CONSTANTS,
                averagePricePerKWh: averagePrice,
                installationLifeSpan: solarPotential.panelLifetimeYears ?? FINANCIAL_CONSTANTS.installationLifeSpan,
            };
            googleSolarData.currencyCode = finalCurrency; // Set currency based on final determination

            // --- Detailed Financial Calculation for non-US (Spain) ---
            const monthlyKWhEnergyConsumption = parseFloat(data.consumption);
            const annualKWhEnergyConsumption = calculateAnnualKWhEnergyConsumption(monthlyKWhEnergyConsumption);
            googleSolarData.averageKwhConsumption = monthlyKWhEnergyConsumption; // Store the monthly consumption
            // Estimate monthly bill based on consumption and price for context, though not directly used in core saving calcs
            googleSolarData.monthlyElectricityBillAmount = monthlyKWhEnergyConsumption * financialConstants.averagePricePerKWh;


            let bestAnalysis: DetailedFinancialAnalysis | null = null;

            if (solarPotential.solarPanelConfigs && solarPotential.solarPanelConfigs.length > 0 && solarPotential.panelCapacityWatts) {
                const costOfElectricityWithoutSolar = calculateCostOfElectricityWithoutSolar(annualKWhEnergyConsumption, financialConstants);

                for (const config of solarPotential.solarPanelConfigs) {
                    if (!config.panelsCount || !config.yearlyEnergyDcKwh) continue;

                    const initialAcKwhPerYear = calculateInitialAcKwhPerYear(config.yearlyEnergyDcKwh, financialConstants);

                    // Optional: Skip configs that produce more than consumed annually (as per docs suggestion)
                    // if (initialAcKwhPerYear > annualKWhEnergyConsumption) continue;

                    const installationSizeKW = calculateInstallationSizeKW(config.panelsCount, solarPotential.panelCapacityWatts);
                    const installationCost = installationSizeKW * effectivePriceKW;
                    const lifetimeProductionAcKwh = calculateLifetimeProductionAcKwh(initialAcKwhPerYear, financialConstants);
                    const remainingLifetimeUtilityBill = calculateRemainingLifetimeUtilityBill(annualKWhEnergyConsumption, initialAcKwhPerYear, financialConstants);
                    const totalCostWithSolar = calculateTotalCostWithSolar(installationCost, remainingLifetimeUtilityBill, financialConstants);
                    const totalLifetimeSavings = calculateTotalSavings(costOfElectricityWithoutSolar, totalCostWithSolar);
                    const paybackYears = calculatePaybackYears(installationCost, annualKWhEnergyConsumption, initialAcKwhPerYear, financialConstants);
                    const annualSavings = totalLifetimeSavings / financialConstants.installationLifeSpan;

                    const currentAnalysis: DetailedFinancialAnalysis = {
                        panelsCount: config.panelsCount,
                        yearlyEnergyDcKwh: config.yearlyEnergyDcKwh,
                        initialAcKwhPerYear,
                        installationSizeKW,
                        installationCost,
                        lifetimeProductionAcKwh,
                        remainingLifetimeUtilityBill,
                        totalCostWithSolar,
                        costOfElectricityWithoutSolar,
                        totalLifetimeSavings,
                        annualSavings,
                        paybackYears
                    };

                    if (!bestAnalysis || currentAnalysis.totalLifetimeSavings > bestAnalysis.totalLifetimeSavings) {
                        bestAnalysis = currentAnalysis;
                    }
                }

                if (bestAnalysis) {
                    googleSolarData.panelsCount = bestAnalysis.panelsCount;
                    googleSolarData.yearlyEnergyDcKwh = bestAnalysis.yearlyEnergyDcKwh; // This is DC

                    // ---> START MODIFICATION FOR MATERIAL-BASED COSTING & PANEL COUNT OVERRIDE <ــ-
                    if (panelApplication && panelType && solarPotential.maxArrayAreaMeters2 && solarPotential.maxArrayAreaMeters2 > 0) {
                        try {
                            const availablePanels = await prisma.material.findMany({
                                where: {
                                    type: "PANEL",
                                    panelApplication: panelApplication,
                                    panelType: panelType,
                                    area: { gt: 0 }
                                }
                            });

                            if (availablePanels.length > 0) {
                                const selectedPanel = availablePanels[0]; // Simplistic: pick the first one
                                selectedPanelName = selectedPanel.name; // CAPTURE SELECTED PANEL NAME
                                const areaPerPanel = selectedPanel.area;

                                if (areaPerPanel && areaPerPanel > 0 && solarPotential.maxArrayAreaMeters2) {
                                    // Calculate max panels by area
                                    const maxPanelsByArea = Math.floor(solarPotential.maxArrayAreaMeters2 / areaPerPanel);

                                    // Calculate panels needed based on consumption and actual panel wattage
                                    // Use a more conservative approach: assume 1200 kWh per kWp per year for Spain
                                    const annualConsumption = calculateAnnualKWhEnergyConsumption(parseFloat(data.consumption));
                                    const panelWattage = solarPotential.panelCapacityWatts || 400; // Default to 400W if not available
                                    const kwhPerPanelPerYear = (panelWattage / 1000) * 1200; // Conservative production estimate
                                    const panelsNeededByConsumption = Math.ceil(annualConsumption / kwhPerPanelPerYear);

                                    // Use the minimum of area-limited and consumption-based calculation
                                    const calculatedPanelsCount = Math.min(panelsNeededByConsumption, maxPanelsByArea);

                                    console.log('[SUBMIT] Panel calculation details:', {
                                        maxPanelsByArea,
                                        panelsNeededByConsumption,
                                        calculatedPanelsCount,
                                        panelWattage,
                                        kwhPerPanelPerYear,
                                        annualConsumption
                                    });

                                    if (calculatedPanelsCount > 0 && calculatedPanelsCount !== bestAnalysis.panelsCount) {
                                        console.log(`SUBMIT: Overriding Google panelsCount (${bestAnalysis.panelsCount}) with calculated value (${calculatedPanelsCount}) based on selected panel area and consumption.`);
                                        bestAnalysis.panelsCount = calculatedPanelsCount;
                                        googleSolarData.panelsCount = calculatedPanelsCount;

                                        // Recalculate installation size and cost using effectivePriceKW
                                        bestAnalysis.installationSizeKW = calculateInstallationSizeKW(bestAnalysis.panelsCount, solarPotential.panelCapacityWatts ?? 0);
                                        bestAnalysis.installationCost = bestAnalysis.installationSizeKW * effectivePriceKW; // Use effectivePriceKW
                                        console.log(`[SUBMIT] Recalculated installation cost (DB panel path): ${bestAnalysis.installationCost}`);
                                    }
                                }
                            }
                        } catch (materialError) {
                            console.error('SUBMIT: Error fetching/processing panel materials:', materialError);
                        }
                    }
                    // ---> END MODIFICATION FOR MATERIAL-BASED COSTING <ــ-

                    // Store the calculated financial values (potentially updated)
                    googleSolarData.estimatedInstallationCostAmount = bestAnalysis.installationCost;
                    googleSolarData.estimatedTotalLifetimeSavingsAmount = bestAnalysis.totalLifetimeSavings;
                    googleSolarData.estimatedAnnualSavingsAmount = bestAnalysis.annualSavings;
                    googleSolarData.paybackYears = bestAnalysis.paybackYears;
                    googleSolarData.installationSizeKW = bestAnalysis.installationSizeKW;
                    baseInstallationCostForDB = bestAnalysis.installationCost; // Store this for DB

                    // --- INCENTIVE LOGIC FOR SPAIN ONLY ---
                    let incentives = 0;
                    if (country === 'spain' && finalCurrency === 'EUR' && baseInstallationCostForDB && baseInstallationCostForDB > 0) {
                        incentives = calculateSpanishIncentive(baseInstallationCostForDB);
                        spanishIncentiveNote = 'En esta propuesta se ha incluido la bonificación derivada de la instalación de paneles solares del IRPF y que consiste en un 40% del precio del proyecto que se reducirá de la base imponible del cliente. Hemos tenido en cuenta un 30%.';
                    }
                    // NOTE: IRPF incentives are NOT applied for Colombia as requested
                    // Override financialConstants with incentives
                    const financialConstantsWithIncentives: FinancialConstants = {
                        ...FINANCIAL_CONSTANTS,
                        averagePricePerKWh: averagePrice,
                        installationLifeSpan: solarPotential.panelLifetimeYears ?? FINANCIAL_CONSTANTS.installationLifeSpan,
                        incentives,
                    };
                    // Recalculate all financials with incentives
                    const costOfElectricityWithoutSolar = calculateCostOfElectricityWithoutSolar(annualKWhEnergyConsumption, financialConstantsWithIncentives);
                    const remainingLifetimeUtilityBill = calculateRemainingLifetimeUtilityBill(annualKWhEnergyConsumption, bestAnalysis.initialAcKwhPerYear, financialConstantsWithIncentives);
                    const totalCostWithSolar = calculateTotalCostWithSolar(baseInstallationCostForDB, remainingLifetimeUtilityBill, financialConstantsWithIncentives);
                    const totalLifetimeSavings = calculateTotalSavings(costOfElectricityWithoutSolar, totalCostWithSolar);
                    const paybackYears = calculatePaybackYears(baseInstallationCostForDB, annualKWhEnergyConsumption, bestAnalysis.initialAcKwhPerYear, financialConstantsWithIncentives);
                    const annualSavings = totalLifetimeSavings / financialConstantsWithIncentives.installationLifeSpan;
                    // Update googleSolarData with recalculated values
                    googleSolarData.estimatedTotalLifetimeSavingsAmount = totalLifetimeSavings;
                    googleSolarData.estimatedAnnualSavingsAmount = annualSavings;
                    googleSolarData.paybackYears = paybackYears;

                    // --- BEGIN: Inverter Selection (after bestAnalysis.installationSizeKW is final) ---
                    if (bestAnalysis.installationSizeKW && bestAnalysis.installationSizeKW > 0) {
                        try {
                            const inverters = await prisma.material.findMany({
                                where: { type: "INVERSOR", peakPower: { gt: 0 } }
                            });
                            if (inverters.length > 0) {
                                let closestInverter: Material | null = null;
                                let smallestDifference = Infinity;
                                for (const inverter of inverters) {
                                    if (inverter.peakPower) {
                                        const difference = Math.abs(inverter.peakPower - bestAnalysis.installationSizeKW);
                                        if (difference < smallestDifference) {
                                            smallestDifference = difference;
                                            closestInverter = inverter;
                                        } else if (difference === smallestDifference) {
                                            if (closestInverter && inverter.peakPower > closestInverter.peakPower!) {
                                                closestInverter = inverter;
                                            }
                                        }
                                    }
                                }
                                if (!closestInverter && inverters.length > 0) {
                                    closestInverter = inverters.reduce((prev, current) =>
                                        (prev.peakPower ?? 0) > (current.peakPower ?? 0) ? prev : current
                                    );
                                }
                                if (closestInverter) {
                                    selectedInverterName = closestInverter.name;
                                    selectedInverterPeakPower = closestInverter.peakPower;
                                }
                            }
                        } catch (invError) {
                            console.error('[SUBMIT] Error fetching inverters:', invError);
                        }
                    }
                    // --- END: Inverter Selection ---

                    // --- BEGIN: Cost Breakdown and IVA (after bestAnalysis.installationCost is final) ---
                    if (baseInstallationCostForDB && baseInstallationCostForDB > 0) {
                        const sysPanelCompPercent = systemSettings?.panelComponentPercentage ?? DEFAULT_SYSTEM_SETTINGS.panelComponentPercentage;

                        costBreakdownResult = {
                            serviciosInstalacionPuestaMarcha: baseInstallationCostForDB * installServicesPercent,
                            costePanel: baseInstallationCostForDB * sysPanelCompPercent,
                            costeInversor: baseInstallationCostForDB * invCostPercent,
                            puestaMarchaLegalizacion: baseInstallationCostForDB * commLegPercent,
                            garantiaSoporteTecnico: baseInstallationCostForDB * warrantyPercent,
                            herramientaMonitorizacion: baseInstallationCostForDB * monitoringPercent,
                            estructura: baseInstallationCostForDB * structurePercent,
                        };
                        const ivaRate = getIvaRate(country);
                        ivaAmountResult = baseInstallationCostForDB * ivaRate;
                        totalCostWithIvaResult = baseInstallationCostForDB + ivaAmountResult;
                    }
                    // --- END: Cost Breakdown and IVA ---

                } else {
                    console.log('SUBMIT: Not enough data for detailed financial calculation (bestAnalysis is null).');
                }
            } else {
                console.log('SUBMIT: Not enough data for detailed financial calculation from solarPanelConfigs.');
                baseInstallationCostForDB = googleSolarData.estimatedInstallationCostAmount ?? null;
            }
            console.log('Successfully integrated Google Solar API data.');
        } else {
            console.log('Could not retrieve Google Solar API data or solar potential was missing.');
        }

        // --- COLOMBIA (PVGIS) LOGIC ---
        if (country === 'colombia') {
            // Update effectivePriceKW for Colombia only if user hasn't defined their own price OR currencies don't match
            if ((!userDefinedCurrency || userDefinedCurrency !== finalCurrency) && finalCurrency === 'COP') {
                try {
                    const colombianConstants = await getColombianFinancialConstants();
                    effectivePriceKW = colombianConstants.installationCostPerKw;
                    console.log(`[SUBMIT] Using COP price for Colombia: ${effectivePriceKW} COP/kW`);
                } catch (error) {
                    console.error('[SUBMIT] Error getting dynamic Colombian constants for effectivePriceKW:', error);
                    // Use fallback Colombian price if dynamic fetch fails
                    effectivePriceKW = DEFAULT_FINANCIAL_CONSTANTS_CO.installationCostPerKw;
                }
            }

            // Fetch PVGIS data
            const lat = parseFloat(data.latitude);
            const lon = parseFloat(data.longitude);
            const consumptionValue = parseFloat(data.consumption);

            // Calculate appropriate system size for PVGIS
            let peakpower = 1; // Default minimum
            let finalPeakpower = peakpower; // Will be set to the final system size before PVGIS call

            // Try to use polygon coordinates if available to better estimate system size
            if (data.polygonCoordinates) {
                try {
                    const polygonCoords = JSON.parse(data.polygonCoordinates);
                    if (Array.isArray(polygonCoords) && polygonCoords.length >= 3) {
                        // Calculate polygon area using Shoelace formula
                        const area = calculatePolygonArea(polygonCoords);
                        console.log(`[SUBMIT] Calculated roof area from polygon: ${area} m²`);

                        // Estimate system size based on roof area
                        // Assume ~6-8 m² per kWp (accounting for spacing, shadows, etc.)
                        const estimatedSystemSizeFromArea = Math.round((area / 7) * 10) / 10; // 7 m²/kWp average

                        // Use consumption-based or area-based estimate, whichever is smaller (more realistic)
                        const annualConsumption = consumptionValue * 12;
                        // Colombia produces ~1300-1400 kWh/kWp/year (using conservative 1300 for safety margin)
                        const consumptionBasedSize = Math.round((annualConsumption / 1300) * 10) / 10;

                        peakpower = Math.max(1, Math.min(estimatedSystemSizeFromArea, consumptionBasedSize));
                        console.log(`[SUBMIT] Colombia system size - Area-based: ${estimatedSystemSizeFromArea}kWp, Consumption-based: ${consumptionBasedSize}kWp, Final: ${peakpower}kWp`);
                    }
                } catch (e) {
                    console.warn('[SUBMIT] Could not parse polygon coordinates:', e);
                }
            }

            // Fallback: use consumption-based calculation
            if (peakpower === 1) {
                const annualConsumption = consumptionValue * 12;
                // Colombia produces ~1300-1400 kWh/kWp/year (using conservative 1300 for safety margin)
                peakpower = Math.max(1, Math.round((annualConsumption / 1300) * 10) / 10);
                console.log(`[SUBMIT] Colombia system size (consumption-based): ${peakpower}kWp`);
            }

            // --- BEGIN: Panel Selection and Final System Size Calculation for Colombia ---
            let selectedPanelNameColombia: string | null = null;
            finalPeakpower = peakpower; // Default to initial calculation

            // Select panel from materials table if preferences provided and refine system size
            if (data.panelApplication && data.panelType) {
                try {
                    const availablePanels = await prisma.material.findMany({
                        where: {
                            type: "PANEL",
                            panelApplication: data.panelApplication as PanelApplication,
                            panelType: data.panelType as PanelType,
                            area: { gt: 0 }
                        }
                    });

                    if (availablePanels.length > 0) {
                        const selectedPanel = availablePanels[0]; // Pick the first matching panel
                        selectedPanelNameColombia = selectedPanel.name;
                        console.log(`[SUBMIT] Colombia - Selected panel: ${selectedPanelNameColombia}`);

                        // If polygon coordinates are available, recalculate system size based on actual panel area
                        if (data.polygonCoordinates && selectedPanel.area && selectedPanel.area > 0) {
                            try {
                                const polygonCoords = JSON.parse(data.polygonCoordinates);
                                if (Array.isArray(polygonCoords) && polygonCoords.length >= 3) {
                                    const availableRoofArea = calculatePolygonArea(polygonCoords);
                                    const maxPanelsByArea = Math.floor(availableRoofArea / selectedPanel.area);

                                    // Calculate panels needed based on consumption (using Colombia's 1300 kWh/kWp/year)
                                    const annualConsumption = consumptionValue * 12;
                                    const panelWattage = 400; // Assume 400W panels for Colombia
                                    const kwhPerPanelPerYear = (panelWattage / 1000) * 1300; // Colombia production
                                    const panelsNeededByConsumption = Math.ceil(annualConsumption / kwhPerPanelPerYear);

                                    // Use the minimum of area-limited and consumption-based calculation
                                    const calculatedPanelsCount = Math.min(panelsNeededByConsumption, maxPanelsByArea);

                                    console.log('[SUBMIT] Colombia panel calculation:', {
                                        availableRoofArea,
                                        maxPanelsByArea,
                                        panelsNeededByConsumption,
                                        calculatedPanelsCount,
                                        originalSystemSize: peakpower
                                    });

                                    if (calculatedPanelsCount > 0) {
                                        // Calculate final system size based on actual panel count and wattage
                                        const newSystemSize = (calculatedPanelsCount * panelWattage) / 1000; // Convert to kW
                                        if (newSystemSize !== peakpower) {
                                            console.log(`[SUBMIT] Colombia - Updating system size from ${peakpower}kW to ${newSystemSize}kW based on panel area constraints`);
                                            finalPeakpower = newSystemSize;
                                        }
                                    }
                                }
                            } catch (e) {
                                console.warn('[SUBMIT] Colombia - Could not parse polygon coordinates for area calculation:', e);
                            }
                        }
                    }
                } catch (materialError) {
                    console.error('[SUBMIT] Colombia - Error fetching panel materials:', materialError);
                }
            }
            // --- END: Panel Selection and Final System Size Calculation ---

            const loss = 14; // Default system loss for Colombia
            // Use optimal parameters for better accuracy:
            // - optimalangles=1: Calculate optimal inclination AND orientation angles
            // - pvtechchoice=crystSi: Crystal Silicon panels (most common)
            // - mountingplace=building: Building-integrated (typical for rooftops)
            // - raddatabase=PVGIS-ERA5: Global coverage (replaces PVGIS-NSRDB)
            const pvgisUrl = `https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?lat=${lat}&lon=${lon}&peakpower=${finalPeakpower}&loss=${loss}&outputformat=json&optimalangles=1&pvtechchoice=crystSi&mountingplace=building&raddatabase=PVGIS-ERA5`;
            console.log(`[SUBMIT] PVGIS URL for Colombia: ${pvgisUrl}`);
            const pvgisResponse = await fetch(pvgisUrl, { headers: { 'Accept': 'application/json' } });
            if (!pvgisResponse.ok) {
                const errorText = await pvgisResponse.text();
                console.error(`[SUBMIT] PVGIS API error: ${pvgisResponse.status} - ${errorText}`);
                return NextResponse.json({ success: false, message: 'Error al consultar PVGIS', details: errorText }, { status: 500, headers: corsHeaders(origin || '') });
            }
            const pvgisData = await pvgisResponse.json();
            console.log(`[SUBMIT] PVGIS response for ${finalPeakpower}kWp system:`, pvgisData);

            // Map PVGIS data - use totals if available, otherwise sum monthly data
            let annualProduction: number;
            if (pvgisData.outputs?.totals?.fixed?.E_y) {
                // Use the more accurate annual total from PVGIS
                annualProduction = pvgisData.outputs.totals.fixed.E_y;
                console.log(`[SUBMIT] Using PVGIS annual total (E_y): ${annualProduction} kWh`);
            } else {
                // Fallback to manual summation of monthly data
                const monthly = pvgisData.outputs?.monthly?.fixed || [];
                if (monthly.length === 0) {
                    console.error('[SUBMIT] No PVGIS data available (neither totals nor monthly)');
                    return NextResponse.json({ success: false, message: 'Error: No se encontraron datos de producción en PVGIS' }, { status: 500, headers: corsHeaders(origin || '') });
                }
                annualProduction = monthly.map((m: any) => m.E_m || 0).reduce((a: number, b: number) => a + b, 0);
                console.log(`[SUBMIT] Using summed monthly data: ${annualProduction} kWh`);
            }
            const dailyAverage = annualProduction / 365;
            const efficiency = 100 - loss;
            const systemSize = finalPeakpower; // Use final calculated system size
            const totalCost = systemSize * effectivePriceKW;
            const costPerWatt = effectivePriceKW / 1000;
            const co2Reduction = annualProduction * 0.0005;
            const treesPlanted = Math.round(annualProduction * 0.02);

            // Calculate annual savings for Colombia
            const averagePrice = parseAveragePricePerKWh(data.averagePricePerKWh, 'COP');
            const annualConsumption = consumptionValue * 12; // Monthly to annual consumption
            const energyOffsetBySolar = Math.min(annualProduction, annualConsumption); // Can't offset more than you consume
            const annualSavings = energyOffsetBySolar * averagePrice; // Savings = offset energy * price per kWh

            // Calculate payback years (simple calculation)
            const paybackYears = totalCost > 0 && annualSavings > 0 ? totalCost / annualSavings : null;

            // Calculate lifetime savings (assuming 25 year system life)
            const systemLifeYears = 25;
            const totalLifetimeSavings = annualSavings * systemLifeYears;

            // --- BEGIN: Inverter Selection for Colombia ---
            let selectedInverterNameColombia: string | null = null;
            let selectedInverterPeakPowerColombia: number | null = null;

            // Select inverter based on system size
            if (systemSize > 0) {
                try {
                    const inverters = await prisma.material.findMany({
                        where: {
                            type: "INVERSOR",
                            peakPower: { gt: 0 }
                        }
                    });

                    if (inverters.length > 0) {
                        let closestInverter: Material | null = null;
                        let smallestDifference = Infinity;

                        for (const inverter of inverters) {
                            if (inverter.peakPower) {
                                const difference = Math.abs(inverter.peakPower - systemSize);
                                if (difference < smallestDifference) {
                                    smallestDifference = difference;
                                    closestInverter = inverter;
                                } else if (difference === smallestDifference) {
                                    if (closestInverter && inverter.peakPower > closestInverter.peakPower!) {
                                        closestInverter = inverter;
                                    }
                                }
                            }
                        }

                        if (!closestInverter && inverters.length > 0) {
                            closestInverter = inverters.reduce((prev, current) =>
                                (prev.peakPower ?? 0) > (current.peakPower ?? 0) ? prev : current
                            );
                        }

                        if (closestInverter) {
                            selectedInverterNameColombia = closestInverter.name;
                            selectedInverterPeakPowerColombia = closestInverter.peakPower;
                            console.log(`[SUBMIT] Colombia - Selected inverter: ${selectedInverterNameColombia} (${selectedInverterPeakPowerColombia}kW) for system size: ${systemSize}kW`);
                        }
                    }
                } catch (invError) {
                    console.error('[SUBMIT] Colombia - Error fetching inverters:', invError);
                }
            }
            // --- END: Panel and Inverter Selection for Colombia ---

            console.log(`[SUBMIT] Colombia financial calculations:`, {
                consumptionValue,
                annualConsumption,
                annualProduction,
                energyOffsetBySolar,
                averagePrice,
                averagePriceInput: data.averagePricePerKWh,
                annualSavings,
                paybackYears,
                totalCost,
                totalLifetimeSavings
            });
            // Cost breakdown (reuse logic, but skip incentives)
            const sysInvCostPercent = getSystemInverterCostPercent(systemSettings, DEFAULT_SYSTEM_SETTINGS);
            const commLegPercent = DEFAULT_USER_SETTINGS.commissioningLegalizationPercentage;
            const warrantyPercent = DEFAULT_USER_SETTINGS.warrantySupportPercentage;
            const monitoringPercent = DEFAULT_USER_SETTINGS.monitoringToolPercentage;
            const sysPanelCompPercent = systemSettings?.panelComponentPercentage ?? DEFAULT_SYSTEM_SETTINGS.panelComponentPercentage;
            const structurePercent = DEFAULT_USER_SETTINGS.structureCostPercentage;
            const costBreakdown = {
                serviciosInstalacionPuestaMarcha: totalCost * sysInvCostPercent,
                costePanel: totalCost * sysPanelCompPercent,
                costeInversor: totalCost * sysInvCostPercent,
                puestaMarchaLegalizacion: totalCost * commLegPercent,
                garantiaSoporteTecnico: totalCost * warrantyPercent,
                herramientaMonitorizacion: totalCost * monitoringPercent,
                estructura: totalCost * structurePercent,
            };
            // Recalculate financial metrics if system size was updated
            if (totalCost !== systemSize * effectivePriceKW) {
                // Recalculate savings based on updated costs
                const updatedAnnualSavings = energyOffsetBySolar * averagePrice;
                const updatedPaybackYears = totalCost > 0 && updatedAnnualSavings > 0 ? totalCost / updatedAnnualSavings : paybackYears;
                const updatedTotalLifetimeSavings = updatedAnnualSavings * systemLifeYears;

                console.log(`[SUBMIT] Colombia - Updated financial calculations:`, {
                    originalTotalCost: systemSize * effectivePriceKW,
                    updatedTotalCost: totalCost,
                    updatedAnnualSavings,
                    updatedPaybackYears,
                    updatedTotalLifetimeSavings
                });
            }

            // IVA for Colombia is 19%
            const ivaRate = getIvaRate('colombia');
            const ivaAmount = totalCost * ivaRate;
            const totalCostWithIva = totalCost + ivaAmount;
            // Save to database
            let senderEmail: string | undefined = 'InformeCalculadoraSolar';
            try {
                const newSubmission = await prisma.submission.create({
                    data: {
                        address: data.location,
                        city: city,
                        country: country,
                        latitude: lat,
                        longitude: lon,
                        userName: (`${data.name} ${data.surnames || ''}`).trim(),
                        userEmail: data.email,
                        userPhone: data.phone,
                        hasUserInfo: true,
                        userConsentGiven: data.consent === 'on',
                        origin: data.origin,
                        pathname: data.pathname,
                        googleSolarData: pvgisData as any,
                        annualProduction: annualProduction,
                        dailyAverage: dailyAverage,
                        efficiency: efficiency,
                        systemSize: systemSize,
                        totalCost: totalCost,
                        costPerWatt: costPerWatt,
                        co2Reduction: co2Reduction,
                        treesPlanted: treesPlanted,
                        currencyCode: 'COP',
                        averageKwhConsumption: consumptionValue,
                        averagePricePerKWh: averagePrice,

                        // Financial savings metrics for Colombia
                        firstYearSavings: annualSavings,
                        lifetimeSavings: totalLifetimeSavings,
                        paybackYears: paybackYears,

                        // New detailed cost fields
                        priceKWUsed: effectivePriceKW,
                        baseInstallationCost: totalCost,
                        costBreakdownJson: { ...costBreakdown },
                        ivaAmount: ivaAmount,
                        totalCostWithIva: totalCostWithIva,

                        // No incentives for Colombia
                        panelApplication: data.panelApplication as PanelApplication | undefined,
                        panelType: data.panelType as PanelType | undefined,

                        // Store selected materials for Colombia
                        selectedPanelName: selectedPanelNameColombia,
                        selectedInverterName: selectedInverterNameColombia,
                        selectedInverterPeakPower: selectedInverterPeakPowerColombia,
                        orthophotoUrl: orthophotoUrl,
                        orthophotoBase64: orthophotoBase64,
                    } as any,
                });
                // Send email if user has SMTP configuration
                let emailUser = null;
                if (domainUser) {
                    // Use domain-matched user if found
                    emailUser = await prisma.user.findUnique({ where: { id: domainUser.id } });
                }

                // Fallback to admin user if no domain user found
                if (!emailUser) {
                    emailUser = await prisma.user.findFirst({
                        where: {
                            email: 'info@wattify.es',
                            smtpHost: { not: null },
                            smtpUser: { not: null },
                            smtpPassword: { not: null }
                        }
                    });
                }

                if (emailUser) {
                    senderEmail = emailUser.smtpFrom || 'InformeCalculadoraSolar';
                    // NO AWAIT: Fire and forget to not block the response
                    // PDF generation is heavy, we don't want the user waiting for it
                    sendSubmissionEmail(newSubmission, emailUser).catch(emailError => {
                        console.error('Background email task failed:', emailError);
                    });
                    console.log('Email task triggered in background using:', domainUser ? 'domain user' : 'admin fallback');
                } else {
                    console.log('No user with SMTP configuration found - email not sent');
                }
                // Return response
                return NextResponse.json(
                    {
                        success: true,
                        message: 'Datos recibidos correctamente',
                        senderEmail: senderEmail,
                        solarData: {
                            annualProduction,
                            dailyAverage,
                            efficiency,
                            systemSize,
                            totalCost,
                            costPerWatt,
                            co2Reduction,
                            treesPlanted,
                            priceKWUsed: effectivePriceKW,
                            baseInstallationCost: totalCost,
                            costBreakdown,
                            ivaAmount,
                            totalCostWithIva,
                            currencyCode: 'COP',
                            averageKwhConsumption: consumptionValue,
                            googleSolarData: pvgisData,
                            country: 'colombia',
                            // Financial calculations
                            estimatedAnnualSavingsAmount: annualSavings,
                            estimatedTotalLifetimeSavingsAmount: totalLifetimeSavings,
                            paybackYears: paybackYears,
                            averagePricePerKWh: averagePrice,

                            // Selected materials for Colombia
                            selectedPanelName: selectedPanelNameColombia,
                            selectedInverterName: selectedInverterNameColombia,
                            selectedInverterPeakPower: selectedInverterPeakPowerColombia,
                        }
                    },
                    { headers: corsHeaders(origin || '') }
                );
            } catch (dbError) {
                console.error('Database error saving submission (Colombia):', dbError);
                if (process.env.NODE_ENV === 'development' || (origin && origin.includes('localhost'))) {
                    console.warn('[SUBMIT] Local dev mode: DB offline, returning simulated success for submit (Colombia)');
                    return NextResponse.json(
                        {
                            success: true,
                            message: 'Datos recibidos correctamente',
                            senderEmail: senderEmail,
                            solarData: {
                                annualProduction,
                                dailyAverage,
                                efficiency,
                                systemSize,
                                totalCost,
                                costPerWatt,
                                co2Reduction,
                                treesPlanted,
                                priceKWUsed: effectivePriceKW,
                                baseInstallationCost: totalCost,
                                costBreakdown,
                                ivaAmount,
                                totalCostWithIva,
                                currencyCode: 'COP',
                                averageKwhConsumption: consumptionValue,
                                googleSolarData: pvgisData,
                                country: 'colombia',
                                estimatedAnnualSavingsAmount: annualSavings,
                                estimatedTotalLifetimeSavingsAmount: totalLifetimeSavings,
                                paybackYears: paybackYears,
                                averagePricePerKWh: averagePrice,
                                selectedPanelName: selectedPanelNameColombia,
                                selectedInverterName: selectedInverterNameColombia,
                                selectedInverterPeakPower: selectedInverterPeakPowerColombia,
                            }
                        },
                        { headers: corsHeaders(origin || '') }
                    );
                }
                return NextResponse.json(
                    { success: false, message: 'Error al guardar los datos en la base de datos' },
                    { status: 500, headers: corsHeaders(origin || '') }
                );
            }
        }

        // Sanitize googleSolarData before DB insert to prevent NaN/Infinity from crashing Prisma
        const sanitizeNumber = (val: any) => (typeof val === 'number' && isFinite(val)) ? val : null;

        googleSolarData.estimatedInstallationCostAmount = sanitizeNumber(googleSolarData.estimatedInstallationCostAmount);
        googleSolarData.estimatedAnnualSavingsAmount = sanitizeNumber(googleSolarData.estimatedAnnualSavingsAmount);
        googleSolarData.estimatedTotalLifetimeSavingsAmount = sanitizeNumber(googleSolarData.estimatedTotalLifetimeSavingsAmount);
        googleSolarData.paybackYears = sanitizeNumber(googleSolarData.paybackYears);
        googleSolarData.monthlyElectricityBillAmount = sanitizeNumber(googleSolarData.monthlyElectricityBillAmount);
        googleSolarData.averageKwhConsumption = sanitizeNumber(googleSolarData.averageKwhConsumption);
        googleSolarData.yearlyEnergyDcKwh = sanitizeNumber(googleSolarData.yearlyEnergyDcKwh);
        googleSolarData.installationSizeKW = sanitizeNumber(googleSolarData.installationSizeKW);

        baseInstallationCostForDB = sanitizeNumber(baseInstallationCostForDB);
        ivaAmountResult = sanitizeNumber(ivaAmountResult);
        totalCostWithIvaResult = sanitizeNumber(totalCostWithIvaResult);
        const finalSystemSize = sanitizeNumber(googleSolarData.installationSizeKW ?? (baseInstallationCostForDB && effectivePriceKW && effectivePriceKW > 0 ? baseInstallationCostForDB / effectivePriceKW : null));

        // Save to database
        let senderEmail: string | undefined = 'InformeCalculadoraSolar';
        try {
            const newSubmission = await prisma.submission.create({
                data: {
                    address: data.location,
                    city: city,
                    country: country,
                    latitude: parseFloat(data.latitude),
                    longitude: parseFloat(data.longitude),
                    userName: (`${data.name} ${data.surnames || ''}`).trim(),
                    userEmail: data.email,
                    userPhone: data.phone,
                    hasUserInfo: true,
                    userConsentGiven: data.consent === 'on',
                    origin: data.origin,
                    pathname: data.pathname,
                    googleSolarData: googleSolarData as any,

                    // Store our primary calculated financial metrics
                    totalCost: googleSolarData.estimatedInstallationCostAmount, // This is base cost before IVA from our calcs or Google's
                    firstYearSavings: googleSolarData.estimatedAnnualSavingsAmount,
                    lifetimeSavings: googleSolarData.estimatedTotalLifetimeSavingsAmount,
                    paybackYears: googleSolarData.paybackYears,
                    currencyCode: finalCurrency, // Use final currency instead of googleSolarData.currencyCode
                    monthlyElectricityBillAmount: googleSolarData.monthlyElectricityBillAmount,
                    averageKwhConsumption: googleSolarData.averageKwhConsumption,
                    averagePricePerKWh: averagePrice,

                    // Store panel preferences from form
                    panelApplication: panelApplication,
                    panelType: panelType,

                    // Store new detailed calculation results
                    priceKWUsed: effectivePriceKW,
                    baseInstallationCost: baseInstallationCostForDB, // The final base cost before IVA
                    selectedPanelName: selectedPanelName,
                    selectedInverterName: selectedInverterName,
                    selectedInverterPeakPower: selectedInverterPeakPower,
                    costBreakdownJson: costBreakdownResult === null ? undefined : { ...costBreakdownResult },
                    ivaAmount: ivaAmountResult,
                    totalCostWithIva: totalCostWithIvaResult,
                    systemSize: finalSystemSize,
                    orthophotoUrl: orthophotoUrl,
                    orthophotoBase64: orthophotoBase64,
                } as any,
            });

            // Send email if user has SMTP configuration
            let emailUser = null;
            if (domainUser) {
                // Use domain-matched user if found
                emailUser = await prisma.user.findUnique({ where: { id: domainUser.id } });
            }

            // Fallback to admin user if no domain user found
            if (!emailUser) {
                emailUser = await prisma.user.findFirst({
                    where: {
                        email: 'info@wattify.es',
                        smtpHost: { not: null },
                        smtpUser: { not: null },
                        smtpPassword: { not: null }
                    }
                });
            }

            if (emailUser) {
                senderEmail = emailUser.smtpFrom || 'InformeCalculadoraSolar';
                // NO AWAIT: Fire and forget
                sendSubmissionEmail(newSubmission, emailUser).catch(emailError => {
                    console.error('Background email task failed:', emailError);
                });
                console.log('Email task triggered in background using:', domainUser ? 'domain user' : 'admin fallback');
            } else {
                console.log('No user with SMTP configuration found - email not sent');
            }

            console.log('Submission saved to database with ID:', newSubmission.id);
        } catch (dbError) {
            console.error('Database error saving submission:', dbError);
            if (process.env.NODE_ENV === 'development' || (origin && origin.includes('localhost'))) {
                console.warn('[SUBMIT] Local dev mode: DB offline, returning simulated success for submit');
                return NextResponse.json(
                    {
                        success: true,
                        message: 'Datos recibidos correctamente',
                        senderEmail: senderEmail,
                        orthophotoUrl: orthophotoUrl,
                        orthophotoBase64: orthophotoBase64,
                        incentiveNote: (country as string) === 'colombia' ? '' : spanishIncentiveNote,
                        averagePricePerKWh: averagePrice
                    },
                    { headers: corsHeaders(origin || '') }
                );
            }
            return NextResponse.json(
                { success: false, message: 'Error al guardar los datos en la base de datos' },
                { status: 500, headers: corsHeaders(origin || '') }
            );
        }

        return NextResponse.json(
            {
                success: true,
                message: 'Datos recibidos correctamente',
                senderEmail: senderEmail,
                orthophotoUrl: orthophotoUrl,
                orthophotoBase64: orthophotoBase64,
                incentiveNote: (country as string) === 'colombia' ? '' : spanishIncentiveNote, // No incentive note for Colombia
                averagePricePerKWh: averagePrice
            },
            { headers: corsHeaders(origin || '') }
        );
    } catch (error) {
        console.error('Error processing submission:', error);
        return NextResponse.json(
            { success: false, message: 'Error al procesar los datos' },
            { status: 400, headers: corsHeaders(request.headers.get('origin') || '') }
        );
    }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: Request) {
    const origin = request.headers.get('origin');

    // For OPTIONS preflight requests, we confirm that the origin is allowed
    // to make a subsequent request (like POST) with the specified methods and headers.
    // The actual API key validation will happen in the POST handler.
    if (origin) {
        // The corsHeaders function already defines 'Access-Control-Allow-Methods': 'POST, OPTIONS'
        // and 'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key'.
        // This tells the browser that a POST request with an X-API-Key from this origin is okay to try.
        return new NextResponse(null, {
            status: 204, // No Content, indicating preflight is successful
            headers: corsHeaders(origin)
        });
    } else {
        // If no origin header is present (highly unlikely for a CORS preflight from a browser),
        // or if we want to be stricter and deny requests without an origin.
        // Returning a non-2xx status without CORS headers will cause the preflight to fail.
        return NextResponse.json(
            { success: false, message: 'Origin header missing for CORS preflight' },
            { status: 400 }
        );
    }
}

