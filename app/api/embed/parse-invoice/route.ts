import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Magic bytes permitidos (PDF, JPEG, PNG, WEBP)
const VALID_MAGIC_BYTES = [
    { type: 'pdf', mime: 'application/pdf', header: [0x25, 0x50, 0x44, 0x46, 0x2D] }, // %PDF-
    { type: 'jpeg', mime: 'image/jpeg', header: [0xFF, 0xD8, 0xFF] },                   // JPEG
    { type: 'png', mime: 'image/png', header: [0x89, 0x50, 0x4E, 0x47] },               // PNG
    { type: 'webp', mime: 'image/webp', header: [0x52, 0x49, 0x46, 0x46] },              // RIFF (WebP)
];

// Cabeceras prohibidas de ejecutables y scripts
const BLOCKED_MAGIC_BYTES = [
    [0x4D, 0x5A],             // 'MZ' (DOS/PE executable, exe, dll)
    [0x7F, 0x45, 0x4C, 0x46], // ELF (Linux executable)
    [0xCA, 0xFE, 0xBA, 0xBE], // Mach-O / Java bytecode
    [0x50, 0x4B, 0x03, 0x04], // ZIP / JAR / APK
    [0x52, 0x61, 0x72, 0x21], // RAR
];

const SYSTEM_PROMPT = `Eres un experto auditor de facturas eléctricas (España, Colombia y Guatemala) especializado en análisis fotovoltaico.
Tu objetivo es extraer con la máxima precisión posible los datos del inmueble y suministro eléctrico para dimensionar una instalación solar fotovoltaica.
Responde ÚNICAMENTE con un objeto JSON válido con la siguiente estructura exacta (sin formato markdown ni texto adicional):
{
  "address": "Dirección completa del punto de suministro (calle, número, código postal y localidad)",
  "city": "Municipio, ciudad o provincia",
  "cups": "Código CUPS si la factura es de España (ej: ES00...)",
  "consumptionKwh": 0,
  "monthlyBill": 0,
  "userName": "Nombre de pila del titular del contrato (o razón social completa si es una empresa)",
  "userLastName": "Apellidos del titular del contrato (dejar null si es empresa o no constan)",
  "tariff": "Tarifa de acceso si aparece (ej: 2.0TD, 3.0TD)",
  "country": "ES o CO o GT"
}
Reglas:
- Si el consumo mensual no está explícito pero hay histórico o anual, calcula el promedio mensual en kWh.
- En el titular del contrato, separa estrictamente el nombre de pila ("userName") de los apellidos ("userLastName"). Si es una empresa o persona jurídica, pon el nombre de la empresa en "userName" y "userLastName": null.
- Si no encuentras algún campo en el documento, usa null o 0 según corresponda.`;

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
        const matchedFormat = VALID_MAGIC_BYTES.find(({ header }) =>
            header.every((byte, idx) => firstBytes[idx] === byte)
        );

        if (!matchedFormat) {
            console.warn('[SECURITY] Archivo con magic bytes no reconocidos:', fileName, firstBytes);
            return NextResponse.json(
                { error: 'El archivo no parece ser un documento PDF o imagen válido.' },
                { status: 400, headers: corsHeaders() }
            );
        }

        // 4. Cálculo de Hash SHA-256 para integridad
        const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

        // 5. Extracción con OpenAI GPT-4o Vision / PDF
        const openAiApiKey = process.env.OPENAI_API_KEY;
        let extractedData: any = null;

        if (openAiApiKey) {
            try {
                const isPdf = matchedFormat.type === 'pdf';
                const fileContent: any[] = [
                    {
                        type: 'text',
                        text: 'Analiza esta factura eléctrica y extrae los datos solicitados en formato JSON estructurado.'
                    }
                ];

                if (isPdf) {
                    fileContent.push({
                        type: 'file',
                        file: {
                            filename: fileName || 'factura.pdf',
                            file_data: `data:application/pdf;base64,${rawBase64}`
                        }
                    });
                } else {
                    fileContent.push({
                        type: 'image_url',
                        image_url: {
                            url: `data:${matchedFormat.mime};base64,${rawBase64}`,
                            detail: 'high'
                        }
                    });
                }

                const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${openAiApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o',
                        response_format: { type: 'json_object' },
                        messages: [
                            { role: 'system', content: SYSTEM_PROMPT },
                            { role: 'user', content: fileContent }
                        ],
                        max_tokens: 1500,
                        temperature: 0.1
                    })
                });

                if (aiRes.ok) {
                    const aiJson = await aiRes.json();
                    const rawContent = aiJson.choices?.[0]?.message?.content || '';
                    if (rawContent) {
                        try {
                            const parsed = JSON.parse(rawContent);
                            extractedData = parsed;
                        } catch {
                            const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
                            if (jsonMatch) {
                                extractedData = JSON.parse(jsonMatch[0]);
                            }
                        }
                    }
                } else {
                    console.warn('[PARSE-INVOICE] OpenAI error status:', aiRes.status);
                }
            } catch (aiErr: any) {
                console.error('[PARSE-INVOICE] Error llamando a OpenAI:', aiErr.message);
            }
        }

        // 6. Si se extrajo dirección, geolocalizar en Google Maps para obtener coordenadas exactas
        const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
        let geoLat: number | null = null;
        let geoLng: number | null = null;
        let formattedAddress: string | null = null;

        if (extractedData?.address && mapsApiKey) {
            try {
                const query = `${extractedData.address}${extractedData.city ? ', ' + extractedData.city : ''}`;
                const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${mapsApiKey}&language=es`;
                const geoRes = await fetch(geocodeUrl);
                if (geoRes.ok) {
                    const geoJson = await geoRes.json();
                    if (geoJson.status === 'OK' && geoJson.results?.[0]) {
                        const loc = geoJson.results[0].geometry.location;
                        geoLat = loc.lat;
                        geoLng = loc.lng;
                        formattedAddress = geoJson.results[0].formatted_address;
                    }
                }
            } catch (geoErr: any) {
                console.warn('[PARSE-INVOICE] Error en geocodificación server:', geoErr.message);
            }
        }

        // 7. Notificación en segundo plano a n8n para registro de auditoría (sin bloquear)
        const scannerWebhookUrl = process.env.N8N_SCAN_ATTACHMENT_WEBHOOK_URL || 'https://api-n8n.wattify.es/webhook/scan-attachment';
        fetch(scannerWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sha256,
                fileName: fileName || 'factura.pdf',
                parsed: Boolean(extractedData),
                cups: extractedData?.cups || null,
                address: formattedAddress || extractedData?.address || null,
                userName: extractedData?.userName || null,
                userLastName: extractedData?.userLastName || null,
                source: 'calculadora_solar_initial_scan'
            })
        }).catch(() => {
            // Silencioso
        });

        const hasValidData = Boolean(extractedData && (extractedData.address || extractedData.consumptionKwh || geoLat));

        return NextResponse.json(
            {
                success: true,
                sha256,
                fileName: fileName || 'factura.pdf',
                parsed: hasValidData,
                extracted: hasValidData ? {
                    address: formattedAddress || extractedData?.address || null,
                    city: extractedData?.city || null,
                    lat: geoLat,
                    lng: geoLng,
                    consumptionKwh: extractedData?.consumptionKwh ? Number(extractedData.consumptionKwh) : null,
                    monthlyBill: extractedData?.monthlyBill ? Number(extractedData.monthlyBill) : null,
                    cups: extractedData?.cups || null,
                    userName: extractedData?.userName || null,
                    userLastName: extractedData?.userLastName || null,
                    tariff: extractedData?.tariff || null,
                    country: extractedData?.country || 'ES'
                } : null,
                message: hasValidData
                    ? 'Factura verificada y analizada con éxito'
                    : 'Factura verificada. Puedes confirmar tu dirección en el mapa a continuación.'
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
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-API-Key',
    };
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: corsHeaders()
    });
}
