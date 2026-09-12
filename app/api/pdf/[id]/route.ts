import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { renderToBuffer } from '@react-pdf/renderer';
import SubmissionPDF from '@/components/SubmissionPDF';
import React from 'react';
import { decrypt } from '@/lib/session';
import { cookies } from 'next/headers';
import fs from 'fs';
import path from 'path';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Allow access for authenticated users OR direct CUID link access (from Telegram / customer proposals)
        const cookie = (await cookies()).get('session')?.value;
        const session = await decrypt(cookie);

        const { id } = await params;

        const submission = await prisma.submission.findUnique({
            where: { id },
        });

        if (!submission) {
            return new NextResponse('Submission not found', { status: 404 });
        }

        // Consolidate data for PDF (matching lib/email.ts logic)
        const parsedGoogleSolarData = typeof submission.googleSolarData === 'string'
            ? JSON.parse(submission.googleSolarData)
            : (submission.googleSolarData as any || {});

        const costBreakdown = typeof submission.costBreakdownJson === 'string'
            ? JSON.parse(submission.costBreakdownJson)
            : (submission.costBreakdownJson as any || {});

        const priceKWUsed = submission.priceKWUsed || 1200;
        const installationSizeKW = submission.systemSize
            ? submission.systemSize
            : (submission.baseInstallationCost && priceKWUsed
                ? submission.baseInstallationCost / priceKWUsed
                : (parsedGoogleSolarData.installationSizeKW || 0));

        const precioFinal = installationSizeKW * priceKWUsed;

        const currSymbol = submission.currencyCode === 'COP' ? '$' : (submission.currencyCode === 'GTQ' ? 'Q ' : '€');
        const constants = {
            [`Precio medio electricidad (${currSymbol}/kWh)`]: submission.currencyCode === 'COP' ? 900 : (submission.currencyCode === 'GTQ' ? 1.60 : 0.2),
            [`Coste instalación por kWp (${currSymbol})`]: submission.currencyCode === 'COP' ? 3500000 : (submission.currencyCode === 'GTQ' ? 11000 : 1200),
            'Años de vida útil': 20,
        };

        const incentiveDisclaimer = (submission.currencyCode === 'COP' || submission.currencyCode === 'GTQ')
            ? ''
            : 'En esta propuesta se ha incluido la bonificación derivada de la instalación de paneles solares del IRPF y que consiste en un 40% del precio del proyecto que se reducirá de la base imponible del cliente. Hemos tenido en cuenta un 30%.';

        const pdfProps = {
            userName: submission.userName || 'No proporcionado',
            userEmail: submission.userEmail || 'No proporcionado',
            userPhone: submission.userPhone || 'No proporcionado',
            address: submission.address || 'No proporcionada',
            city: submission.city || 'No proporcionada',
            averageKwhConsumption: submission.averageKwhConsumption ?? null,
            monthlyElectricityBillAmount: submission.monthlyElectricityBillAmount ?? null,
            panelCount: submission.panelCount ?? parsedGoogleSolarData?.panelsCount ?? null,
            yearlyEnergyDcKwh: submission.annualProduction ?? parsedGoogleSolarData?.yearlyEnergyDcKwh ?? null,
            installationSizeKW: installationSizeKW || null,
            priceKWUsed: priceKWUsed || null,
            precioFinal: precioFinal || null,
            selectedPanelName: submission.selectedPanelName || 'N/A',
            selectedInverterName: submission.selectedInverterName || 'N/A',
            selectedInverterPeakPower: submission.selectedInverterPeakPower || null,
            orthophotoUrl: (() => {
                let url = (submission as any).orthophotoUrl;
                if (url && typeof url === 'string' && url.includes('localhost') && process.env.NODE_ENV === 'production') {
                    const prodBase = submission.country === 'colombia' ? 'https://calculadora.wattify.co' : 'https://calculadora.wattify.es';
                    url = url.replace(/http:\/\/localhost:\d+/, prodBase);
                }
                return url ?? undefined;
            })(),
            orthophotoBase64: (submission as any).orthophotoBase64 ?? undefined,
            costBreakdown: costBreakdown,
            ivaAmount: submission.ivaAmount ?? null,
            totalCostWithIva: submission.totalCostWithIva ?? null,
            totalCost: submission.totalCost ?? parsedGoogleSolarData?.estimatedInstallationCostAmount ?? null,
            firstYearSavings: submission.firstYearSavings ?? parsedGoogleSolarData?.estimatedAnnualSavingsAmount ?? null,
            lifetimeSavings: submission.lifetimeSavings ?? parsedGoogleSolarData?.estimatedTotalLifetimeSavingsAmount ?? null,
            paybackYears: submission.paybackYears ?? parsedGoogleSolarData?.paybackYears ?? null,
            currencyCode: submission.currencyCode || 'EUR',
            constants,
            incentiveNote: incentiveDisclaimer,
            id: String(submission.id),
            createdAt: new Date(submission.createdAt),
            country: submission.country || 'spain',
        };

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
        const getAbsoluteUrl = (path: string) => `${baseUrl}${path}`;

        // Helper to get local image as Base64 for the PDF - VERY ROBUST
        const getLocalImageAsBase64 = (imagePath: string) => {
            try {
                const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
                const fullPath = path.join(process.cwd(), 'public', cleanPath);
                if (fs.existsSync(fullPath)) {
                    const buffer = fs.readFileSync(fullPath);
                    const extension = path.extname(fullPath).substring(1);
                    return `data:image/${extension === 'svg' ? 'svg+xml' : extension};base64,${buffer.toString('base64')}`;
                }
            } catch (err) {
                console.error('[PDF_ROUTE] Error reading local image:', imagePath, err);
            }
            return getAbsoluteUrl(imagePath); // Fallback to URL
        };

        const enhancedPdfProps = {
            ...pdfProps,
            images: {
                familia: getLocalImageAsBase64('/familia.png'),
                wattifyLogo: getLocalImageAsBase64('/wattifylogoblanco.png'),
                paperplane: getLocalImageAsBase64('/paperplane.png'),
                shield: getLocalImageAsBase64('/shield.png'),
                clock: getLocalImageAsBase64('/clock.png'),
                thumb: getLocalImageAsBase64('/thumb.png'),
                facebook: getLocalImageAsBase64('/facebook.png'),
                instagram: getLocalImageAsBase64('/instagram.png'),
                linkedin: getLocalImageAsBase64('/linkedin.png'),
                youtube: getLocalImageAsBase64('/youtube.png'),
                // Icons
                user: getLocalImageAsBase64('/user.png'),
                solar: getLocalImageAsBase64('/solar.png'),
                lightning: getLocalImageAsBase64('/lightning.png'),
                panels: getLocalImageAsBase64('/panels.png'),
                stockup: getLocalImageAsBase64('/stockup.png'),
                euro: getLocalImageAsBase64('/euro.png'),
                coins: getLocalImageAsBase64('/coins.png'),
                bank: getLocalImageAsBase64('/bank.png'),
                piechart: getLocalImageAsBase64('/piechart.png'),
                calculadora: getLocalImageAsBase64('/calculadora.png'),
                lightbulb: getLocalImageAsBase64('/lightbulb.png'),
                phone: getLocalImageAsBase64('/phone.png'),
                web: getLocalImageAsBase64('/web.png'),
                calendar: getLocalImageAsBase64('/calendar.png'),
                leaf: getLocalImageAsBase64('/leaf.png'),
                tree: getLocalImageAsBase64('/tree.png'),
                home: getLocalImageAsBase64('/home.png'),
            },
            svgIcons: {
                user: getLocalImageAsBase64('/user.svg'),
                lightning: getLocalImageAsBase64('/lightning.svg'),
                panels: getLocalImageAsBase64('/panels.svg'),
                stockup: getLocalImageAsBase64('/stockup.svg'),
                euro: getLocalImageAsBase64('/euro.svg'),
                coins: getLocalImageAsBase64('/coins.svg'),
                bank: getLocalImageAsBase64('/bank.svg'),
                piechart: getLocalImageAsBase64('/piechart.svg'),
                calculadora: getLocalImageAsBase64('/calculadora.svg'),
            }
        };

        const pdfBuffer = await renderToBuffer(React.createElement(SubmissionPDF, enhancedPdfProps as any) as any) as Buffer;

        return new NextResponse(pdfBuffer as any, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="informe-solar-${id}.pdf"`,
                'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
            },
        });
    } catch (error) {
        console.error('[PDF_ROUTE] Error generating PDF:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
