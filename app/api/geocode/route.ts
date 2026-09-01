import { NextResponse } from 'next/server';
import { Client, Language } from "@googlemaps/google-maps-services-js";

const googleMapsClient = new Client({});

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    // Verify API key exists
    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!googleMapsApiKey) {
        return NextResponse.json({ error: 'Google Maps API key is not configured' }, { status: 500 });
    }

    try {
        // Handle geocoding (address to coordinates)
        if (query) {
            const response = await googleMapsClient.geocode({
                params: {
                    address: query,
                    key: googleMapsApiKey,
                    region: 'es',
                    language: 'es-ES' as Language,
                    components: { country: 'es' }
                }
            });

            if (response.data.status === 'OK') {
                return NextResponse.json({
                    results: response.data.results.map(result => ({
                        address: result.formatted_address,
                        lat: result.geometry.location.lat,
                        lng: result.geometry.location.lng
                    }))
                });
            }
        }

        // Handle reverse geocoding (coordinates to address)
        if (lat && lng) {
            const response = await googleMapsClient.reverseGeocode({
                params: {
                    latlng: { lat: parseFloat(lat), lng: parseFloat(lng) },
                    key: googleMapsApiKey,
                    language: 'es-ES' as Language
                }
            });

            if (response.data.status === 'OK') {
                return NextResponse.json({
                    address: response.data.results[0].formatted_address,
                    lat: parseFloat(lat),
                    lng: parseFloat(lng)
                });
            }
        }

        return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });

    } catch (error) {
        console.error('Google Maps API error:', error);
        return NextResponse.json({ error: 'Failed to process geocoding request' }, { status: 500 });
    }
}

// Handle CORS preflight
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        }
    });
}