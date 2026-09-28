import { NextResponse } from 'next/server';
import { fetchBuildingInsights, extractRoofSegments } from '@/lib/google-solar';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const latStr = searchParams.get('lat');
    const lngStr = searchParams.get('lng');
    const polygonCoordinates = searchParams.get('polygonCoordinates');

    if (!latStr || !lngStr) {
        return NextResponse.json(
            { error: 'Parámetros lat y lng son obligatorios' },
            { status: 400, headers: corsHeaders() }
        );
    }

    const latitude = parseFloat(latStr);
    const longitude = parseFloat(lngStr);

    if (isNaN(latitude) || isNaN(longitude)) {
        return NextResponse.json(
            { error: 'Coordenadas no válidas' },
            { status: 400, headers: corsHeaders() }
        );
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        return NextResponse.json(
            { error: 'Google Maps API key no configurada' },
            { status: 500, headers: corsHeaders() }
        );
    }

    try {
        const buildingInsights = await fetchBuildingInsights({ latitude, longitude }, apiKey);

        if (!buildingInsights || !buildingInsights.solarPotential) {
            return NextResponse.json(
                {
                    success: false,
                    hasSolarData: false,
                    message: 'No hay datos de radiación 3D de Google Solar para esta ubicación exacta',
                    segments: []
                },
                { status: 200, headers: corsHeaders() }
            );
        }

        // Si se envió polígono de usuario, procesarlo
        let userPoly: { lat: number; lng: number }[] | undefined = undefined;
        if (polygonCoordinates) {
            try {
                const parsed = JSON.parse(polygonCoordinates);
                if (Array.isArray(parsed) && parsed.length >= 3) {
                    userPoly = parsed;
                }
            } catch {
                // Ignore parse errors
            }
        }

        const segments = extractRoofSegments(buildingInsights.solarPotential, undefined, undefined, userPoly);

        return NextResponse.json(
            {
                success: true,
                hasSolarData: true,
                center: buildingInsights.center,
                maxArrayPanelsCount: buildingInsights.solarPotential.maxArrayPanelsCount,
                maxArrayAreaMeters2: buildingInsights.solarPotential.maxArrayAreaMeters2,
                segments: segments.map(s => ({
                    segmentIndex: s.segmentIndex,
                    pitchDegrees: s.pitchDegrees,
                    azimuthDegrees: s.azimuthDegrees,
                    orientationLabel: s.orientationLabel,
                    areaMeters2: s.areaMeters2,
                    panelsCount: s.panelsCount,
                    performanceGrade: s.performanceGrade,
                    performanceLabel: s.performanceLabel,
                    efficiencyPercentage: s.efficiencyPercentage,
                    isRecommended: s.performanceGrade === 'A' || s.performanceGrade === 'B',
                    center: s.center
                }))
            },
            { status: 200, headers: corsHeaders() }
        );

    } catch (error: any) {
        console.error('[ROOF-SEGMENTS API ERROR]', error);
        return NextResponse.json(
            { error: 'Error al consultar segmentos de tejado', details: error.message },
            { status: 500, headers: corsHeaders() }
        );
    }
}

function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    };
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: corsHeaders()
    });
}
