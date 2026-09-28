import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST /api/contact/meeting
// Ingesta eventos de reuniones (Cal.com / Webhook) vinculándolos automáticamente a un Contact
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
            calEventUid,
            scheduledAt,
            engineerName,
            status = 'CONFIRMED',
            notes,
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
                source: 'CALCOM',
            },
        });

        // 2. Upsert/Create Meeting
        const meeting = calEventUid
            ? await prisma.meeting.upsert({
                where: { calEventUid },
                update: {
                    scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
                    engineerName: engineerName || undefined,
                    status: (status as any) || undefined,
                    notes: notes || undefined,
                },
                create: {
                    contactId: contact.id,
                    calEventUid,
                    scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
                    engineerName: engineerName || null,
                    status: (status as any) || 'SCHEDULED',
                    notes: notes || null,
                },
            })
            : await prisma.meeting.create({
                data: {
                    contactId: contact.id,
                    scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
                    engineerName: engineerName || null,
                    status: (status as any) || 'SCHEDULED',
                    notes: notes || null,
                },
            });

        return NextResponse.json({ success: true, contactId: contact.id, meetingId: meeting.id });
    } catch (error: any) {
        console.error('[MEETING INGESTION ERROR]:', error?.message);
        return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
    }
}
