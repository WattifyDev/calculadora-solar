import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/contact/context?email=xxx&phone=yyy
// Protegido con API_SECRET_KEY en header Authorization: Bearer xxx
// Usado por Chatwoot, n8n y el futuro asistente de voz para obtener el perfil unificado del cliente
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const apiSecret = process.env.API_SECRET_KEY;

    if (!authHeader || !apiSecret || authHeader !== `Bearer ${apiSecret}`) {
        return NextResponse.json(
            { found: false, error: 'Unauthorized' },
            { status: 401 }
        );
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email')?.toLowerCase().trim();
    const phone = searchParams.get('phone')?.trim();

    if (!email && !phone) {
        return NextResponse.json(
            { found: false, error: 'email or phone param required' },
            { status: 400 }
        );
    }

    try {
        const contact = await prisma.contact.findFirst({
            where: email
                ? { email }
                : { phone: { contains: phone! } },
            include: {
                submissions: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: {
                        id: true,
                        address: true,
                        city: true,
                        country: true,
                        panelCount: true,
                        systemSize: true,
                        totalCostWithIva: true,
                        firstYearSavings: true,
                        paybackYears: true,
                        selectedPanelName: true,
                        selectedInverterName: true,
                        annualProduction: true,
                        co2Reduction: true,
                        currencyCode: true,
                        monthlyElectricityBillAmount: true,
                        panelApplication: true,
                        panelType: true,
                        createdAt: true,
                    },
                },
                meetings: {
                    orderBy: { scheduledAt: 'desc' },
                    take: 1,
                    select: {
                        calEventUid: true,
                        scheduledAt: true,
                        engineerName: true,
                        status: true,
                        notes: true,
                    },
                },
                formEntries: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                    select: {
                        formName: true,
                        score: true,
                        createdAt: true,
                    },
                },
            },
        });

        if (!contact) {
            return NextResponse.json({ found: false });
        }

        const latestSubmission = contact.submissions[0] || null;
        const latestMeeting = contact.meetings[0] || null;

        return NextResponse.json({
            found: true,
            contact: {
                id: contact.id,
                email: contact.email,
                firstName: contact.firstName,
                lastName: contact.lastName,
                fullName: [contact.firstName, contact.lastName].filter(Boolean).join(' ') || null,
                phone: contact.phone,
                source: contact.source,
                createdAt: contact.createdAt,
            },
            solar: latestSubmission
                ? {
                    submissionId: latestSubmission.id,
                    address: latestSubmission.address,
                    city: latestSubmission.city,
                    country: latestSubmission.country,
                    panels: latestSubmission.panelCount,
                    systemSizeKW: latestSubmission.systemSize,
                    totalCostWithIva: latestSubmission.totalCostWithIva,
                    firstYearSavings: latestSubmission.firstYearSavings,
                    paybackYears: latestSubmission.paybackYears,
                    annualProductionKwh: latestSubmission.annualProduction,
                    co2ReductionKg: latestSubmission.co2Reduction,
                    panelModel: latestSubmission.selectedPanelName,
                    inverterModel: latestSubmission.selectedInverterName,
                    currencyCode: latestSubmission.currencyCode,
                    monthlyBill: latestSubmission.monthlyElectricityBillAmount,
                    panelApplication: latestSubmission.panelApplication,
                    pdfUrl: `https://calculadora-solar.wattify.es/api/pdf/${latestSubmission.id}`,
                    submittedAt: latestSubmission.createdAt,
                }
                : null,
            meeting: latestMeeting
                ? {
                    calEventUid: latestMeeting.calEventUid,
                    scheduledAt: latestMeeting.scheduledAt,
                    engineerName: latestMeeting.engineerName,
                    status: latestMeeting.status,
                    notes: latestMeeting.notes,
                }
                : null,
            forms: contact.formEntries.map((f) => ({
                formName: f.formName,
                score: f.score,
                submittedAt: f.createdAt,
            })),
            retrievedAt: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error('[CONTACT CONTEXT] Error:', error?.message);
        return NextResponse.json(
            { found: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
