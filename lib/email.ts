import nodemailer from 'nodemailer';
import type { User } from '@/generated/prisma';
import type { Submission } from '@/generated/prisma';
import { renderToBuffer } from '@react-pdf/renderer';
import SubmissionPDF, { SubmissionPDFProps } from '@/components/SubmissionPDF';
import SimplePDF from '@/components/SimplePDF';
import React from 'react';
import { prisma } from '@/lib/db';
import type { Material } from '@/generated/prisma';
import { Buffer } from 'buffer';
import { getIvaRate } from '@/lib/currency';
import fs from 'fs';
import path from 'path';

interface EmailConfig {
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
    from: string;
    tls?: {
        ciphers?: string;
        rejectUnauthorized?: boolean;
    };
}

interface CostBreakdown {
    serviciosInstalacionPuestaMarcha?: number | null;
    costePanel?: number | null;
    costeInversor?: number | null;
    puestaMarchaLegalizacion?: number | null;
    garantiaSoporteTecnico?: number | null;
    herramientaMonitorizacion?: number | null;
    estructura?: number | null;
}

// Helper function to safely parse JSON strings or objects
function parseJsonSafely<T>(jsonData: unknown, defaultValue: T): T {
    if (typeof jsonData === 'object' && jsonData !== null && !Array.isArray(jsonData)) {
        return jsonData as T;
    }
    if (typeof jsonData === 'string') {
        try {
            const parsed = JSON.parse(jsonData);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed as T;
            }
        } catch {
            // JSON parsing failed, fall through to default
        }
    }
    return defaultValue;
}

// Helper to determine if the system is not amortizable
function getPaybackDisplay(paybackYears: number | null | undefined, firstYearSavings: number | null | undefined, lifetimeSavings: number | null | undefined): string {
    if (
        paybackYears === null ||
        paybackYears === undefined ||
        paybackYears === 0 ||
        (typeof firstYearSavings === 'number' && firstYearSavings <= 0) ||
        (typeof lifetimeSavings === 'number' && lifetimeSavings <= 0)
    ) {
        return 'No se amortiza';
    }
    return `${Math.round(paybackYears)} años`;
}

export async function sendAdminNotification(message: string, subject: string = 'Notificación del Sistema') {
    // Use the admin's SMTP configuration
    const adminUser = await prisma.user.findFirst({
        where: { email: 'info@wattify.es' },
        select: {
            smtpHost: true,
            smtpPort: true,
            smtpUser: true,
            smtpPassword: true,
            smtpFrom: true,
        }
    });

    if (!adminUser?.smtpHost || !adminUser?.smtpPort || !adminUser?.smtpUser || !adminUser?.smtpPassword || !adminUser?.smtpFrom) {
        console.log('Admin SMTP configuration is missing, skipping notification');
        return;
    }

    const config: EmailConfig = {
        host: adminUser.smtpHost,
        port: adminUser.smtpPort,
        secure: false,
        auth: {
            user: adminUser.smtpUser,
            pass: adminUser.smtpPassword,
        },
        from: adminUser.smtpFrom,
    };

    const transporter = nodemailer.createTransport(config);

    try {
        await transporter.verify();
    } catch (error: any) {
        console.error('Admin SMTP connection test failed:', error);
        return; // Fail silently to not disrupt the main flow
    }

    const mailOptions = {
        from: config.from,
        to: 'info@wattify.es',
        subject: subject,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2c3e50; text-align: center;">${subject}</h2>
                <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="margin: 0; color: #34495e; font-size: 16px;">${message}</p>
                </div>
                <p style="color: #7f8c8d; font-size: 12px; text-align: center; margin-top: 20px;">
                    Calculadora Solar - Sistema de Notificaciones
                    <br>
                    Fecha: ${new Date().toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}
                </p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Admin notification sent successfully');
    } catch (error: any) {
        console.error('Error sending admin notification:', error);
        // Fail silently to not disrupt the main flow
    }
}

