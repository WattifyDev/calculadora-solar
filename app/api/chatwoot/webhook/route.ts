import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCachedContactContext } from '@/lib/contact-cache';

// POST /api/chatwoot/webhook
// Recibe eventos de Chatwoot (conversation_created, message_created) e inyecta
// una Nota Privada con el perfil 360° del cliente (solar, citas Cal.com, formularios)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const event = body.event || body.event_name;

        // Solo procesamos eventos relevantes de inicio de conversación o primer mensaje
        if (event !== 'conversation_created' && event !== 'message_created' && event !== 'conversation_opened') {
            return NextResponse.json({ success: true, ignored: true, reason: `Event ${event} not actionable` });
        }

        // Evitar bucles: si el mensaje fue enviado por el bot o es una nota privada nuestra, ignorar
        if (body.private === true || body.message_type === 'outgoing' || body.sender?.type === 'agent_bot') {
            return NextResponse.json({ success: true, ignored: true, reason: 'Private note or outgoing message' });
        }

        const conversationId = body.conversation?.id || body.id;
        const accountId = body.account?.id || body.conversation?.account_id;
        const sender = body.sender || body.conversation?.meta?.sender || {};

        const email = (sender.email || '').toLowerCase().trim();
        const phone = (sender.phone_number || '').trim();
        const name = sender.name || 'Cliente';

        if (!email && !phone) {
            return NextResponse.json({ success: true, ignored: true, reason: 'No email or phone in sender' });
        }

        const identifier = email || phone;

        // 1. Obtener contexto del cliente (desde Caché o BD)
        let contextData: any = null;
        const cached = await getCachedContactContext(identifier);
        if (cached) {
            contextData = cached.data;
        } else {
            const contact = await prisma.contact.findFirst({
                where: email ? { email } : { phone: { contains: phone } },
                include: {
                    submissions: { orderBy: { createdAt: 'desc' }, take: 1 },
                    meetings: { orderBy: { scheduledAt: 'desc' }, take: 1 },
                    formEntries: { orderBy: { createdAt: 'desc' }, take: 3 },
                },
            });

            if (contact) {
                const sub = contact.submissions[0];
                const meeting = contact.meetings[0];
                contextData = {
                    found: true,
                    contact: {
                        fullName: [contact.firstName, contact.lastName].filter(Boolean).join(' ') || name,
                        email: contact.email,
                        phone: contact.phone,
                        source: contact.source,
                    },
                    solar: sub ? {
                        submissionId: sub.id,
                        address: sub.address,
                        city: sub.city,
                        systemSizeKW: sub.systemSize,
                        panelCount: sub.panelCount,
                        totalCostWithIva: sub.totalCostWithIva,
                        firstYearSavings: sub.firstYearSavings,
                        paybackYears: sub.paybackYears,
                        inverterModel: sub.selectedInverterName,
                        panelModel: sub.selectedPanelName,
                        currencyCode: sub.currencyCode || 'EUR',
                        pdfUrl: `https://calculadora-solar.wattify.es/api/pdf/${sub.id}`,
                    } : null,
                    meeting: meeting ? {
                        scheduledAt: meeting.scheduledAt,
                        engineerName: meeting.engineerName,
                        status: meeting.status,
                    } : null,
                    forms: contact.formEntries.map(f => ({ formName: f.formName, score: f.score })),
                };
            }
        }

        if (!contextData || !contextData.found) {
            return NextResponse.json({ success: true, found: false, message: 'No prior solar records found for this contact' });
        }

        // 2. Construir Nota Privada formateada en Markdown para el agente/bot de Chatwoot
        const lines: string[] = [
            `☀️ **FICHA TÉCNICA DEL CLIENTE — WATTIFY SOLAR HUB**`,
            `👤 **Cliente:** ${contextData.contact.fullName || name}`,
            `📧 **Email:** ${contextData.contact.email || email} ${contextData.contact.phone ? `| 📞 **Tel:** ${contextData.contact.phone}` : ''}`,
        ];

        if (contextData.solar) {
            const s = contextData.solar;
            const cur = s.currencyCode === 'COP' ? '$' : (s.currencyCode === 'GTQ' ? 'Q' : '€');
            lines.push(
                `📍 **Ubicación:** ${s.address || 'No indicada'} ${s.city ? `(${s.city})` : ''}`,
                `⚡ **Instalación:** ${s.systemSizeKW || 'N/A'} kWp (${s.panelCount || 0} paneles) | Inversor: ${s.inverterModel || 'SolaX / SAJ'}`,
                `💰 **Presupuesto:** ${s.totalCostWithIva ? `${Math.round(s.totalCostWithIva).toLocaleString('es-ES')} ${cur}` : 'N/A'} | Ahorro: ~${s.firstYearSavings ? `${Math.round(s.firstYearSavings).toLocaleString('es-ES')} ${cur}/año` : 'N/A'}`,
                `📄 **Informe Técnico PDF:** [Abrir Propuesta Oficial](${s.pdfUrl})`
            );
        }

        if (contextData.meeting) {
            const m = contextData.meeting;
            const dateStr = m.scheduledAt ? new Date(m.scheduledAt).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }) : 'Pendiente';
            lines.push(`📅 **Cita Cal.com:** ${dateStr} (Estado: ${m.status}) con ${m.engineerName || 'Ingeniero Solar'}`);
        }

        if (contextData.forms && contextData.forms.length > 0) {
            const f = contextData.forms[0];
            lines.push(`📋 **Cualificación Formbricks:** ${f.formName} (Score: ${f.score || 'N/A'})`);
        }

        const privateNoteContent = lines.join('\n');

        // 3. Si Chatwoot API está configurada en variables de entorno, inyectamos la nota privada
        const chatwootBaseUrl = process.env.CHATWOOT_BASE_URL || 'https://app.chatwoot.com';
        const chatwootApiToken = process.env.CHATWOOT_API_TOKEN;

        if (chatwootApiToken && conversationId && accountId) {
            const chatwootUrl = `${chatwootBaseUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`;
            await fetch(chatwootUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api_access_token': chatwootApiToken,
                },
                body: JSON.stringify({
                    content: privateNoteContent,
                    message_type: 'outgoing',
                    private: true,
                }),
            }).catch(err => {
                console.error('[CHATWOOT NOTE ERROR]:', err?.message);
            });
        }

        return NextResponse.json({
            success: true,
            found: true,
            note: privateNoteContent,
            conversationId,
        });
    } catch (error: any) {
        console.error('[CHATWOOT WEBHOOK ERROR]:', error?.message);
        return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
    }
}
