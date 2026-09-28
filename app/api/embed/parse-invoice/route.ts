import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Magic bytes permitidos (PDF, JPEG, PNG, WEBP)
const VALID_MAGIC_BYTES = [
    { type: 'pdf', header: [0x25, 0x50, 0x44, 0x46, 0x2D] }, // %PDF-
    { type: 'jpeg', header: [0xFF, 0xD8, 0xFF] },             // JPEG
    { type: 'png', header: [0x89, 0x50, 0x4E, 0x47] },         // PNG
    { type: 'webp', header: [0x52, 0x49, 0x46, 0x46] },        // RIFF (WebP)
];

// Cabeceras prohibidas de ejecutables y scripts
const BLOCKED_MAGIC_BYTES = [
    [0x4D, 0x5A],             // 'MZ' (DOS/PE executable, exe, dll)
    [0x7F, 0x45, 0x4C, 0x46], // ELF (Linux executable)
    [0xCA, 0xFE, 0xBA, 0xBE], // Mach-O / Java bytecode
    [0x50, 0x4B, 0x03, 0x04], // ZIP / JAR / APK
    [0x52, 0x61, 0x72, 0x21], // RAR
];

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { fileBase64, fileName } = body;

        if (!fileBase64 || typeof fileBase64 !== 'string') {
            return NextResponse.json(
                { error: 'Archivo no proporcionado o formato inválido' },
                { status: 400, headers: corsHeaders() }
            );
        }

        // 1. Limpiar prefijo data:application/pdf;base64,...
        const rawBase64 = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
        const buffer = Buffer.from(rawBase64, 'base64');

        // 2. Validación silenciosa de tamaño (máx 15MB)
        if (buffer.length > 15 * 1024 * 1024) {
            return NextResponse.json(
                { error: 'El archivo supera el tamaño máximo de 15 MB' },
                { status: 400, headers: corsHeaders() }
            );
        }

        // 3. Validación silenciosa de Magic Bytes
        const firstBytes = Array.from(buffer.slice(0, 8));

        // Comprobar ejecutables bloqueados
        const isBlocked = BLOCKED_MAGIC_BYTES.some(signature =>
            signature.every((byte, idx) => firstBytes[idx] === byte)
        );

        if (isBlocked) {
            console.warn('[SECURITY] Bloqueado intento de subir ejecutable camuflado:', fileName);
            return NextResponse.json(
                { error: 'El formato del archivo no es compatible. Por favor, sube un documento PDF o imagen de tu factura.' },
                { status: 400, headers: corsHeaders() }
            );
        }

        // Comprobar que sea un formato válido (PDF, JPEG, PNG, WEBP)
        const isValid = VALID_MAGIC_BYTES.some(({ header }) =>
            header.every((byte, idx) => firstBytes[idx] === byte)
        );

        if (!isValid) {
            console.warn('[SECURITY] Archivo con magic bytes no reconocidos:', fileName, firstBytes);
            return NextResponse.json(
                { error: 'El archivo no parece ser un documento PDF o imagen válido.' },
                { status: 400, headers: corsHeaders() }
            );
        }

        // 4. Cálculo de Hash SHA-256 para integridad / escaneo
        const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

        // 5. Envío al escáner y OCR de n8n
        const scannerWebhookUrl = process.env.N8N_SCAN_ATTACHMENT_WEBHOOK_URL || 'https://api-n8n.wattify.es/webhook/scan-attachment';
        let extractedData: any = null;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 7000); // 7s timeout

            const scannerRes = await fetch(scannerWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    base64Content: rawBase64,
                    fileName: fileName || 'factura.pdf',
                    sha256,
                    source: 'calculadora_solar_initial_scan'
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (scannerRes.ok) {
                const scannerJson = await scannerRes.json().catch(() => null);
                if (scannerJson && (scannerJson.address || scannerJson.cups || scannerJson.consumptionKwh || scannerJson.data)) {
                    extractedData = scannerJson.data || scannerJson;
                }
            }
        } catch (fetchErr: any) {
            console.log('[PARSE-INVOICE] Scanner n8n timeout o no disponible, continuando de forma tolerante a fallos');
        }

        return NextResponse.json(
            {
                success: true,
                sha256,
                fileName: fileName || 'factura.pdf',
                parsed: Boolean(extractedData && (extractedData.address || extractedData.consumptionKwh)),
                extracted: extractedData ? {
                    address: extractedData.address || null,
                    city: extractedData.city || null,
                    consumptionKwh: extractedData.consumptionKwh || extractedData.annualConsumptionKwh || null,
                    monthlyBill: extractedData.monthlyBill || null,
                    cups: extractedData.cups || null,
                    userName: extractedData.name || extractedData.userName || null
                } : null,
                message: 'Factura verificada y lista para el estudio'
            },
            { status: 200, headers: corsHeaders() }
        );

    } catch (error: any) {
        console.error('[PARSE-INVOICE ERROR]', error);
        return NextResponse.json(
            { error: 'Error al procesar la factura', details: error.message },
            { status: 500, headers: corsHeaders() }
        );
    }
}

function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    };
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: corsHeaders()
    });
}
