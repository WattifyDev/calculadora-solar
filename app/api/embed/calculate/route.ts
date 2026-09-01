import { NextResponse } from 'next/server';
import { Client, GeocodeResponse, AddressType, Language, ReverseGeocodingLocationType } from "@googlemaps/google-maps-services-js";
import { validateEmbedApiKey, embedRateLimit } from '@/lib/security';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { fetchBuildingInsights, fetchDataLayers } from '@/lib/google-solar';
import type { GoogleSolarData } from '@/lib/types';
import type { BuildingInsightsResponse, SolarPanelConfig } from '@/lib/google-solar-types';
import { PanelApplication, PanelType, Material, User, SystemSetting } from '@/generated/prisma';
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
    calculateSpanishIncentive,
    type DetailedFinancialAnalysis,
    type FinancialConstants,
    DEFAULT_FINANCIAL_CONSTANTS_CO,
    DEFAULT_FINANCIAL_CONSTANTS_GT,
    getColombianFinancialConstants,
    getGuatemalanFinancialConstants
} from '@/lib/solar-financial-calculations';
import { getIvaRate, convertEurToCop, convertEurToGtq } from '@/lib/currency';
import { extractRoofSegments } from '@/lib/google-solar';

// Define the expected request data structure for calculation only
interface EmbedCalculationData {
    consumption: string;
    location: string;
    latitude: string;
    longitude: string;
    polygonCoordinates?: string;
    origin: string;
    pathname: string;
    referrer: string | null;
    averagePricePerKWh?: string;
    panelApplication?: string;
    panelType?: string;
    averagePriceCurrency?: string;
    selectedSegmentIndices?: number[] | string;
}

// New type for cost breakdown
interface CostBreakdown {
    serviciosInstalacionPuestaMarcha: number | null;
    costePanel: number | null;
    costeInversor: number | null;
    puestaMarchaLegalizacion: number | null;
    garantiaSoporteTecnico: number | null;
    herramientaMonitorizacion: number | null;
    estructura: number | null;
}

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

    // Exact match
    if (cleanHostname === cleanDomain) return true;

    // Subdomain match (hostname ends with .domain)
    return cleanHostname.endsWith('.' + cleanDomain);
}