export async function sendSubmissionEmail(submission: Submission, user: User) {
    if (!user.smtpHost || !user.smtpPort || !user.smtpUser || !user.smtpPassword || !user.smtpFrom) {
        throw new Error('SMTP configuration is missing');
    }

    if (!user.smtpHost.includes('.') || user.smtpPort < 1 || user.smtpPort > 65535) {
        throw new Error('Invalid SMTP configuration format');
    }

    const config: EmailConfig = {
        host: user.smtpHost,
        port: user.smtpPort,
        secure: false,
        auth: {
            user: user.smtpUser,
            pass: user.smtpPassword,
        },
        from: user.smtpFrom,
    };

    console.log('Attempting SMTP connection with host:', config.host, 'port:', config.port);

    const transporter = nodemailer.createTransport(config);
    try {
        await transporter.verify();
        console.log('SMTP connection verified successfully');
    } catch (error: any) {
        console.error('SMTP connection test failed:', error);
        throw new Error(`Failed to connect to SMTP server: ${error?.message || 'Unknown error'}`);
    }

    const formatCurrency = (amount: number | null | undefined) => {
        if (amount === null || typeof amount === 'undefined') return 'N/A';
        const curr = submission.currencyCode || 'EUR';
        const locale = curr === 'COP' ? 'es-CO' : (curr === 'GTQ' ? 'es-GT' : 'es-ES');
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: curr,
            maximumFractionDigits: curr === 'EUR' ? 2 : 0,
        }).format(amount);
    };

    const formatNumber = (num: number | null | undefined) => {
        if (num === null || typeof num === 'undefined') return 'N/A';
        return new Intl.NumberFormat('es-ES').format(num);
    };

    // --- PDF PROPS MAPPING ---
    const parsedGoogleSolarData = parseJsonSafely<any>(submission.googleSolarData, {});
    const costBreakdown = parseJsonSafely<Partial<CostBreakdown>>(submission.costBreakdownJson, {});

    const ivaAmount = submission.ivaAmount || null;
    const totalCostWithIva = submission.totalCostWithIva || null;
    const selectedPanelName = submission.selectedPanelName || 'N/A';
    const selectedInverterName = submission.selectedInverterName || 'N/A';
    const selectedInverterPeakPower = submission.selectedInverterPeakPower || null;
    const priceKWUsed = submission.priceKWUsed || null;

    const currSymbol = submission.currencyCode === 'COP' ? '$' : (submission.currencyCode === 'GTQ' ? 'Q ' : '€');
    const constants = {
        [`Precio medio electricidad (${currSymbol}/kWh)`]: submission.currencyCode === 'COP' ? 900 : (submission.currencyCode === 'GTQ' ? 1.60 : 0.2),
        [`Coste instalación por kWp (${currSymbol})`]: submission.currencyCode === 'COP' ? 3500000 : (submission.currencyCode === 'GTQ' ? 11000 : 1200),
        'Años de vida útil': 20,
    };
    const incentiveDisclaimer = (submission.currencyCode === 'COP' || submission.currencyCode === 'GTQ')
        ? ''
        : 'En esta propuesta se ha incluido la bonificación derivada de la instalación de paneles solares del IRPF y que consiste en un 40% del precio del proyecto que se reducirá de la base imponible del cliente. Hemos tenido en cuenta un 30%.';

    let installationSizeKW: number | null = null;
    if (parsedGoogleSolarData && typeof parsedGoogleSolarData.installationSizeKW !== 'undefined' && parsedGoogleSolarData.installationSizeKW !== null) {
        const numVal = Number(parsedGoogleSolarData.installationSizeKW);
        if (!isNaN(numVal)) {
            installationSizeKW = numVal;
        }
    } else if (typeof submission.baseInstallationCost === 'number' && typeof submission.priceKWUsed === 'number' && submission.priceKWUsed > 0) {
        installationSizeKW = submission.baseInstallationCost / submission.priceKWUsed;
    } else if (submission.googleSolarData && typeof submission.googleSolarData === 'object' && 'installationSizeKW' in submission.googleSolarData) {
        const numVal = Number((submission.googleSolarData as any).installationSizeKW);
        if (!isNaN(numVal)) {
            installationSizeKW = numVal;
        }
    }
    const precioFinal = installationSizeKW && priceKWUsed ? installationSizeKW * priceKWUsed : (typeof submission.baseInstallationCost === 'number' ? submission.baseInstallationCost : null);

    const safeCreatedAt = submission.createdAt instanceof Date
        ? submission.createdAt
        : new Date(submission.createdAt);

    // --- PDF PROPS ---
    const pdfProps: SubmissionPDFProps = {
        // Client info
        userName: submission.userName || 'No proporcionado',
        userEmail: submission.userEmail || 'No proporcionado',
        userPhone: submission.userPhone || 'No proporcionado',
        address: submission.address || 'No proporcionada',
        city: submission.city || 'No proporcionada',
        // Installation details
        averageKwhConsumption: submission.averageKwhConsumption ?? null,
        monthlyElectricityBillAmount: submission.monthlyElectricityBillAmount ?? null,
        panelCount: parsedGoogleSolarData?.panelsCount ?? null,
        yearlyEnergyDcKwh: parsedGoogleSolarData?.yearlyEnergyDcKwh ?? null,
        installationSizeKW: installationSizeKW ?? null,
        priceKWUsed: priceKWUsed ?? null,
        precioFinal: precioFinal ?? null,
        selectedPanelName: selectedPanelName ?? 'N/A',
        selectedInverterName: selectedInverterName ?? 'N/A',
        selectedInverterPeakPower: selectedInverterPeakPower ?? null,
        orthophotoUrl: (() => {
            let url = (submission as any).orthophotoUrl;
            if (url && typeof url === 'string' && url.includes('localhost') && process.env.NODE_ENV === 'production') {
                const prodBase = submission.country === 'colombia' ? 'https://calculadora.wattify.co' : 'https://calculadora.wattify.es';
                url = url.replace(/http:\/\/localhost:\d+/, prodBase);
            }
            return url ?? undefined;
        })(),
        orthophotoBase64: (submission as any).orthophotoBase64 ?? undefined,
        // Cost breakdown
        costBreakdown: costBreakdown ?? {},
        ivaAmount: ivaAmount ?? null,
        totalCostWithIva: totalCostWithIva ?? null,
        // Financial analysis
        totalCost: submission.totalCost ?? null,
        firstYearSavings: submission.firstYearSavings ?? null,
        lifetimeSavings: submission.lifetimeSavings ?? null,
        paybackYears: submission.paybackYears ?? null,
        currencyCode: submission.currencyCode || 'EUR',
        // Constants
        constants,
        // Incentive note
        incentiveNote: incentiveDisclaimer,
        // Footer
        id: String(submission.id || 'N/A'),
        createdAt: safeCreatedAt,
        // Add country for basic/styled PDF selection
        country: submission.country || 'spain',
    };

    // Helper function to convert relative paths to absolute URLs for server-side PDF generation
    const getAbsoluteImageUrl = (imagePath: string) => {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        return `${baseUrl}${imagePath}`;
    };

    // Helper to get local image as Base64 for the PDF - VERY ROBUST
    const getLocalImageAsBase64 = (imagePath: string) => {
        try {
            const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
            const fullPath = path.join(process.cwd(), 'public', cleanPath);
            if (fs.existsSync(fullPath)) {
                const buffer = fs.readFileSync(fullPath);
                const extension = path.extname(fullPath).substring(1);
                // For PDF icons, base64 is much safer than URLs in server-side rendering
                return `data:image/${extension === 'svg' ? 'svg+xml' : extension};base64,${buffer.toString('base64')}`;
            }
        } catch (err) {
            console.error('[EMAIL] Error reading local image:', imagePath, err);
        }
        return getAbsoluteImageUrl(imagePath); // Fallback to URL
    };

    // Create enhanced PDF props with absolute image URLs
    const enhancedPdfProps = {
        ...pdfProps,
        // Add absolute URLs for images used in PDF
        // Use Base64 strings for PDF images to avoid networking issues during rendering
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
        // Use Base64 for SVG icons too
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

    let pdfBuffer: Buffer;
    try {
        // Use SimplePDF for Colombia, styled SubmissionPDF for other countries
        if (submission.country === 'colombia') {
            const formatCurrency = (amount: number | null | undefined) => {
                if (amount === null || typeof amount === 'undefined') return 'N/A';
                return new Intl.NumberFormat('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                    maximumFractionDigits: 0,
                }).format(amount);
            };

            const formatNumber = (num: number | null | undefined) => {
                if (num === null || typeof num === 'undefined') return 'N/A';
                return new Intl.NumberFormat('es-ES').format(num);
            };

            const simplePDFContent = `
INFORMACIÓN DEL CLIENTE:
Cliente: ${submission.userName || 'No proporcionado'}
Email: ${submission.userEmail || 'No proporcionado'}
Teléfono: ${submission.userPhone || 'No proporcionado'}
Dirección: ${submission.address || 'No proporcionada'}
Ciudad: ${submission.city || 'No proporcionada'}

DETALLES DE LA INSTALACIÓN:
Consumo mensual actual: ${submission.averageKwhConsumption || 'N/A'} kWh
Producción anual estimada: ${formatNumber(parsedGoogleSolarData?.yearlyEnergyDcKwh || submission.annualProduction)} kWh
Potencia del sistema: ${formatNumber(installationSizeKW)} kWp
Número de paneles recomendados: ${formatNumber(parsedGoogleSolarData?.panelsCount)}
Panel seleccionado: ${selectedPanelName || 'Panel de alta eficiencia'}
Inversor seleccionado: ${selectedInverterName || 'Inversor de calidad'} ${selectedInverterPeakPower ? `(${selectedInverterPeakPower} kW)` : ''}

ANÁLISIS FINANCIERO:
Costo total del sistema: ${formatCurrency(submission.totalCost)}
Ahorro estimado primer año: ${formatCurrency(submission.firstYearSavings)}
Ahorro total proyectado (25 años): ${formatCurrency(submission.lifetimeSavings)}
Periodo de recuperación: ${getPaybackDisplay(submission.paybackYears, submission.firstYearSavings, submission.lifetimeSavings)}

DESGLOSE DETALLADO DE COSTOS:
Costo de paneles solares: ${formatCurrency(costBreakdown?.costePanel)}
Costo del inversor: ${formatCurrency(costBreakdown?.costeInversor)}
Servicios de instalación: ${formatCurrency(costBreakdown?.serviciosInstalacionPuestaMarcha)}
Trámites y legalización: ${formatCurrency(costBreakdown?.puestaMarchaLegalizacion)}
Garantía y soporte técnico: ${formatCurrency(costBreakdown?.garantiaSoporteTecnico)}
Estructura de montaje: ${formatCurrency(costBreakdown?.estructura)}

RESUMEN FINANCIERO:
Subtotal sin IVA: ${formatCurrency(submission.totalCost)}
IVA (19%): ${formatCurrency(ivaAmount)}
TOTAL CON IVA: ${formatCurrency(totalCostWithIva)}

            `.trim();

            const simplePDFElement = React.createElement(SimplePDF, {
                title: 'Informe de Potencial Solar - Colombia',
                content: simplePDFContent
            });
            pdfBuffer = await renderToBuffer(simplePDFElement as any);
        } else {
            // Use styled PDF for Spain and other countries with absolute image URLs
            pdfBuffer = await renderToBuffer(React.createElement(SubmissionPDF, enhancedPdfProps) as any);
        }
    } catch (pdfError: any) {
        console.error('Error generating PDF:', pdfError);
        if (pdfError.stack) {
            console.error('Stack trace:', pdfError.stack);
        }
        throw new Error(`Failed to generate PDF: ${pdfError instanceof Error ? pdfError.message : 'Unknown PDF error'}`);
    }

    // --- BEGIN: Datasheet PDF Attachments ---
    const datasheetAttachments: any[] = [];
    async function getDatasheetAttachment(materialName: string | null | undefined, type: 'panel' | 'inversor') {
        if (!materialName || materialName === 'N/A') return;
        try {
            const material = await prisma.material.findFirst({ where: { name: materialName } });
            if (!material || !material.datasheetPdf) return;
            const datasheet = material.datasheetPdf;
            let buffer: Buffer | null = null;
            const filename = `datasheet-${type}-${material.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
            if (datasheet.startsWith('http://') || datasheet.startsWith('https://')) {
                // Fetch from URL
                try {
                    const res = await fetch(datasheet);
                    if (!res.ok) throw new Error('Failed to fetch datasheet PDF from URL');
                    buffer = Buffer.from(await res.arrayBuffer());
                } catch (err) {
                    console.error(`[EMAIL] Failed to fetch datasheet PDF from URL for ${type}:`, err);
                    return;
                }
            } else {
                // Assume base64
                try {
                    buffer = Buffer.from(datasheet, 'base64');
                } catch (err) {
                    console.error(`[EMAIL] Failed to decode base64 datasheet PDF for ${type}:`, err);
                    return;
                }
            }
            if (buffer) {
                datasheetAttachments.push({
                    filename,
                    content: buffer,
                    contentType: 'application/pdf',
                });
            }
        } catch (err) {
            console.error(`[EMAIL] Error processing datasheet PDF for ${type}:`, err);
        }
    }
    await Promise.all([
        getDatasheetAttachment(submission.selectedPanelName, 'panel'),
        getDatasheetAttachment(submission.selectedInverterName, 'inversor'),
    ]);
    // --- END: Datasheet PDF Attachments ---

    // Create HTML email content using CID for embedding images
    // This is much more reliable than external URLs as images are included in the email payload
    const getEmailImageUrl = (imageName: string) => {
        return `cid:${imageName.replace(/^\//, '').replace(/\./g, '_')}`;
    };

    // Helper to get local path for CID attachments
    const getLocalImagePath = (imageName: string) => {
        return path.join(process.cwd(), 'public', imageName.replace(/^\//, ''));
    };

    // List of images to embed in the email via CID
    const emailImages = [
        'familia.png', 'wattifylogoblanco.png', 'facebook.png', 'instagram.png',
        'linkedin.png', 'youtube.png'
    ];

    const imageAttachments = emailImages.map(img => {
        const fullPath = getLocalImagePath(img);
        if (fs.existsSync(fullPath)) {
            return {
                filename: img,
                path: fullPath,
                cid: img.replace(/\./g, '_')
            };
        }
        return null;
    }).filter(Boolean);

    const coverage = submission.averageKwhConsumption && parsedGoogleSolarData?.yearlyEnergyDcKwh
        ? Math.min(100, Math.round((parsedGoogleSolarData.yearlyEnergyDcKwh / (submission.averageKwhConsumption * 12)) * 100))
        : null;

    // CONDITIONAL CONTACT INFO & EMAIL VARIABLES
    const contactEmail = submission.country === 'colombia' ? 'info@wattify.co' : 'info@wattify.es';
    const contactPhone = submission.country === 'colombia' ? '317 122 3727' : '628 292 462';
    const contactWebsite = submission.country === 'colombia' ? 'www.wattify.co' : 'www.wattify.es';

    const emailContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tu Informe de Potencial Solar</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #ffffff; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        
                 /* Hero Section */
         .hero-section { background-color: #ffffff; position: relative; }
         .hero-header { background-color: #f8f9fa; padding: 30px 20px; text-align: center; }
         .hero-title { font-size: 24px; font-weight: bold; color: #2c3e50; margin-bottom: 10px; }
         .hero-subtitle { font-size: 16px; color: #6c757d; }
         .hero-image-container { width: 100%; text-align: center; position: relative; margin: 20px 0; }
         .hero-image { width: 100%; max-width: 600px; height: auto; display: block; margin: 0 auto; }
         .hero-callout { background: #2c3e50; color: white; padding: 20px; text-align: center; margin-top: -5px; }
         .hero-callout-text { color: white; font-size: 18px; font-weight: bold; }
        
        /* Greeting Section */
        .greeting-section { padding: 40px 20px; background-color: #f8f9fa; }
        .greeting-title { font-size: 24px; font-weight: bold; color: #2c3e50; margin-bottom: 15px; }
        .greeting-text { font-size: 16px; color: #495057; line-height: 1.6; }
        .greeting-highlight { font-weight: bold; color: #27ae60; }
        
                 /* Investment Stats */
         .investment-section { padding: 40px 20px; background-color: #ffffff; }
         .investment-title { font-size: 22px; font-weight: bold; color: #2c3e50; text-align: center; margin-bottom: 30px; }
         .investment-table { width: 100%; border-collapse: separate; border-spacing: 10px; }
         .investment-box { padding: 20px; border-radius: 12px; text-align: center; width: 25%; background-color: #E8F5E9; }
         .investment-value { font-size: 18px; font-weight: bold; margin-bottom: 8px; display: block; color: #27ae60; }
         .investment-label { font-size: 12px; color: #6c757d; display: block; }
        
        /* Section Styles */
        .section { padding: 40px 20px; }
        .section-title { font-size: 20px; font-weight: bold; color: #2c3e50; margin-bottom: 15px; border-bottom: 2px solid #007bff; padding-bottom: 5px; }
        .section-alt { background-color: #f8f9fa; }
        
                 /* Solar Potential Grid */
         .solar-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
         .solar-box { background: white; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #dee2e6; width: 25%; }
         .solar-value { font-size: 16px; font-weight: bold; color: #2c5f2d; margin-bottom: 5px; display: block; }
         .solar-label { font-size: 12px; color: #6c757d; display: block; }
        
        /* Cost Breakdown */
        .cost-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px; }
        .cost-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #dee2e6; }
        .cost-label { font-size: 14px; color: #6c757d; }
        .cost-value { font-size: 14px; font-weight: bold; color: #27ae60; text-align: right; }
        .cost-total { border-top: 2px solid #007bff; padding-top: 15px; margin-top: 15px; }
        .cost-total .cost-value { color: #27ae60; font-size: 16px; }
        
        /* Equipment Section */
        .equipment-item { margin-bottom: 15px; padding: 15px; background: white; border-radius: 8px; border-left: 4px solid #27ae60; }
        .equipment-label { font-size: 12px; color: #6c757d; margin-bottom: 5px; }
        .equipment-value { font-size: 16px; font-weight: bold; color: #2c5f2d; }
        
                 /* Features Section */
         .features-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
         .feature-box { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; width: 50%; vertical-align: top; }
         .feature-title { font-size: 14px; font-weight: bold; color: #28a745; margin-bottom: 8px; display: block; }
         .feature-description { font-size: 12px; color: #495057; line-height: 1.4; margin-bottom: 5px; display: block; }
         .feature-highlight { font-size: 12px; color: #28a745; font-weight: bold; display: block; }
        
                 /* CTA Section */
         .cta-section { padding: 40px 30px; background: #28a745; }
         .cta-box { background: rgba(255,255,255,0.1); padding: 25px; border-radius: 16px; border: 3px solid rgba(255,255,255,0.3); margin-bottom: 20px; }
         .cta-title { font-size: 20px; color: white; font-weight: bold; margin-bottom: 15px; }
         .cta-description { font-size: 14px; color: white; margin-bottom: 20px; line-height: 1.4; }
         .cta-button { background: #1e7e34; padding: 15px 30px; border-radius: 8px; text-align: center; margin-bottom: 20px; }
         .cta-button a { color: white; text-decoration: none; font-size: 16px; font-weight: bold; }
         
         /* Trust Indicators */
         .trust-indicators { width: 100%; margin-top: 20px; }
         .trust-indicators table { width: 100%; border-collapse: collapse; }
         .trust-indicator { width: 33.33%; text-align: center; padding: 15px 10px; color: white; }
         .trust-icon { font-size: 20px; margin-bottom: 8px; display: block; }
         .trust-title { font-size: 12px; font-weight: bold; margin-bottom: 4px; display: block; }
         .trust-text { font-size: 10px; line-height: 1.2; display: block; }
        
        /* Contact Section */
        .contact-section { background: #28a745; padding: 40px 30px; text-align: center; }
        .contact-title { font-size: 18px; color: white; font-weight: bold; margin-bottom: 10px; }
        .contact-subtitle { font-size: 14px; color: white; margin-bottom: 20px; opacity: 0.95; }
        .logo-container { margin-bottom: 20px; }
                 .social-grid { text-align: center; margin-bottom: 20px; }
         .social-icon { display: inline-block; width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 20px; margin: 0 8px; text-align: center; line-height: 40px; text-decoration: none; }
         .social-icon img { width: 20px; height: 20px; vertical-align: middle; }
        .contact-info { border-top: 1px solid rgba(255,255,255,0.3); padding-top: 15px; }
        .contact-info-text { color: white; font-size: 14px; margin-bottom: 5px; }
        
                 /* Responsive */
         @media (max-width: 600px) {
             .section { padding: 20px 15px; }
             .investment-table, .solar-table, .features-table { width: 100%; }
             .investment-box, .solar-box, .feature-box { display: block; width: 100% !important; margin-bottom: 15px; }
             .investment-table tr, .solar-table tr, .features-table tr { display: block; }
             .investment-table td, .solar-table td, .features-table td { display: block; width: 100%; }
             .trust-indicator { display: block; width: 100% !important; margin-bottom: 10px; }
             .trust-indicators table, .trust-indicators tr { display: block; }
             .trust-indicators td { display: block; width: 100%; }
         }
    </style>
</head>
<body>
    <div class="container">
                 <!-- Hero Section -->
         <div class="hero-section">
             <div class="hero-header">
                 <h1 class="hero-title">¡Descubre cuánto puedes ahorrar con energía solar!</h1>
                 <p class="hero-subtitle">Tu tejado puede generar hasta ${formatCurrency(submission.firstYearSavings)} de ahorro anual</p>
             </div>
             <div class="hero-image-container">
                 <img src="${getEmailImageUrl('/familia.png')}" alt="Familia feliz con energía solar" class="hero-image">
             </div>
             <div class="hero-callout">
                 <p class="hero-callout-text">Solo necesitas 2 facturas para conocer tu ahorro exacto</p>
             </div>
         </div>

        <!-- Greeting Section -->
        <div class="greeting-section">
            <h2 class="greeting-title">Hola, ${submission.userName || 'futuro/a productor/a de energía solar'}</h2>
            <p class="greeting-text">
                Has dado el primer paso hacia la independencia energética, y estamos aquí para acompañarte en este emocionante viaje. 
                En Wattify, no solo instalamos paneles solares: <span class="greeting-highlight">creamos tu propia central eléctrica personal</span>.
            </p>
        </div>

                 <!-- Investment Stats -->
         <div class="investment-section">
             <h2 class="investment-title">La inversión más rentable para tu familia</h2>
             <table class="investment-table">
                 <tr>
                     <td class="investment-box" style="background-color: #E8F5E9;">
                         <span class="investment-value" style="color: #27ae60;">${formatCurrency(submission.totalCost)}</span>
                         <span class="investment-label">Inversión Inicial</span>
                     </td>
                     <td class="investment-box" style="background-color: #E8F5E9;">
                         <span class="investment-value" style="color: #27ae60;">${formatCurrency(submission.firstYearSavings)}</span>
                         <span class="investment-label">Ahorro Anual</span>
                     </td>
                     <td class="investment-box" style="background-color: #E8F5E9;">
                         <span class="investment-value" style="color: #27ae60;">${formatCurrency(submission.lifetimeSavings)}</span>
                         <span class="investment-label">Ahorro 20 años</span>
                     </td>
                     <td class="investment-box" style="background-color: #E8F5E9;">
                         <span class="investment-value" style="color: #27ae60;">${getPaybackDisplay(submission.paybackYears, submission.firstYearSavings, submission.lifetimeSavings)}</span>
                         <span class="investment-label">Amortización</span>
                     </td>
                 </tr>
             </table>
         </div>

        <!-- Solar Potential Section -->
        <div class="section">
            <h2 class="section-title">Su tejado tiene un excelente potencial solar</h2>
            <p style="margin-bottom: 20px; font-size: 16px; color: #495057;">
                Hemos calculado que con ${formatNumber(parsedGoogleSolarData?.panelsCount)} paneles solares de alta eficiencia, 
                su hogar podrá generar ${formatNumber(parsedGoogleSolarData?.yearlyEnergyDcKwh)} kWh de electricidad limpia al año. 
                Esto equivale a cubrir aproximadamente el ${coverage}% de su consumo actual.
            </p>
                         <table class="solar-table">
                 <tr>
                     <td class="solar-box">
                         <span class="solar-value">${formatNumber(submission.averageKwhConsumption)} kWh</span>
                         <span class="solar-label">Consumo Mensual</span>
                     </td>
                     <td class="solar-box">
                         <span class="solar-value">${formatNumber(parsedGoogleSolarData?.panelsCount)}</span>
                         <span class="solar-label">Número de Paneles</span>
                     </td>
                     <td class="solar-box">
                         <span class="solar-value">${formatNumber(parsedGoogleSolarData?.yearlyEnergyDcKwh)} kWh</span>
                         <span class="solar-label">Producción Anual</span>
                     </td>
                     <td class="solar-box">
                         <span class="solar-value">${formatCurrency(submission.totalCost)}</span>
                         <span class="solar-label">Precio Instalación</span>
                     </td>
                 </tr>
             </table>
        </div>

        <!-- Cost Breakdown Section -->
        <div class="section section-alt">
            <h2 class="section-title">Desglose de Costes</h2>
            <p style="margin-bottom: 20px; font-size: 16px; font-weight: bold; color: #27ae60;">
                Transparencia total en su inversión
            </p>
            <p style="margin-bottom: 20px; font-size: 14px; color: #495057;">
                Cada ${submission.currencyCode === 'COP' ? 'COP' : '€'} está justificado: desde los paneles de última generación hasta el sistema de monitorización 
                que le permitirá ver en tiempo real cuánta energía está produciendo.
            </p>
            <div class="cost-grid">
                ${costBreakdown?.serviciosInstalacionPuestaMarcha ? `
                <div class="cost-item">
                    <span class="cost-label">Servicios e instalación (25%):</span>
                    <span class="cost-value">${formatCurrency(costBreakdown.serviciosInstalacionPuestaMarcha)}</span>
                </div>` : ''}
                ${costBreakdown?.costePanel ? `
                <div class="cost-item">
                    <span class="cost-label">Coste paneles (25%):</span>
                    <span class="cost-value">${formatCurrency(costBreakdown.costePanel)}</span>
                </div>` : ''}
                ${costBreakdown?.costeInversor ? `
                <div class="cost-item">
                    <span class="cost-label">Coste inversor (15%):</span>
                    <span class="cost-value">${formatCurrency(costBreakdown.costeInversor)}</span>
                </div>` : ''}
                ${costBreakdown?.puestaMarchaLegalizacion ? `
                <div class="cost-item">
                    <span class="cost-label">Legalización (15%):</span>
                    <span class="cost-value">${formatCurrency(costBreakdown.puestaMarchaLegalizacion)}</span>
                </div>` : ''}
                ${costBreakdown?.herramientaMonitorizacion ? `
                <div class="cost-item">
                    <span class="cost-label">Monitorización (10%):</span>
                    <span class="cost-value">${formatCurrency(costBreakdown.herramientaMonitorizacion)}</span>
                </div>` : ''}
                ${costBreakdown?.garantiaSoporteTecnico ? `
                <div class="cost-item">
                    <span class="cost-label">Garantía y soporte (5%):</span>
                    <span class="cost-value">${formatCurrency(costBreakdown.garantiaSoporteTecnico)}</span>
                </div>` : ''}
                ${costBreakdown?.estructura ? `
                <div class="cost-item">
                    <span class="cost-label">Estructura (5%):</span>
                    <span class="cost-value">${formatCurrency(costBreakdown.estructura)}</span>
                </div>` : ''}
            </div>
            <div class="cost-total">
                <div class="cost-item">
                    <span class="cost-label" style="font-weight: bold; font-size: 16px;">Total sin IVA:</span>
                    <span class="cost-value">${formatCurrency(submission.totalCost)}</span>
                </div>
            </div>
        </div>

        <!-- Equipment Specifications -->
        <div class="section" style="background-color: #e8f5e8;">
            <h2 class="section-title">Especificaciones del Equipamiento</h2>
            <p style="margin-bottom: 20px; font-size: 14px; color: #495057;">
                Su instalación incluye equipos de alta calidad seleccionados específicamente para maximizar 
                el rendimiento y la durabilidad de su sistema solar.
            </p>
            <div class="equipment-item">
                <div class="equipment-label">Panel Solar Seleccionado:</div>
                <div class="equipment-value">${selectedPanelName || 'Panel solar de alta eficiencia'}</div>
            </div>
            <div class="equipment-item">
                <div class="equipment-label">Inversor Seleccionado:</div>
                <div class="equipment-value">
                    ${selectedInverterName || 'Inversor de alta calidad'}
                    ${selectedInverterPeakPower ? ` (${selectedInverterPeakPower} kW)` : ''}
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
                <div class="equipment-item">
                    <div class="equipment-label">Potencia del Sistema:</div>
                    <div class="equipment-value">${installationSizeKW ? `${formatNumber(installationSizeKW)} kWp` : 'N/A'}</div>
                </div>
                <div class="equipment-item">
                    <div class="equipment-label">Número de Paneles:</div>
                    <div class="equipment-value">${formatNumber(parsedGoogleSolarData?.panelsCount)}</div>
                </div>
            </div>
        </div>

        <!-- Why Wattify is Different -->
        <div class="section section-alt">
            <h2 class="section-title">Por qué Wattify es diferente: Consultoría 100% Personalizada</h2>
            <p style="margin-bottom: 25px; font-size: 14px; color: #495057; text-align: center;">
                En Wattify realizamos una venta consultativa donde cada proyecto es único. 
                Nos adaptamos a las necesidades energéticas actuales y futuras de nuestros clientes.
            </p>
                         <table class="features-table">
                 <tr>
                     <td class="feature-box">
                         <span class="feature-title">Análisis de Tejado Personalizado</span>
                         <span class="feature-description">Estudiamos orientación, inclinación y estado de tu tejado</span>
                         <span class="feature-highlight">Cada grado cuenta para maximizar TU rendimiento</span>
                     </td>
                     <td class="feature-box" style="border-left-color: #007bff;">
                         <span class="feature-title" style="color: #007bff;">Diseño Energético a Medida</span>
                         <span class="feature-description">Analizamos tus consumos actuales y proyectamos futuros</span>
                         <span class="feature-highlight" style="color: #007bff;">¿Coche eléctrico? ¿Piscina? ¿Ampliación? Lo incluimos todo</span>
                     </td>
                 </tr>
                 <tr>
                     <td class="feature-box">
                         <span class="feature-title">Configuración Específica</span>
                         <span class="feature-description">No vendemos paquetes estándar</span>
                         <span class="feature-highlight">Tu instalación se diseña específicamente para TI</span>
                     </td>
                     <td class="feature-box" style="border-left-color: #007bff;">
                         <span class="feature-title" style="color: #007bff;">Seguimiento Post-Instalación</span>
                         <span class="feature-description">Adaptamos y optimizamos según evolucione tu consumo</span>
                         <span class="feature-highlight" style="color: #007bff;">Tu consultor permanece disponible</span>
                     </td>
                 </tr>
             </table>
        </div>

        <!-- CTA Section -->
        <div class="cta-section">
            <div class="cta-box">
                <h2 class="cta-title">🚀 Paso 1: Envía tus facturas</h2>
                <p class="cta-description">
                    Adjunta al menos 2 facturas recientes (preferiblemente descargadas de tu compañía)
                </p>
                                 <div class="cta-button">
                     <a href="mailto:${contactEmail}?subject=Facturas%20para%20an%C3%A1lisis%20solar&body=Hola,%0A%0AAdjunto%20mis%20facturas%20para%20el%20an%C3%A1lisis%20solar.%0A%0AID%20de%20solicitud:%20${String(submission.id || 'N/A')}%0A%0ASaludos">
                         ENVÍANOS TUS FACTURAS
                     </a>
                 </div>
                 <div class="trust-indicators">
                     <table>
                         <tr>
                             <td class="trust-indicator">
                                 <span class="trust-icon">🛡️</span>
                                 <span class="trust-title">Proceso 100%</span>
                                 <span class="trust-text">seguro y confidencial</span>
                             </td>
                             <td class="trust-indicator">
                                 <span class="trust-icon">⏰</span>
                                 <span class="trust-title">Análisis listo</span>
                                 <span class="trust-text">en 24-48 horas</span>
                             </td>
                             <td class="trust-indicator">
                                 <span class="trust-icon">👍</span>
                                 <span class="trust-title">Sin compromiso</span>
                                 <span class="trust-text">ni coste alguno</span>
                             </td>
                         </tr>
                     </table>
                 </div>
            </div>
        </div>

                 <!-- Contact Section -->
         <div class="contact-section">
             <div class="logo-container">
                 <img src="${getEmailImageUrl('/wattifylogoblanco.png')}" alt="Wattify Logo" style="height: 80px;">
             </div>
             <h2 class="contact-title">Gracias por confiar en nosotros</h2>
             <p class="contact-subtitle">
                 Tu decisión de apostar por la energía solar es una inversión en tu futuro y en el planeta. 
                 Estamos aquí para hacer realidad tu proyecto energético.
             </p>
             <div class="social-grid">
                 <a href="https://www.facebook.com/wattify/" class="social-icon">
                     <img src="${getEmailImageUrl('/facebook.png')}" alt="Facebook" style="width: 20px; height: 20px;">
                 </a>
                 <a href="https://www.instagram.com/mr.wattify/" class="social-icon">
                     <img src="${getEmailImageUrl('/instagram.png')}" alt="Instagram" style="width: 20px; height: 20px;">
                 </a>
                 <a href="https://www.linkedin.com/company/wattify_renovables" class="social-icon">
                     <img src="${getEmailImageUrl('/linkedin.png')}" alt="LinkedIn" style="width: 20px; height: 20px;">
                 </a>
                 <div class="social-icon">
                     <img src="${getEmailImageUrl('/youtube.png')}" alt="YouTube" style="width: 20px; height: 20px;">
                 </div>
             </div>
            <div class="contact-info">
                <div class="contact-info-text">📧 ${contactEmail}</div>
                <div class="contact-info-text">📞 ${contactPhone}</div>
                <div class="contact-info-text">🌐 ${contactWebsite}</div>
                <div style="margin-top: 15px; font-size: 12px; color: rgba(255,255,255,0.8);">
                    ID de la Solicitud: ${String(submission.id || 'N/A')} | 
                    Fecha: ${safeCreatedAt.toLocaleDateString('es-ES')}
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;

    const mailOptions = {
        from: config.from,
        to: submission.userEmail || '',
        subject: 'Tu Informe de Potencial Solar',
        html: emailContent, // Use html instead of text
        attachments: [
            {
                filename: `informe-solar-${String(submission.id || 'N/A').substring(0, 8)}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            },
            ...datasheetAttachments,
            ...(imageAttachments as any[])
        ]
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully to:', mailOptions.to);
    } catch (error: any) {
        console.error('Error sending email:', error);
        throw new Error(`Failed to send email: ${error?.message || 'Unknown error'}`);
    }
}