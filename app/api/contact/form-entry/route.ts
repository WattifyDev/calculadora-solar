import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { invalidateContactCache } from '@/lib/contact-cache';

// POST /api/contact/form-entry
// Ingesta respuestas de formularios (Formbricks / Webhook) vinculándolas a un Contact
export async function POST(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const apiSecret = process.env.API_SECRET_KEY;

    if (!authHeader || !apiSecret || authHeader !== `Bearer ${apiSecret}`) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const {
            email,
            phone,
            name,
            formName,
            responses,
            score,
        } = body;

        if (!email && !phone) {
            return NextResponse.json({ success: false, error: 'email or phone is required' }, { status: 400 });
        }

        const normalizedEmail = (email || '').toLowerCase().trim();

        // 1. Upsert Contact
        const contact = await prisma.contact.upsert({
            where: { email: normalizedEmail || `no-email-${Date.now()}@wattify.internal` },
            update: {
                phone: phone || undefined,
                firstName: name || undefined,
                updatedAt: new Date(),
            },
            create: {
                email: normalizedEmail || `phone-${phone}@wattify.internal`,
                phone: phone || null,
                firstName: name || null,
                source: 'FORMBRICKS',
            },
        });

        // 2. Create FormEntry
        const formEntry = await prisma.formEntry.create({
            data: {
                contactId: contact.id,
                formId: body.formId || null,
                formName: formName || 'Formulario General',
                answers: responses || {},
                score: typeof score === 'number' ? Math.round(score) : null,
                source: body.source || 'formbricks',
            },
        });

        // Invalidar caché del contacto
        invalidateContactCache([normalizedEmail, phone, contact.email, contact.phone]).catch(() => {});

        return NextResponse.json({ success: true, contactId: contact.id, formEntryId: formEntry.id });
    } catch (error: any) {
        console.error('[FORM ENTRY INGESTION ERROR]:', error?.message);
        return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
    }
}