// Helper to handle CORS headers dynamically based on allowed domains
async function corsHeaders(origin: string) {
    const headers = {
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
        'Access-Control-Max-Age': '86400',
    } as Record<string, string>;

    // Handle development environment
    if (process.env.NODE_ENV === 'development') {
        headers['Access-Control-Allow-Origin'] = origin || '*';
        return headers;
    }    // Check if origin is allowed based on user domains
    if (origin) {
        const hostname = getHostnameFromOrigin(origin);
        if (hostname) {
            try {
                // Get all users with domains
                const usersWithDomains = await prisma.user.findMany({
                    where: {
                        domain: {
                            not: null
                        }
                    },
                    select: { domain: true }
                });

                // Check if hostname matches any user domain (including subdomains)
                const isAllowed = usersWithDomains.some(user =>
                    user.domain && isSubdomainOf(hostname, user.domain)
                );

                if (isAllowed) {
                    headers['Access-Control-Allow-Origin'] = origin;
                }
            } catch (error) {
                console.error('Error checking user domains for CORS:', error);
            }
        }
    }

    return headers;
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
function parseAveragePricePerKWh(input: unknown, currency: 'EUR' | 'COP' | 'GTQ' = 'EUR'): number {
    if (typeof input === 'number' && input > 0) return input;
    if (typeof input === 'string') {
        const normalized = input.replace(',', '.').replace(/\s/g, '');
        const value = parseFloat(normalized);
        if (!isNaN(value) && value > 0) return value;
    }
    if (currency === 'COP') return 986; // Colombia rate: 986 COP/kWh
    if (currency === 'GTQ') return 1.60; // Guatemala rate: 1.60 GTQ/kWh
    return 0.20; // Spain/EUR rate: 0.20 EUR/kWh
}

export async function POST(request: Request) {
    try {
        const headersList = await headers();
        const origin = headersList.get('origin');
        const apiKey = headersList.get('x-api-key');
        let city: string | null = null;        // Get CORS headers early to reuse throughout the function
        const cors = await corsHeaders(origin || '');// Validate API key and origin
        const isValidRequest = await validateEmbedApiKey(apiKey, origin);
        if (!isValidRequest) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized' },
                { status: 401, headers: cors }
            );
        }

        // Apply rate limiting based on origin
        try {
            const { isRateLimited } = await embedRateLimit.check(origin || 'unknown', 100);
            if (isRateLimited) {
                return NextResponse.json(
                    { success: false, message: 'Too many requests' },
                    { status: 429, headers: cors }
                );
            }
        } catch {
            // If rate limiting fails, continue but log the error
            console.error('Rate limiting error');
        }

        const body = await request.json();
        const data: EmbedCalculationData = body;

        // Validate required fields for calculation
        if (!data.consumption || !data.location || !data.latitude || !data.longitude) {
            console.log('[CALC] Missing required fields:', { consumption: data.consumption, location: data.location, latitude: data.latitude, longitude: data.longitude });
            return NextResponse.json(
                {
                    success: false,
                    message: 'Los campos consumption, location, latitude y longitude son obligatorios'
                },
                { status: 400, headers: cors }
            );
        }

        // Validate consumption is a positive number
        const consumptionValue = parseFloat(data.consumption);
        if (isNaN(consumptionValue) || consumptionValue <= 0) {
            console.log('[CALC] Invalid consumption value:', data.consumption);
            return NextResponse.json(
                {
                    success: false,
                    message: 'El consumo debe ser un número positivo'
                },
                { status: 400, headers: cors }
            );
        }

        // Validate coordinates
        const latitude = parseFloat(data.latitude);
        const longitude = parseFloat(data.longitude);
        if (isNaN(latitude) || isNaN(longitude)) {
            console.log('[CALC] Invalid coordinates:', { latitude: data.latitude, longitude: data.longitude });
            return NextResponse.json(
                {
                    success: false,
                    message: 'Las coordenadas deben ser números válidos'
                },
                { status: 400, headers: cors }
            );
        }

        // Define default user/system settings (values from Prisma schema defaults)
        const DEFAULT_USER_SETTINGS = {
            inverterCostPercentage: 0.15,
            commissioningLegalizationPercentage: 0.15,
            warrantySupportPercentage: 0.05,
            monitoringToolPercentage: 0.10,
            structureCostPercentage: 0.05,
            installationServicesPercentage: 0.25,
        };
        const DEFAULT_SYSTEM_SETTINGS = {
            inverterCostPercentage: 0.15,
            panelComponentPercentage: 0.25,
        };

        // --- BEGIN: Fetch User and System Settings ---
        let systemSettings: SystemSetting | null = null;
        let effectivePriceKW: number = DEFAULT_FINANCIAL_CONSTANTS_ES.installationCostPerKw; // Default EUR value
        let userDefinedCurrency: 'EUR' | 'COP' | null = null;

        let invCostPercent = DEFAULT_USER_SETTINGS.inverterCostPercentage;
        let commLegPercent = DEFAULT_USER_SETTINGS.commissioningLegalizationPercentage;
        let warrantyPercent = DEFAULT_USER_SETTINGS.warrantySupportPercentage;
        let monitoringPercent = DEFAULT_USER_SETTINGS.monitoringToolPercentage;
        let structurePercent = DEFAULT_USER_SETTINGS.structureCostPercentage;
        let installServicesPercent = DEFAULT_USER_SETTINGS.installationServicesPercentage;

        if (origin) {
            try {
                const originHostname = getHostnameFromOrigin(origin);
                if (originHostname) {
                    // Use a separate variable for the partial select
                    const userDomainSettings = await prisma.user.findMany({
                        where: { domain: { not: null } },
                        select: {
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
                    });
                    const matched = userDomainSettings.find(user => user.domain && isSubdomainOf(originHostname, user.domain));
                    if (matched) {
                        if (matched.priceKW !== null) effectivePriceKW = matched.priceKW;
                        userDefinedCurrency = matched.priceKWCurrency as 'EUR' | 'COP' | null;

                        if (matched.inverterCostPercentage !== null) invCostPercent = matched.inverterCostPercentage;
                        if (matched.commissioningLegalizationPercentage !== null) commLegPercent = matched.commissioningLegalizationPercentage;
                        if (matched.warrantySupportPercentage !== null) warrantyPercent = matched.warrantySupportPercentage;
                        if (matched.monitoringToolPercentage !== null) monitoringPercent = matched.monitoringToolPercentage;
                        if (matched.structureCostPercentage !== null) structurePercent = matched.structureCostPercentage;
                        if (matched.installationServicesPercentage !== null) installServicesPercent = matched.installationServicesPercentage;
                    }
                }
            } catch (e) {
                console.error('[CALC] Error fetching user settings by domain:', e);
            }
        }

        try {
            systemSettings = await prisma.systemSetting.findFirst(); // Assuming one global system setting
        } catch (e) {
            console.error('[CALC] Error fetching system settings:', e);
        }
        // --- END: Fetch User and System Settings ---

        // Get environment variables
        const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
        const googleSolarApiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!googleMapsApiKey) {
            console.log('[CALC] Google Maps API key not configured');
            return NextResponse.json(
                { success: false, message: 'Google Maps API key not configured' },
                { status: 500, headers: cors }
            );
        }

        // --- Fetch orthophoto (RGB) from Google Solar API ---
        let orthophotoUrl: string | null = null;
        if (googleSolarApiKey) {
            try {
                console.log('[CALC] Attempting to fetch orthophoto for coordinates:', { latitude, longitude });
                const tiffUrl = await fetchDataLayers({ latitude, longitude }, googleSolarApiKey);
                console.log('[CALC] Orthophoto TIFF URL:', tiffUrl);

                // Convert TIFF URL to PNG URL using our conversion endpoint
                if (tiffUrl) {
                    // Determine the base URL dynamically from the request
                    const host = headersList.get('host');
                    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
                    const baseUrl = `${protocol}://${host}`;

                    orthophotoUrl = `${baseUrl}/api/orthophoto?url=${encodeURIComponent(tiffUrl)}`;
                    console.log('[CALC] Converted orthophoto URL:', orthophotoUrl);
                }
            } catch (e) {
                console.error('[CALC] Error fetching orthophoto:', e);
            }
        } else {
            console.warn('[CALC] No Google Solar API key available for orthophoto');
        }

        // Validate coordinates and location with Google Maps
        let country: 'spain' | 'colombia' | 'guatemala' = 'spain';
        let enforcedCurrency: 'EUR' | 'COP' | 'GTQ' = 'EUR';
        try {
            const geocodeResponse = await googleMapsClient
                .reverseGeocode({
                    params: {
                        latlng: { lat: latitude, lng: longitude },
                        key: googleMapsApiKey,
                        language: Language.es,
                        result_type: [AddressType.street_address, AddressType.route, AddressType.locality, AddressType.political],
                        location_type: [ReverseGeocodingLocationType.ROOFTOP, ReverseGeocodingLocationType.RANGE_INTERPOLATED, ReverseGeocodingLocationType.GEOMETRIC_CENTER]
                    },
                });

            console.log('[CALC] Geocode response status:', geocodeResponse.data.status);

            if (geocodeResponse.data.status !== 'OK' && geocodeResponse.data.status !== 'ZERO_RESULTS') {
                console.log('[CALC] Geocode failed:', geocodeResponse.data.status);
                return NextResponse.json(
                    {
                        success: false,
                        message: 'No se pudo validar la ubicación proporcionada'
                    },
                    { status: 400, headers: cors }
                );
            }

            // Determine country
            if (geocodeResponse.data.results.length > 0) {
                for (const component of geocodeResponse.data.results[0].address_components) {
                    if (component.types.includes(AddressType.country)) {
                        if (component.short_name === 'CO') { country = 'colombia'; enforcedCurrency = 'COP'; }
                        if (component.short_name === 'ES') { country = 'spain'; enforcedCurrency = 'EUR'; }
                        if (component.short_name === 'GT') { country = 'guatemala'; enforcedCurrency = 'GTQ'; }
                    }
                }
            }

            // If Colombia or Guatemala, branch to PVGIS logic here and return
            if (country === 'colombia' || country === 'guatemala') {
                const isGuatemala = country === 'guatemala';
                const targetCurrency = isGuatemala ? 'GTQ' : 'COP';

                console.log(`[CALC] ${country} detected. userDefinedCurrency: ${userDefinedCurrency}, effectivePriceKW before: ${effectivePriceKW}`);
                if (!userDefinedCurrency || userDefinedCurrency === targetCurrency) {
                    try {
                        const countryConstants = isGuatemala 
                            ? await getGuatemalanFinancialConstants() 
                            : await getColombianFinancialConstants();
                        effectivePriceKW = countryConstants.installationCostPerKw;
                        console.log(`[CALC] Set effectivePriceKW from dynamic constants: ${effectivePriceKW} ${targetCurrency}/kW`);
                    } catch (error) {
                        console.error(`[CALC] Error getting dynamic ${country} constants for effectivePriceKW:`, error);
                        effectivePriceKW = isGuatemala 
                            ? DEFAULT_FINANCIAL_CONSTANTS_GT.installationCostPerKw 
                            : DEFAULT_FINANCIAL_CONSTANTS_CO.installationCostPerKw;
                        console.log(`[CALC] Set effectivePriceKW from fallback constants: ${effectivePriceKW} ${targetCurrency}/kW`);
                    }
                } else {
                    console.log(`[CALC] Using user-defined price: ${effectivePriceKW} ${userDefinedCurrency}/kW`);
                }

                // Fetch PVGIS data
                const lat = latitude;
                const lon = longitude;
                const consumptionValue = parseFloat(data.consumption);

                // Parse averagePricePerKWh for calculations
                const averagePrice = parseAveragePricePerKWh(data.averagePricePerKWh, targetCurrency);

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
                            console.log(`[CALC] Calculated roof area from polygon: ${area} m²`);

                            // Estimate system size based on roof area
                            // Assume ~6-8 m² per kWp (accounting for spacing, shadows, etc.)
                            const estimatedSystemSizeFromArea = Math.round((area / 7) * 10) / 10; // 7 m²/kWp average

                            // Use consumption-based or area-based estimate, whichever is smaller (more realistic)
                            const annualConsumption = consumptionValue * 12;
                            // Colombia produces ~1300-1400 kWh/kWp/year (using conservative 1300 for safety margin)
                            const consumptionBasedSize = Math.round((annualConsumption / 1300) * 10) / 10;

                            peakpower = Math.max(1, Math.min(estimatedSystemSizeFromArea, consumptionBasedSize));
                            console.log(`[CALC] Colombia system size - Area-based: ${estimatedSystemSizeFromArea}kWp, Consumption-based: ${consumptionBasedSize}kWp, Final: ${peakpower}kWp`);
                        }
                    } catch (e) {
                        console.warn('[CALC] Could not parse polygon coordinates:', e);
                    }
                }

                // Fallback: use consumption-based calculation
                if (peakpower === 1) {
                    const annualConsumption = consumptionValue * 12;
                    // Colombia produces ~1300-1400 kWh/kWp/year (using conservative 1300 for safety margin)
                    peakpower = Math.max(1, Math.round((annualConsumption / 1300) * 10) / 10);
                    console.log(`[CALC] Colombia system size (consumption-based): ${peakpower}kWp`);
                }

                // --- BEGIN: Panel Selection and Final System Size Calculation for Colombia ---
                let selectedPanelName: string | null = null;
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
                            selectedPanelName = selectedPanel.name;
                            console.log(`[CALC] Colombia - Selected panel: ${selectedPanelName}`);

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

                                        console.log('[CALC] Colombia panel calculation:', {
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
                                                console.log(`[CALC] Colombia - Updating system size from ${peakpower}kW to ${newSystemSize}kW based on panel area constraints`);
                                                finalPeakpower = newSystemSize;
                                            }
                                        }
                                    }
                                } catch (e) {
                                    console.warn('[CALC] Colombia - Could not parse polygon coordinates for area calculation:', e);
                                }
                            }
                        }
                    } catch (materialError) {
                        console.error('[CALC] Colombia - Error fetching panel materials:', materialError);
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
                console.log(`[CALC] PVGIS URL for Colombia: ${pvgisUrl}`);
                const pvgisResponse = await fetch(pvgisUrl, { headers: { 'Accept': 'application/json' } });
                if (!pvgisResponse.ok) {
                    const errorText = await pvgisResponse.text();
                    console.error(`[CALC] PVGIS API error: ${pvgisResponse.status} - ${errorText}`);
                    return NextResponse.json({ success: false, message: 'Error al consultar PVGIS', details: errorText }, { status: 500, headers: cors });
                }
                const pvgisData = await pvgisResponse.json();
                console.log(`[CALC] PVGIS response for ${finalPeakpower}kWp system:`, pvgisData);

                // Validate PVGIS response structure
                if (!pvgisData.outputs || !pvgisData.outputs.monthly || !pvgisData.outputs.monthly.fixed) {
                    console.error('[CALC] Invalid PVGIS response structure:', pvgisData);
                    return NextResponse.json({
                        success: false,
                        message: 'Error en la respuesta de PVGIS: datos inválidos',
                        debug: { peakpower: finalPeakpower, pvgisData }
                    }, { status: 500, headers: cors });
                }

                // Map PVGIS data - use totals if available, otherwise sum monthly data
                let annualProduction: number;
                if (pvgisData.outputs.totals?.fixed?.E_y) {
                    // Use the more accurate annual total from PVGIS
                    annualProduction = pvgisData.outputs.totals.fixed.E_y;
                    console.log(`[CALC] Using PVGIS annual total (E_y): ${annualProduction} kWh`);
                } else {
                    // Fallback to manual summation of monthly data
                    const monthly = pvgisData.outputs.monthly.fixed;
                    if (!Array.isArray(monthly) || monthly.length === 0) {
                        console.error('[CALC] No monthly data in PVGIS response:', monthly);
                        return NextResponse.json({
                            success: false,
                            message: 'Error: No se encontraron datos mensuales en PVGIS',
                            debug: { peakpower: finalPeakpower, monthly }
                        }, { status: 500, headers: cors });
                    }
                    annualProduction = monthly.map((m: any) => m.E_m || 0).reduce((a: number, b: number) => a + b, 0);
                    console.log(`[CALC] Using summed monthly data: ${annualProduction} kWh`);
                }
                console.log(`[CALC] Colombia calculated annual production: ${annualProduction} kWh for ${finalPeakpower}kWp system`);
                const dailyAverage = annualProduction / 365;
                const efficiency = 100 - loss;
                const systemSize = finalPeakpower; // Use final calculated system size
                console.log(`[CALC] Before cost calculation - systemSize: ${systemSize}kW, effectivePriceKW: ${effectivePriceKW} COP/kW`);
                const totalCost = systemSize * effectivePriceKW;
                console.log(`[CALC] Calculated totalCost: ${totalCost} COP`);
                const costPerWatt = effectivePriceKW / 1000;
                const co2Reduction = annualProduction * 0.0005;
                const treesPlanted = Math.round(annualProduction * 0.02);

                // --- BEGIN: Inverter Selection for Colombia ---
                let selectedInverterName: string | null = null;
                let selectedInverterPeakPower: number | null = null;

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
                                selectedInverterName = closestInverter.name;
                                selectedInverterPeakPower = closestInverter.peakPower;
                                console.log(`[CALC] Colombia - Selected inverter: ${selectedInverterName} (${selectedInverterPeakPower}kW) for system size: ${systemSize}kW`);
                            }
                        }
                    } catch (invError) {
                        console.error('[CALC] Colombia - Error fetching inverters:', invError);
                    }
                }
                // --- END: Panel and Inverter Selection for Colombia ---

                // Cost breakdown (reuse logic, but skip incentives)
                const sysPanelCompPercent = systemSettings?.panelComponentPercentage ?? DEFAULT_SYSTEM_SETTINGS.panelComponentPercentage;
                const costBreakdown = {
                    serviciosInstalacionPuestaMarcha: totalCost * installServicesPercent,
                    costePanel: totalCost * sysPanelCompPercent,
                    costeInversor: totalCost * invCostPercent,
                    puestaMarchaLegalizacion: totalCost * commLegPercent,
                    garantiaSoporteTecnico: totalCost * warrantyPercent,
                    herramientaMonitorizacion: totalCost * monitoringPercent,
                    estructura: totalCost * structurePercent,
                };
                // IVA rate based on country (Colombia 19%, Guatemala 12%)
                const ivaRate = getIvaRate(country);
                const ivaAmount = totalCost * ivaRate;
                const totalCostWithIva = totalCost + ivaAmount;
                // Calculate annual savings
                const annualConsumption = consumptionValue * 12; // Monthly to annual consumption
                const energyOffsetBySolar = Math.min(annualProduction, annualConsumption); // Can't offset more than you consume
                const annualSavings = energyOffsetBySolar * averagePrice; // Savings = offset energy * price per kWh

                // Calculate payback years (simple calculation)
                const paybackYears = totalCost > 0 && annualSavings > 0 ? totalCost / annualSavings : null;

                // Calculate lifetime savings (assuming 25 year system life)
                const systemLifeYears = 25;
                const totalLifetimeSavings = annualSavings * systemLifeYears;

                console.log(`[CALC] ${country} financial calculations:`, {
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

                // Create a response structure that matches the Spain format for consistency
                const pvgisSolarData: import('@/lib/types').GoogleSolarData = {
                    initialConsumption: consumptionValue,
                    maxSunshineHoursPerYear: null, // PVGIS doesn't provide this
                    maxArrayAreaMeters2: null,      // PVGIS doesn't provide this
                    maxArrayPanelsCount: null,      // PVGIS doesn't provide this
                    panelsCount: Math.round(systemSize / 0.4), // Estimate panel count (assuming 400W panels)
                    yearlyEnergyDcKwh: annualProduction / 0.95, // Convert AC back to DC estimate
                    estimatedAnnualSavingsAmount: annualSavings,
                    estimatedTotalLifetimeSavingsAmount: totalLifetimeSavings,
                    estimatedInstallationCostAmount: totalCost,
                    paybackYears: paybackYears,
                    currencyCode: targetCurrency,
                    monthlyElectricityBillAmount: (consumptionValue * averagePrice),
                    averageKwhConsumption: consumptionValue,
                    orthophotoUrl: orthophotoUrl
                };

                // Return mapped data with consistent structure
                return NextResponse.json({
                    success: true,
                    solarData: {
                        ...pvgisSolarData,
                        // Additional fields for compatibility
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
                        averagePricePerKWh: averagePrice,
                        country: country,
                        // Selected materials
                        selectedPanelName,
                        selectedInverterName,
                        selectedInverterPeakPower,
                        // Keep PVGIS data for debugging/reference
                        googleSolarData: pvgisData,
                        orthophotoUrl: orthophotoUrl,
                    },
                    pvgis: true
                }, { status: 200, headers: cors });
            }

            // Verify the location is in Spain
            const isInSpain = geocodeResponse.data.results.some(result =>
                result.address_components.some(component =>
                    component.types.includes(AddressType.country) &&
                    component.short_name === 'ES'
                )
            );

            if (!isInSpain) {
                console.log('[CALC] Location is not in Spain');
                return NextResponse.json(
                    {
                        success: false,
                        message: 'La ubicación debe estar en España'
                    },
                    { status: 400, headers: cors }
                );
            }



            // Extract city from address_components
            const addressComponents = geocodeResponse.data.results[0]?.address_components;
            if (addressComponents) {
                for (const component of addressComponents) {
                    if (component.types.includes(AddressType.locality)) {
                        city = component.long_name;
                        break;
                    }
                }
            }
        } catch (error) {
            console.error('[CALC] Geocoding error:', error);
            return NextResponse.json(
                {
                    success: false,
                    message: 'Error al validar la ubicación'
                },
                { status: 400, headers: cors }
            );
        }

        // Determine final currency - respect user choice if provided, otherwise use country-based enforcement
        let finalCurrency: 'EUR' | 'COP' | 'GTQ' = enforcedCurrency;
        if (data.averagePriceCurrency && (data.averagePriceCurrency === 'EUR' || data.averagePriceCurrency === 'COP' || data.averagePriceCurrency === 'GTQ')) {
            finalCurrency = data.averagePriceCurrency;
            console.log(`[CALC] Using user-selected currency: ${finalCurrency} (country would enforce: ${enforcedCurrency})`);
        } else {
            console.log(`[CALC] Using country-enforced currency: ${finalCurrency}`);
        }

        // Select financial constants based on final currency
        let FINANCIAL_CONSTANTS = finalCurrency === 'COP'
            ? DEFAULT_FINANCIAL_CONSTANTS_CO
            : finalCurrency === 'GTQ'
            ? DEFAULT_FINANCIAL_CONSTANTS_GT
            : DEFAULT_FINANCIAL_CONSTANTS_ES;

        if (finalCurrency === 'COP') {
            try {
                FINANCIAL_CONSTANTS = await getColombianFinancialConstants();
            } catch (error) {
                console.error('[CALC] Error getting dynamic Colombian constants:', error);
            }
        } else if (finalCurrency === 'GTQ') {
            try {
                FINANCIAL_CONSTANTS = await getGuatemalanFinancialConstants();
            } catch (error) {
                console.error('[CALC] Error getting dynamic Guatemalan constants:', error);
            }
        }

        // Update effectivePriceKW to match the final currency if user hasn't defined their own OR if currencies don't match
        if (!userDefinedCurrency || userDefinedCurrency !== finalCurrency) {
            if (finalCurrency === 'COP') {
                effectivePriceKW = FINANCIAL_CONSTANTS.installationCostPerKw;
                console.log(`[CALC] Using COP price: ${effectivePriceKW} COP/kW`);
            } else if (finalCurrency === 'GTQ') {
                effectivePriceKW = FINANCIAL_CONSTANTS.installationCostPerKw;
                console.log(`[CALC] Using GTQ price: ${effectivePriceKW} GTQ/kW`);
            } else if (finalCurrency === 'EUR') {
                effectivePriceKW = DEFAULT_FINANCIAL_CONSTANTS_ES.installationCostPerKw;
                console.log(`[CALC] Using EUR price: ${effectivePriceKW} EUR/kW`);
            }
        } else {
            console.log(`[CALC] Using user-defined price: ${effectivePriceKW} ${userDefinedCurrency}/kW (matches final currency: ${finalCurrency})`);
        }

        console.log(`[CALC] Final settings - Currency: ${finalCurrency}, Price/kW: ${effectivePriceKW}, Country: ${country}`);

        // Initialize Google Solar Data
        const googleSolarData: import('@/lib/types').GoogleSolarData = {
            initialConsumption: consumptionValue,
            maxSunshineHoursPerYear: null,
            maxArrayAreaMeters2: null,
            maxArrayPanelsCount: null,
            panelsCount: null,
            yearlyEnergyDcKwh: null,
            estimatedAnnualSavingsAmount: null,
            estimatedTotalLifetimeSavingsAmount: null,
            estimatedInstallationCostAmount: null,
            paybackYears: null,
            currencyCode: finalCurrency,
            monthlyElectricityBillAmount: null,
            averageKwhConsumption: null
        };

        // Add new fields for detailed response
        let selectedPanelName: string | null = null;
        let selectedInverterName: string | null = null;
        let selectedInverterPeakPower: number | null = null;
        let costBreakdown: CostBreakdown | null = null;
        let ivaAmount: number | null = null;
        let totalCostWithIva: number | null = null;

        // Parse panel preferences from request
        const panelApplication = data.panelApplication as PanelApplication | undefined;
        const panelType = data.panelType as PanelType | undefined;
        console.log('[CALC] Panel preferences:', { panelApplication, panelType });

        // Parse averagePricePerKWh at the top so it's always available
        const averagePrice = parseAveragePricePerKWh(data.averagePricePerKWh, finalCurrency);
        console.log(`[CALC] Final currency: ${finalCurrency}, Average price: ${averagePrice}, EffectivePriceKW: ${effectivePriceKW}`);

        // Fetch Google Solar Data if API key is available
        if (googleSolarApiKey) {
            const solarInsights: BuildingInsightsResponse | null = await fetchBuildingInsights(
                { latitude, longitude },
                googleSolarApiKey
            );
            console.log('[CALC] Google Solar API response:', solarInsights ? 'Received' : 'Not received');

            if (solarInsights && solarInsights.solarPotential) {
                const { solarPotential } = solarInsights;
                googleSolarData.maxSunshineHoursPerYear = solarPotential.maxSunshineHoursPerYear ?? null;
                googleSolarData.maxArrayAreaMeters2 = solarPotential.maxArrayAreaMeters2 ?? null;
                googleSolarData.maxArrayPanelsCount = solarPotential.maxArrayPanelsCount ?? null;
                console.log('[CALC] Solar potential:', {
                    maxSunshineHoursPerYear: googleSolarData.maxSunshineHoursPerYear,
                    maxArrayAreaMeters2: googleSolarData.maxArrayAreaMeters2,
                    maxArrayPanelsCount: googleSolarData.maxArrayPanelsCount
                });

                // Set currency code from final currency determination
                googleSolarData.currencyCode = finalCurrency;

                // Parse selected roof segments from request if provided
                let selectedSegmentIndices: number[] | undefined = undefined;
                if (data.selectedSegmentIndices) {
                    if (Array.isArray(data.selectedSegmentIndices)) {
                        selectedSegmentIndices = data.selectedSegmentIndices.map(Number);
                    } else if (typeof data.selectedSegmentIndices === 'string') {
                        try {
                            selectedSegmentIndices = JSON.parse(data.selectedSegmentIndices).map(Number);
                        } catch {
                            selectedSegmentIndices = undefined;
                        }
                    }
                }
                const roofSegments = extractRoofSegments(solarPotential, selectedSegmentIndices);
                googleSolarData.roofSegments = roofSegments;
                console.log('[CALC] Extracted roof segments count:', roofSegments.length);

                // --- Detailed Financial Calculation for Spain ---
                const monthlyKWhEnergyConsumption = consumptionValue;
                const annualKWhEnergyConsumption = calculateAnnualKWhEnergyConsumption(monthlyKWhEnergyConsumption);
                googleSolarData.averageKwhConsumption = monthlyKWhEnergyConsumption;
                googleSolarData.monthlyElectricityBillAmount = monthlyKWhEnergyConsumption * averagePrice;
                console.log('[CALC] Consumption:', { monthlyKWhEnergyConsumption, annualKWhEnergyConsumption });

                let analysis: DetailedFinancialAnalysis | null = null;
                let usedSource: 'db' | 'google' = 'google';

                // Try to use DB panel/material if user provided preferences and Google returned area info
                if (
                    panelApplication &&
                    panelType &&
                    solarPotential.maxArrayAreaMeters2 &&
                    solarPotential.maxArrayAreaMeters2 > 0 &&
                    solarPotential.panelCapacityWatts
                ) {
                    try {
                        const availablePanels = await prisma.material.findMany({
                            where: {
                                type: "PANEL",
                                panelApplication: panelApplication,
                                panelType: panelType,
                                area: { gt: 0 }
                            }
                        });
                        console.log('[CALC] Available panels from DB:', availablePanels.length);

                        if (availablePanels.length > 0) {
                            const selectedPanel = availablePanels[0];
                            selectedPanelName = selectedPanel.name;
                            const areaPerPanel = selectedPanel.area;
                            console.log('[CALC] Selected panel from DB:', selectedPanel);

                            if (areaPerPanel && areaPerPanel > 0) {
                                // Calculate max panels by area
                                const maxPanelsByArea = Math.floor(solarPotential.maxArrayAreaMeters2 / areaPerPanel);

                                // Calculate panels needed based on consumption and actual panel wattage
                                // Use a more conservative approach: assume 1200 kWh per kWp per year for Spain
                                const annualConsumption = calculateAnnualKWhEnergyConsumption(consumptionValue);
                                const panelWattage = solarPotential.panelCapacityWatts || 400; // Default to 400W if not available
                                const kwhPerPanelPerYear = (panelWattage / 1000) * 1200; // Conservative production estimate
                                const panelsNeededByConsumption = Math.ceil(annualConsumption / kwhPerPanelPerYear);

                                // Use the minimum of area-limited and consumption-based calculation
                                const calculatedPanelsCount = Math.min(panelsNeededByConsumption, maxPanelsByArea);

                                console.log('[CALC] Panel calculation details:', {
                                    maxPanelsByArea,
                                    panelsNeededByConsumption,
                                    calculatedPanelsCount,
                                    panelWattage,
                                    kwhPerPanelPerYear,
                                    annualConsumption
                                });

                                if (calculatedPanelsCount > 0) {
                                    // Calculate all financials based on DB panel
                                    const installationSizeKW = calculateInstallationSizeKW(calculatedPanelsCount, solarPotential.panelCapacityWatts);

                                    // --- NEW: Base Installation Cost using effectivePriceKW ---
                                    const baseInstallationCost = installationSizeKW * effectivePriceKW;
                                    console.log(`[CALC] Base installation cost (DB path): ${baseInstallationCost} (Size: ${installationSizeKW}kW, Price/kW: ${effectivePriceKW})`);

                                    // Estimate DC kWh per year per panel (use best Google config as reference if available)
                                    let yearlyEnergyDcKwh = null;

                                    // Calculate production based on the actual panels and system size
                                    const systemSizeKW = calculateInstallationSizeKW(calculatedPanelsCount, panelWattage);
                                    // Use conservative 1200 kWh/kWp/year for Spain, then convert to DC
                                    const conservativeAcProduction = systemSizeKW * 1200;
                                    // Convert AC back to DC using dcToAcDerate factor (reverse calculation)
                                    yearlyEnergyDcKwh = conservativeAcProduction / FINANCIAL_CONSTANTS.dcToAcDerate;

                                    console.log('[CALC] Production calculation:', {
                                        systemSizeKW,
                                        conservativeAcProduction,
                                        yearlyEnergyDcKwh,
                                        dcToAcDerate: FINANCIAL_CONSTANTS.dcToAcDerate
                                    });

                                    const initialAcKwhPerYear = yearlyEnergyDcKwh ? calculateInitialAcKwhPerYear(yearlyEnergyDcKwh, {
                                        ...FINANCIAL_CONSTANTS,
                                        averagePricePerKWh: averagePrice,
                                        installationLifeSpan: solarPotential.panelLifetimeYears ?? FINANCIAL_CONSTANTS.installationLifeSpan,
                                    }) : null;
                                    const lifetimeProductionAcKwh = initialAcKwhPerYear ? calculateLifetimeProductionAcKwh(initialAcKwhPerYear, {
                                        ...FINANCIAL_CONSTANTS,
                                        averagePricePerKWh: averagePrice,
                                        installationLifeSpan: solarPotential.panelLifetimeYears ?? FINANCIAL_CONSTANTS.installationLifeSpan,
                                    }) : null;
                                    const costOfElectricityWithoutSolar = calculateCostOfElectricityWithoutSolar(annualKWhEnergyConsumption, {
                                        ...FINANCIAL_CONSTANTS,
                                        averagePricePerKWh: averagePrice,
                                        installationLifeSpan: solarPotential.panelLifetimeYears ?? FINANCIAL_CONSTANTS.installationLifeSpan,
                                    });
                                    const remainingLifetimeUtilityBill = initialAcKwhPerYear ? calculateRemainingLifetimeUtilityBill(annualKWhEnergyConsumption, initialAcKwhPerYear, {
                                        ...FINANCIAL_CONSTANTS,
                                        averagePricePerKWh: averagePrice,
                                        installationLifeSpan: solarPotential.panelLifetimeYears ?? FINANCIAL_CONSTANTS.installationLifeSpan,
                                    }) : null;

                                    // Pass baseInstallationCost directly
                                    const totalCostWithSolar = (baseInstallationCost && remainingLifetimeUtilityBill !== null) ? calculateTotalCostWithSolar(baseInstallationCost, remainingLifetimeUtilityBill, {
                                        ...FINANCIAL_CONSTANTS,
                                        averagePricePerKWh: averagePrice,
                                        installationLifeSpan: solarPotential.panelLifetimeYears ?? FINANCIAL_CONSTANTS.installationLifeSpan,
                                    }) : null;
                                    // --- INCENTIVE LOGIC FOR SPAIN ---
                                    let incentives = 0;
                                    if (baseInstallationCost && baseInstallationCost > 0) {
                                        incentives = calculateSpanishIncentive(baseInstallationCost);
                                    }

                                    // Override financialConstants with incentives
                                    const financialConstantsWithIncentives = {
                                        ...FINANCIAL_CONSTANTS,
                                        averagePricePerKWh: averagePrice,
                                        installationLifeSpan: solarPotential.panelLifetimeYears ?? FINANCIAL_CONSTANTS.installationLifeSpan,
                                        incentives,
                                    };

                                    // Recalculate all financials with incentives
                                    const costOfElectricityWithoutSolarWithIncentives = calculateCostOfElectricityWithoutSolar(annualKWhEnergyConsumption, financialConstantsWithIncentives);
                                    const remainingLifetimeUtilityBillWithIncentives = initialAcKwhPerYear ? calculateRemainingLifetimeUtilityBill(annualKWhEnergyConsumption, initialAcKwhPerYear, financialConstantsWithIncentives) : null;
                                    const totalCostWithSolarWithIncentives = (baseInstallationCost && remainingLifetimeUtilityBillWithIncentives !== null) ? calculateTotalCostWithSolar(baseInstallationCost, remainingLifetimeUtilityBillWithIncentives, financialConstantsWithIncentives) : null;
                                    const totalLifetimeSavings = (costOfElectricityWithoutSolarWithIncentives && totalCostWithSolarWithIncentives !== null) ? calculateTotalSavings(costOfElectricityWithoutSolarWithIncentives, totalCostWithSolarWithIncentives) : null;
                                    const paybackYears = (baseInstallationCost && initialAcKwhPerYear) ? calculatePaybackYears(baseInstallationCost, annualKWhEnergyConsumption, initialAcKwhPerYear, financialConstantsWithIncentives) : null;
                                    const annualSavings = (totalLifetimeSavings !== null && solarPotential.panelLifetimeYears) ? totalLifetimeSavings / solarPotential.panelLifetimeYears : null;

                                    analysis = {
                                        panelsCount: calculatedPanelsCount ?? 0,
                                        yearlyEnergyDcKwh: yearlyEnergyDcKwh ?? 0,
                                        initialAcKwhPerYear: initialAcKwhPerYear ?? 0,
                                        installationSizeKW: installationSizeKW ?? 0,
                                        installationCost: baseInstallationCost ?? 0,
                                        lifetimeProductionAcKwh: lifetimeProductionAcKwh ?? 0,
                                        remainingLifetimeUtilityBill: remainingLifetimeUtilityBillWithIncentives ?? 0,
                                        totalCostWithSolar: totalCostWithSolarWithIncentives ?? 0,
                                        costOfElectricityWithoutSolar: costOfElectricityWithoutSolarWithIncentives ?? 0,
                                        totalLifetimeSavings: totalLifetimeSavings ?? 0,
                                        annualSavings: annualSavings ?? undefined,
                                        paybackYears: paybackYears ?? null
                                    };
                                    usedSource = 'db';
                                }
                            }
                        }
                    } catch (materialError) {
                        console.error('[CALC] Error fetching or processing panel materials:', materialError);
                    }
                }

                // If no DB panel/material was used, fallback to Google config loop
                if (!analysis && solarPotential.solarPanelConfigs && solarPotential.solarPanelConfigs.length > 0 && solarPotential.panelCapacityWatts) {
                    let bestAnalysis: DetailedFinancialAnalysis | null = null;
                    for (const config of solarPotential.solarPanelConfigs) {
                        if (!config.panelsCount || !config.yearlyEnergyDcKwh) continue;

                        const initialAcKwhPerYear = calculateInitialAcKwhPerYear(config.yearlyEnergyDcKwh, {
                            ...FINANCIAL_CONSTANTS,
                            averagePricePerKWh: averagePrice,
                            installationLifeSpan: solarPotential.panelLifetimeYears ?? FINANCIAL_CONSTANTS.installationLifeSpan,
                        });
                        const installationSizeKW = calculateInstallationSizeKW(config.panelsCount, solarPotential.panelCapacityWatts);

                        // --- NEW: Base Installation Cost using effectivePriceKW ---
                        const baseInstallationCost = installationSizeKW * effectivePriceKW;
                        console.log(`[CALC] Base installation cost (Google config path): ${baseInstallationCost} (Size: ${installationSizeKW}kW, Price/kW: ${effectivePriceKW})`);

                        // --- INCENTIVE LOGIC FOR SPAIN ---
                        let incentives = 0;
                        if (baseInstallationCost && baseInstallationCost > 0) {
                            incentives = calculateSpanishIncentive(baseInstallationCost);
                        }

                        // Override financialConstants with incentives
                        const financialConstantsWithIncentives = {
                            ...FINANCIAL_CONSTANTS,
                            averagePricePerKWh: averagePrice,
                            installationLifeSpan: solarPotential.panelLifetimeYears ?? FINANCIAL_CONSTANTS.installationLifeSpan,
                            incentives,
                        };

                        const costOfElectricityWithoutSolar = calculateCostOfElectricityWithoutSolar(annualKWhEnergyConsumption, financialConstantsWithIncentives);
                        const lifetimeProductionAcKwh = calculateLifetimeProductionAcKwh(initialAcKwhPerYear, financialConstantsWithIncentives);
                        const remainingLifetimeUtilityBill = calculateRemainingLifetimeUtilityBill(annualKWhEnergyConsumption, initialAcKwhPerYear, financialConstantsWithIncentives);
                        const totalCostWithSolar = calculateTotalCostWithSolar(baseInstallationCost, remainingLifetimeUtilityBill, financialConstantsWithIncentives);
                        const totalLifetimeSavings = calculateTotalSavings(costOfElectricityWithoutSolar, totalCostWithSolar);
                        const paybackYears = calculatePaybackYears(baseInstallationCost, annualKWhEnergyConsumption, initialAcKwhPerYear, financialConstantsWithIncentives);
                        const annualSavings = totalLifetimeSavings / financialConstantsWithIncentives.installationLifeSpan;

                        const currentAnalysis: DetailedFinancialAnalysis = {
                            panelsCount: config.panelsCount,
                            yearlyEnergyDcKwh: config.yearlyEnergyDcKwh,
                            initialAcKwhPerYear,
                            installationSizeKW,
                            installationCost: baseInstallationCost,
                            lifetimeProductionAcKwh,
                            remainingLifetimeUtilityBill,
                            totalCostWithSolar,
                            costOfElectricityWithoutSolar,
                            totalLifetimeSavings,
                            annualSavings,
                            paybackYears
                        };
                        console.log('[CALC] Analysis for config:', currentAnalysis);

                        if (!bestAnalysis || currentAnalysis.totalLifetimeSavings > bestAnalysis.totalLifetimeSavings) {
                            bestAnalysis = currentAnalysis;
                        }
                    }
                    if (bestAnalysis) {
                        analysis = bestAnalysis;
                        usedSource = 'google';
                    }
                }

                // Set results in googleSolarData if analysis was performed
                if (analysis) {
                    googleSolarData.panelsCount = (analysis.panelsCount ?? null) as number | null;
                    googleSolarData.yearlyEnergyDcKwh = (analysis.yearlyEnergyDcKwh ?? null) as number | null;
                    googleSolarData.estimatedInstallationCostAmount = (analysis.installationCost ?? null) as number | null;
                    googleSolarData.estimatedAnnualSavingsAmount = (analysis.annualSavings ?? null) as number | null;
                    googleSolarData.estimatedTotalLifetimeSavingsAmount = (analysis.totalLifetimeSavings ?? null) as number | null;
                    googleSolarData.paybackYears = (analysis.paybackYears ?? null) as number | null;
                    console.log(`[CALC] Final financials (source: ${usedSource}):`, {
                        estimatedInstallationCostAmount: googleSolarData.estimatedInstallationCostAmount,
                        estimatedAnnualSavingsAmount: googleSolarData.estimatedAnnualSavingsAmount,
                        estimatedTotalLifetimeSavingsAmount: googleSolarData.estimatedTotalLifetimeSavingsAmount,
                        paybackYears: googleSolarData.paybackYears
                    });

                    // --- MOVED BLOCKS INSIDE if (analysis) ---
                    // --- BEGIN: Inverter Selection ---
                    if (analysis.installationSizeKW && analysis.installationSizeKW > 0) {
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
                                        const difference = Math.abs(inverter.peakPower - analysis.installationSizeKW);
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
                                    console.log(`[CALC] Selected inverter: ${selectedInverterName} (Peak Power: ${selectedInverterPeakPower}kW) for installation size: ${analysis.installationSizeKW}kW`);
                                } else {
                                    console.log('[CALC] No suitable inverter found after tie-breaking or initial search.');
                                }
                            } else {
                                console.log('[CALC] No inverters found in DB.');
                            }
                        } catch (invError) {
                            console.error('[CALC] Error fetching inverters:', invError);
                        }
                    }
                    // --- END: Inverter Selection ---

                    // --- BEGIN: Cost Breakdown and IVA ---
                    const currentInstallationCost = analysis.installationCost ?? 0;
                    if (currentInstallationCost > 0) {
                        const sysPanelCompPercent = systemSettings?.panelComponentPercentage ?? DEFAULT_SYSTEM_SETTINGS.panelComponentPercentage;

                        costBreakdown = {
                            serviciosInstalacionPuestaMarcha: currentInstallationCost * installServicesPercent,
                            costePanel: currentInstallationCost * sysPanelCompPercent,
                            costeInversor: currentInstallationCost * invCostPercent,
                            puestaMarchaLegalizacion: currentInstallationCost * commLegPercent,
                            garantiaSoporteTecnico: currentInstallationCost * warrantyPercent,
                            herramientaMonitorizacion: currentInstallationCost * monitoringPercent,
                            estructura: currentInstallationCost * structurePercent,
                        };

                        const ivaRate = getIvaRate(country);
                        ivaAmount = currentInstallationCost * ivaRate;
                        totalCostWithIva = currentInstallationCost + ivaAmount;

                        console.log('[CALC] Cost breakdown:', costBreakdown);
                        console.log(`[CALC] IVA Amount: ${ivaAmount}, Total with IVA: ${totalCostWithIva}`);
                    }
                    // --- END: Cost Breakdown and IVA ---
                    // --- END MOVED BLOCKS ---
                }
            }
        }

        // Log before returning the final response
        console.log('[CALC] Final data before returning response:', {
            success: true,
            solarData: {
                ...googleSolarData,
                averagePricePerKWh: averagePrice,
                selectedPanelName,
                selectedInverterName,
                selectedInverterPeakPower,
                costBreakdown,
                ivaAmount,
                totalCostWithIva,
                orthophotoUrl
            }
        });

        return NextResponse.json(
            {
                success: true,
                solarData: {
                    ...googleSolarData,
                    averagePricePerKWh: averagePrice,
                    selectedPanelName,
                    selectedInverterName,
                    selectedInverterPeakPower,
                    costBreakdown,
                    ivaAmount,
                    totalCostWithIva,
                    orthophotoUrl
                } as import('@/lib/types').GoogleSolarData & {
                    averagePricePerKWh: number,
                    selectedPanelName: string | null,
                    selectedInverterName: string | null,
                    selectedInverterPeakPower: number | null,
                    costBreakdown: CostBreakdown | null,
                    ivaAmount: number | null,
                    totalCostWithIva: number | null
                }
            },
            {
                status: 200,
                headers: cors
            }
        );
    } catch (error) {
        console.error('Embed calculation error:', error);
        const errorCors = await corsHeaders('');
        return NextResponse.json(
            {
                success: false,
                message: 'Internal server error'
            },
            { status: 500, headers: errorCors }
        );
    }
}

export async function OPTIONS(request: Request) {
    const headersList = await headers();
    const origin = headersList.get('origin') || '';
    const optionsCors = await corsHeaders(origin);

    return new NextResponse(null, {
        status: 200,
        headers: optionsCors
    });
}
