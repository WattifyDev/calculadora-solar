import { NextRequest, NextResponse } from 'next/server';
import { convertTiffToPng } from '@/lib/orthophoto';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const tiffUrl = searchParams.get('url');

        if (!tiffUrl) {
            return NextResponse.json({ error: 'Missing TIFF URL parameter' }, { status: 400 });
        }

        const pngBuffer = await convertTiffToPng(tiffUrl);

        if (!pngBuffer) {
            return NextResponse.json(
                { error: 'Failed to convert TIFF image' },
                { status: 500 }
            );
        }

        return new NextResponse(pngBuffer as any, {
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=3600',
                'Content-Length': pngBuffer.length.toString(),
            },
        });

    } catch (error) {
        console.error('[ORTHOPHOTO] Route error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
