/* eslint-disable jsx-a11y/alt-text */

import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Image,
    Svg,
    Path,
    Circle,
} from '@react-pdf/renderer';

const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 20,
        fontFamily: 'Helvetica',
    },

    // Header Section
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 30,
        paddingBottom: 20,
        borderBottom: '3px solid #059669',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    logo: {
        width: 80,
        height: 60,
        marginRight: 15,
    },
    headerText: {
        flex: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 14,
        color: '#6c757d',
    },
    headerRight: {
        textAlign: 'right',
    },
    idText: {
        fontSize: 12,
        color: '#6c757d',
        marginBottom: 2,
    },
    dateText: {
        fontSize: 12,
        color: '#6c757d',
    },

    // Section Styles
    section: {
        marginBottom: 18, // slightly tighter spacing between sections
        paddingLeft: 15,
        borderLeft: '3px solid #059669',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    sectionIcon: {
        width: 20,
        height: 20,
        marginRight: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
    },

    subSectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 10,
        marginTop: 10,
    },

    // Client Information
    clientGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    clientItem: {
        width: '32%', // 3 columns to reduce vertical space
        marginBottom: 8,
    },
    clientLabel: {
        fontSize: 10,
        color: '#6c757d',
        marginBottom: 2,
    },
    clientValue: {
        fontSize: 12,
        color: '#2c3e50',
        fontWeight: 'bold',
    },



    // Installation Details Grid
    detailsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 15,
    },
    detailBox: {
        width: '23%',
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 8,
        textAlign: 'center',
        border: '1px solid #e9ecef',
        alignItems: 'center',
    },
    detailIcon: {
        fontSize: 24,
        marginBottom: 8,
    },
    detailLabel: {
        fontSize: 10,
        color: '#6c757d',
        marginBottom: 5,
    },
    detailValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2c3e50',
    },

    // Cost Breakdown
    costBreakdownContainer: {
        flexDirection: 'row',
        gap: 20,
    },
    costList: {
        flex: 1,
    },
    costItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottom: '1px solid #e9ecef',
    },
    costLabel: {
        fontSize: 12,
        color: '#6c757d',
        flex: 1,
    },
    costValue: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderTop: '2px solid #059669',
        marginTop: 10,
    },
    totalLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    totalValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#059669',
    },
    chartContainer: {
        width: 200,
        height: 200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pieChartContainer: {
        width: 180,
        height: 180,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chartTitle: {
        fontSize: 12,
        color: '#2c3e50',
        textAlign: 'center',
        fontWeight: 'bold',
        marginBottom: 10,
    },
    chartLegend: {
        marginTop: 10,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 3,
    },
    legendColor: {
        width: 12,
        height: 12,
        marginRight: 5,
    },
    legendText: {
        fontSize: 9,
        color: '#2c3e50',
    },

    // Financial Analysis Grid
    financialGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 15,
    },
    financialBox: {
        width: '23%',
        backgroundColor: '#f8f9fa',
        padding: 20,
        borderRadius: 8,
        textAlign: 'center',
        border: '1px solid #e9ecef',
        alignItems: 'center',
    },
    financialIcon: {
        fontSize: 24,
        marginBottom: 10,
        color: '#059669',
    },
    financialLabel: {
        fontSize: 10,
        color: '#6c757d',
        marginBottom: 8,
    },
    financialValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2c3e50',
    },

    // Description text
    description: {
        fontSize: 12,
        color: '#495057',
        lineHeight: 1.5,
        marginBottom: 15,
        textAlign: 'justify',
    },

    // Contact section styles
    contactContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 20,
    },
    contactBox: {
        width: '30%',
        backgroundColor: '#f8f9fa',
        padding: 20,
        borderRadius: 8,
        textAlign: 'center',
        border: '1px solid #e9ecef',
        alignItems: 'center',
    },
    contactIcon: {
        width: 24,
        height: 24,
        marginBottom: 10,
        alignSelf: 'center',
    },
    contactLabel: {
        fontSize: 12,
        color: '#6c757d',
        marginBottom: 5,
    },
    contactValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2c3e50',
    },

    // Results interpretation styles
    interpretationItem: {
        marginBottom: 20,
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 8,
        border: '1px solid #e9ecef',
    },
    interpretationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    interpretationIcon: {
        width: 16,
        height: 16,
        marginRight: 8,
    },
    interpretationTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    interpretationText: {
        fontSize: 11,
        color: '#495057',
        lineHeight: 1.4,
    },

    // Methodology styles
    methodologyList: {
        marginBottom: 15,
    },
    methodologyItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 5,
    },
    bullet: {
        fontSize: 12,
        color: '#059669',
        marginRight: 8,
        marginTop: 2,
    },
    methodologyText: {
        fontSize: 11,
        color: '#495057',
        flex: 1,
    },
    parameterItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
        borderBottom: '1px solid #e9ecef',
    },
    parameterLabel: {
        fontSize: 11,
        color: '#6c757d',
    },
    parameterValue: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#2c3e50',
    },

    // Benefits styles
    benefitItem: {
        alignItems: 'center',
        marginBottom: 25,
        textAlign: 'center',
        backgroundColor: '#f8f9fa',
        padding: 20,
        borderRadius: 8,
        border: '1px solid #e9ecef',
    },
    benefitIcon: {
        width: 32,
        height: 32,
        marginBottom: 10,
        alignSelf: 'center',
    },
    benefitTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 5,
    },
    benefitText: {
        fontSize: 11,
        color: '#495057',
        textAlign: 'center',
    },
    // Equipment grid styles
    equipmentContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    equipmentBox: {
        width: '50%',
        marginBottom: 6,
    },
});

interface SubmissionPDFProps {
    // Client info
    userName: string;
    userEmail: string;
    userPhone: string;
    address: string;
    city: string;
    // Installation details
    averageKwhConsumption: number | null | undefined;
    monthlyElectricityBillAmount: number | null | undefined;
    panelCount: number | null | undefined;
    yearlyEnergyDcKwh: number | null | undefined;
    installationSizeKW: number | null | undefined;
    priceKWUsed: number | null | undefined;
    precioFinal: number | null | undefined;
    selectedPanelName: string | null | undefined;
    selectedInverterName: string | null | undefined;
    selectedInverterPeakPower: number | null | undefined;
    // Orthophoto URL
    orthophotoUrl?: string | null | undefined;
    orthophotoBase64?: string | null | undefined;
    // Cost breakdown
    costBreakdown: {
        serviciosInstalacionPuestaMarcha?: number | null;
        costePanel?: number | null;
        costeInversor?: number | null;
        puestaMarchaLegalizacion?: number | null;
        garantiaSoporteTecnico?: number | null;
        herramientaMonitorizacion?: number | null;
        estructura?: number | null;
    };
    ivaAmount: number | null | undefined;
    totalCostWithIva: number | null | undefined;
    // Financial analysis
    totalCost: number | null | undefined;
    firstYearSavings: number | null | undefined;
    lifetimeSavings: number | null | undefined;
    paybackYears: number | null | undefined;
    currencyCode: string;
    // Constants
    constants: Record<string, number>;
    // Incentive note
    incentiveNote: string;
    // Footer
    id: string;
    createdAt: Date;
    // Country for basic/styled PDF selection
    country?: string;
    // Image URLs for server-side PDF generation
    images?: {
        familia?: string;
        wattifyLogo?: string;
        paperplane?: string;
        shield?: string;
        clock?: string;
        thumb?: string;
        facebook?: string;
        instagram?: string;
        linkedin?: string;
        youtube?: string;
        // Icons
        user?: string;
        solar?: string;
        lightning?: string;
        panels?: string;
        stockup?: string;
        euro?: string;
        coins?: string;
        bank?: string;
        piechart?: string;
        calculadora?: string;
        lightbulb?: string;
        phone?: string;
        web?: string;
        calendar?: string;
        leaf?: string;
        tree?: string;
        home?: string;
    };
    // SVG icon URLs for server-side PDF generation
    svgIcons?: {
        user?: string;
        lightning?: string;
        panels?: string;
        stockup?: string;
        euro?: string;
        coins?: string;
        bank?: string;
        piechart?: string;
        calculadora?: string;
    };
}

export type { SubmissionPDFProps };

function formatCurrency(amount: number | null | undefined, currency: string = 'EUR') {
    if (amount === null || typeof amount === 'undefined') return 'N/A';
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency,
        maximumFractionDigits: currency === 'COP' ? 0 : 2,
    }).format(amount);
}

function formatNumber(num: number | null | undefined) {
    if (num === null || typeof num === 'undefined') return 'N/A';
    return new Intl.NumberFormat('es-ES').format(num);
}

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

// Pie chart component
function PieChart({ data, width = 180, height = 180 }: { data: Array<{ label: string; value: number; color: string; percentage: string }>, width?: number, height?: number }) {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 10;

    let currentAngle = -90; // Start at top

    const segments = data.map((item) => {
        const startAngle = currentAngle;
        const endAngle = currentAngle + (item.value / 100) * 360;
        currentAngle = endAngle;

        const startAngleRad = (startAngle * Math.PI) / 180;
        const endAngleRad = (endAngle * Math.PI) / 180;

        const x1 = centerX + radius * Math.cos(startAngleRad);
        const y1 = centerY + radius * Math.sin(startAngleRad);
        const x2 = centerX + radius * Math.cos(endAngleRad);
        const y2 = centerY + radius * Math.sin(endAngleRad);

        const largeArcFlag = item.value > 50 ? 1 : 0;

        const pathData = [
            `M ${centerX} ${centerY}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            'Z'
        ].join(' ');

        return (
            <Path
                key={item.label}
                d={pathData}
                fill={item.color}
                stroke="#ffffff"
                strokeWidth={2}
            />
        );
    });

    return (
        <Svg width={width} height={height}>
            {segments}
        </Svg>
    );
}

function getBase64ImageSrc(base64: string): string {
    // Detect common image signatures to choose correct MIME type
    const jpegSignatures = ['/9j', 'iVBOR', 'R0lG']; // include PNG and GIF? Actually iVBOR is PNG, JPEG is /9j
    // If starts with /9j it's JPEG
    if (base64.startsWith('/9j')) {
        return `data:image/jpeg;base64,${base64}`;
    }
    // Default to PNG for other cases (iVBORw0KGgo= is PNG header)
    return `data:image/png;base64,${base64}`;
}

const SubmissionPDF: React.FC<SubmissionPDFProps> = ({
    userName,
    userEmail,
    userPhone,
    address,
    city,
    averageKwhConsumption,
    panelCount,
    yearlyEnergyDcKwh,
    totalCost,
    firstYearSavings,
    lifetimeSavings,
    paybackYears,
    currencyCode,
    costBreakdown,
    installationSizeKW,
    selectedPanelName,
    selectedInverterName,
    selectedInverterPeakPower,
    orthophotoUrl,
    orthophotoBase64,
    id,
    createdAt,
    images,
    svgIcons,
}) => {
    // Helper function to get image URL
    const getImageUrl = (imageName: keyof NonNullable<typeof images>) => {
        return images?.[imageName] || `/${imageName}.png`;
    };

    // Helper function to get PNG icon URL
    const getPngIconUrl = (iconName: string) => {
        // First try to get it from the images prop (which contains absolute URLs)
        if (images && (iconName in images)) {
            return images[iconName as keyof typeof images];
        }
        // Fallback to svgIcons if it matches
        if (svgIcons && (iconName in svgIcons)) {
            return svgIcons[iconName as keyof typeof svgIcons];
        }
        // Last fallback to relative path (may fail on server)
        return `/${iconName}.png`;
    };

    // Prepare pie chart data using the same logic as the submit route
    // These are the default percentages from the schema and submit route
    // Adjusted to total exactly 100%
    const DEFAULT_USER_SETTINGS = {
        installationServicesPercentage: 0.25, // 25% for "servicios de instalación y puesta en marcha" (reduced from 30% to balance total)
        inverterCostPercentage: 0.15, // 15% for "coste de inversor"
        commissioningLegalizationPercentage: 0.15, // 15% for "Legalización"
        warrantySupportPercentage: 0.05, // 5% for "Garantía y soporte técnico"
        monitoringToolPercentage: 0.10, // 10% for "Herramienta del monitorización"
        structureCostPercentage: 0.05, // 5% for "estructura"
    };

    const DEFAULT_SYSTEM_SETTINGS = {
        panelComponentPercentage: 0.25, // 25% for "coste de panel"
    };

    // Use the correct percentage mapping (totals exactly 100%)
    const installationServicesPercent = DEFAULT_USER_SETTINGS.installationServicesPercentage; // 25%
    const panelPercent = DEFAULT_SYSTEM_SETTINGS.panelComponentPercentage; // 25%
    const inverterPercent = DEFAULT_USER_SETTINGS.inverterCostPercentage; // 15%
    const legalizationPercent = DEFAULT_USER_SETTINGS.commissioningLegalizationPercentage; // 15%
    const warrantyPercent = DEFAULT_USER_SETTINGS.warrantySupportPercentage; // 5%
    const monitoringPercent = DEFAULT_USER_SETTINGS.monitoringToolPercentage; // 10%
    const structurePercent = DEFAULT_USER_SETTINGS.structureCostPercentage; // 5%
    // Total: 25% + 25% + 15% + 15% + 5% + 10% + 5% = 100%

    const pieChartData = [];

    // Always include all cost components to ensure consistent 100% total
    pieChartData.push({
        label: 'Instalación',
        value: Math.round(installationServicesPercent * 100),
        color: '#059669',
        percentage: `${Math.round(installationServicesPercent * 100)}%`
    });

    pieChartData.push({
        label: 'Paneles',
        value: Math.round(panelPercent * 100),
        color: '#0891b2',
        percentage: `${Math.round(panelPercent * 100)}%`
    });

    pieChartData.push({
        label: 'Inversor',
        value: Math.round(inverterPercent * 100),
        color: '#7c3aed',
        percentage: `${Math.round(inverterPercent * 100)}%`
    });

    pieChartData.push({
        label: 'Legalización',
        value: Math.round(legalizationPercent * 100),
        color: '#dc2626',
        percentage: `${Math.round(legalizationPercent * 100)}%`
    });

    pieChartData.push({
        label: 'Monitorización',
        value: Math.round(monitoringPercent * 100),
        color: '#ea580c',
        percentage: `${Math.round(monitoringPercent * 100)}%`
    });

    pieChartData.push({
        label: 'Garantía',
        value: Math.round(warrantyPercent * 100),
        color: '#16a34a',
        percentage: `${Math.round(warrantyPercent * 100)}%`
    });

    pieChartData.push({
        label: 'Estructura',
        value: Math.round(structurePercent * 100),
        color: '#8b5cf6',
        percentage: `${Math.round(structurePercent * 100)}%`
    });

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Image
                            style={styles.logo}
                            src={getImageUrl('wattifyLogo')}
                        />
                        <View style={styles.headerText}>
                            <Text style={styles.title}>Informe de Estimación Solar</Text>
                            <Text style={styles.subtitle}>Análisis personalizado de potencial solar</Text>
                        </View>
                    </View>
                </View>

                {/* Client Information */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIcon}>
                            <Image src={getPngIconUrl('user')} style={{ width: 20, height: 20 }} />
                        </View>
                        <Text style={styles.sectionTitle}>Información del Cliente</Text>
                    </View>
                    <View style={styles.clientGrid}>
                        <View style={styles.clientItem}>
                            <Text style={styles.clientLabel}>Nombre:</Text>
                            <Text style={styles.clientValue}>{userName}</Text>
                        </View>
                        <View style={styles.clientItem}>
                            <Text style={styles.clientLabel}>Email:</Text>
                            <Text style={styles.clientValue}>{userEmail}</Text>
                        </View>
                        <View style={styles.clientItem}>
                            <Text style={styles.clientLabel}>Teléfono:</Text>
                            <Text style={styles.clientValue}>{userPhone}</Text>
                        </View>
                        <View style={styles.clientItem}>
                            <Text style={styles.clientLabel}>Dirección:</Text>
                            <Text style={styles.clientValue}>{address}</Text>
                        </View>
                        <View style={styles.clientItem}>
                            <Text style={styles.clientLabel}>Ciudad:</Text>
                            <Text style={styles.clientValue}>{city}</Text>
                        </View>
                    </View>
                </View>

                {/* Installation Details */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIcon}>
                            <Image src={getPngIconUrl('solar')} style={{ width: 20, height: 20 }} />
                        </View>
                        <Text style={styles.sectionTitle}>Detalles de la Instalación</Text>
                    </View>
                    <Text style={styles.description}>
                        Estimación basada en datos de Google Solar API que analiza la irradiación solar, orientación del tejado y sombras para calcular el potencial de producción de energía.
                    </Text>
                    <View style={styles.detailsGrid}>
                        <View style={styles.detailBox}>
                            <Image src={getPngIconUrl('lightning')} style={{ width: 24, height: 24, marginBottom: 8, alignSelf: 'center' }} />
                            <Text style={styles.detailLabel}>Consumo Mensual</Text>
                            <Text style={styles.detailValue}>{formatNumber(averageKwhConsumption)} kWh</Text>
                        </View>
                        <View style={styles.detailBox}>
                            <Image src={getPngIconUrl('panels')} style={{ width: 24, height: 24, marginBottom: 8, alignSelf: 'center' }} />
                            <Text style={styles.detailLabel}>Número de Paneles</Text>
                            <Text style={styles.detailValue}>{formatNumber(panelCount)}</Text>
                        </View>
                        <View style={styles.detailBox}>
                            <Image src={getPngIconUrl('stockup')} style={{ width: 24, height: 24, marginBottom: 8, alignSelf: 'center' }} />
                            <Text style={styles.detailLabel}>Producción Anual</Text>
                            <Text style={styles.detailValue}>{formatNumber(yearlyEnergyDcKwh)} kWh</Text>
                        </View>
                        <View style={styles.detailBox}>
                            <Image src={getPngIconUrl('euro')} style={{ width: 24, height: 24, marginBottom: 8, alignSelf: 'center' }} />
                            <Text style={styles.detailLabel}>Precio Instalación</Text>
                            <Text style={styles.detailValue}>{formatCurrency(totalCost, currencyCode)}</Text>
                        </View>
                    </View>

                    {/* Equipment Details */}
                    {(selectedPanelName && selectedPanelName !== 'N/A') || (selectedInverterName && selectedInverterName !== 'N/A') ? (
                        <View style={{ marginTop: 15 }}>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#2c3e50', marginBottom: 8 }}>
                                Equipamiento Seleccionado
                            </Text>
                            <View style={styles.equipmentContainer}>
                                {selectedPanelName && selectedPanelName !== 'N/A' && (
                                    <View style={styles.equipmentBox}>
                                        <Text style={{ fontSize: 10, color: '#6c757d' }}>Panel Solar</Text>
                                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#2c3e50' }}>
                                            {selectedPanelName}
                                        </Text>
                                    </View>
                                )}
                                {selectedInverterName && selectedInverterName !== 'N/A' && (
                                    <View style={styles.equipmentBox}>
                                        <Text style={{ fontSize: 10, color: '#6c757d' }}>Inversor</Text>
                                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#2c3e50' }}>
                                            {selectedInverterName} {selectedInverterPeakPower ? `(${selectedInverterPeakPower} kW)` : ''}
                                        </Text>
                                    </View>
                                )}
                                {installationSizeKW && (
                                    <View style={styles.equipmentBox}>
                                        <Text style={{ fontSize: 10, color: '#6c757d' }}>Potencia Sistema</Text>
                                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#2c3e50' }}>
                                            {formatNumber(installationSizeKW)} kWp
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    ) : null}
                </View>

                {/* Orthophoto Image - Positioned after Installation Details */}
                {(() => {
                    const photoSrc: string | null = orthophotoBase64
                        ? getBase64ImageSrc(orthophotoBase64)
                        : (orthophotoUrl ?? null);
                    return photoSrc ? (
                        <View style={{ marginTop: 10, marginBottom: 10 }}>
                            <Image
                                src={photoSrc}
                                style={{
                                    width: '100%',
                                    height: 190,
                                    objectFit: 'cover', // fill width, slight crop allowed
                                    borderRadius: 8,
                                    border: '1px solid #e9ecef'
                                }}
                            />
                        </View>
                    ) : null;
                })()}
            </Page>

            <Page size="A4" style={styles.page}>
                {/* Cost Breakdown */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIcon}>
                            <Image src={getPngIconUrl('coins')} style={{ width: 20, height: 20 }} />
                        </View>
                        <Text style={styles.sectionTitle}>Desglose de Costes</Text>
                    </View>
                    <View style={styles.costBreakdownContainer}>
                        <View style={styles.costList}>
                            <View style={styles.costItem}>
                                <Text style={styles.costLabel}>
                                    Servicios e instalación ({pieChartData.find(item => item.label === 'Instalación')?.percentage || '25%'})
                                </Text>
                                <Text style={styles.costValue}>
                                    {formatCurrency(costBreakdown?.serviciosInstalacionPuestaMarcha, currencyCode)}
                                </Text>
                            </View>
                            <View style={styles.costItem}>
                                <Text style={styles.costLabel}>
                                    Coste paneles ({pieChartData.find(item => item.label === 'Paneles')?.percentage || '25%'})
                                </Text>
                                <Text style={styles.costValue}>
                                    {formatCurrency(costBreakdown?.costePanel, currencyCode)}
                                </Text>
                            </View>
                            <View style={styles.costItem}>
                                <Text style={styles.costLabel}>
                                    Coste inversor ({pieChartData.find(item => item.label === 'Inversor')?.percentage || '15%'})
                                </Text>
                                <Text style={styles.costValue}>
                                    {formatCurrency(costBreakdown?.costeInversor, currencyCode)}
                                </Text>
                            </View>
                            <View style={styles.costItem}>
                                <Text style={styles.costLabel}>
                                    Legalización ({pieChartData.find(item => item.label === 'Legalización')?.percentage || '15%'})
                                </Text>
                                <Text style={styles.costValue}>
                                    {formatCurrency(costBreakdown?.puestaMarchaLegalizacion, currencyCode)}
                                </Text>
                            </View>
                            <View style={styles.costItem}>
                                <Text style={styles.costLabel}>
                                    Monitorización ({pieChartData.find(item => item.label === 'Monitorización')?.percentage || '10%'})
                                </Text>
                                <Text style={styles.costValue}>
                                    {formatCurrency(costBreakdown?.herramientaMonitorizacion, currencyCode)}
                                </Text>
                            </View>
                            <View style={styles.costItem}>
                                <Text style={styles.costLabel}>
                                    Garantía y soporte ({pieChartData.find(item => item.label === 'Garantía')?.percentage || '5%'})
                                </Text>
                                <Text style={styles.costValue}>
                                    {formatCurrency(costBreakdown?.garantiaSoporteTecnico, currencyCode)}
                                </Text>
                            </View>
                            <View style={styles.costItem}>
                                <Text style={styles.costLabel}>
                                    Estructura ({pieChartData.find(item => item.label === 'Estructura')?.percentage || '5%'})
                                </Text>
                                <Text style={styles.costValue}>
                                    {formatCurrency(costBreakdown?.estructura, currencyCode)}
                                </Text>
                            </View>
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>Total sin IVA</Text>
                                <Text style={styles.totalValue}>{formatCurrency(totalCost, currencyCode)}</Text>
                            </View>
                        </View>

                        {/* Real Pie Chart */}
                        <View style={styles.chartContainer}>
                            <Text style={styles.chartTitle}>
                                Distribución de Costes{'\n'}de la Instalación
                            </Text>
                            <View style={styles.pieChartContainer}>
                                <PieChart data={pieChartData} width={140} height={140} />
                            </View>
                            <View style={styles.chartLegend}>
                                {pieChartData.map((item, index) => (
                                    <View key={index} style={styles.legendItem}>
                                        <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                                        <Text style={styles.legendText}>
                                            {item.label} ({item.percentage})
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                </View>

                {/* Financial Analysis */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIcon}>
                            <Image src={getPngIconUrl('piechart')} style={{ width: 20, height: 20 }} />
                        </View>
                        <Text style={styles.sectionTitle}>Análisis Financiero</Text>
                    </View>
                    <Text style={styles.description}>
                        {currencyCode === 'COP'
                            ? 'Cálculos basados en tarifa eléctrica de 986 COP/kWh y escalado del 2,2% anual.'
                            : 'Incluye bonificación IRPF del 30% sobre el precio del proyecto. Cálculos basados en tarifa eléctrica de 0,20 €/kWh y escalado del 2,2% anual.'
                        }
                    </Text>
                    <View style={styles.financialGrid}>
                        <View style={styles.financialBox}>
                            <Image src={getPngIconUrl('bank')} style={{ width: 24, height: 24, marginBottom: 8, alignSelf: 'center' }} />
                            <Text style={styles.financialLabel}>Inversión Inicial</Text>
                            <Text style={styles.financialValue}>{formatCurrency(totalCost, currencyCode)}</Text>
                        </View>
                        <View style={styles.financialBox}>
                            <Image src={getPngIconUrl('coins')} style={{ width: 24, height: 24, marginBottom: 8, alignSelf: 'center' }} />
                            <Text style={styles.financialLabel}>Ahorro Anual</Text>
                            <Text style={styles.financialValue}>{formatCurrency(firstYearSavings, currencyCode)}</Text>
                        </View>
                        <View style={styles.financialBox}>
                            <Image src={getPngIconUrl('stockup')} style={{ width: 24, height: 24, marginBottom: 8, alignSelf: 'center' }} />
                            <Text style={styles.financialLabel}>Ahorro 20 años</Text>
                            <Text style={styles.financialValue}>{formatCurrency(lifetimeSavings, currencyCode)}</Text>
                        </View>
                        <View style={styles.financialBox}>
                            <Image src={getPngIconUrl('calculadora')} style={{ width: 24, height: 24, marginBottom: 8, alignSelf: 'center' }} />
                            <Text style={styles.financialLabel}>Amortización</Text>
                            <Text style={styles.financialValue}>
                                {getPaybackDisplay(paybackYears, firstYearSavings, lifetimeSavings)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Contact Information */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIcon}>
                            <Image src={getPngIconUrl('lightbulb')} style={{ width: 20, height: 20 }} />
                        </View>
                        <Text style={styles.sectionTitle}>Información Detallada y Contacto</Text>
                    </View>
                    <View style={styles.contactContainer}>
                        <View style={styles.contactBox}>
                            <Image src={getPngIconUrl('phone')} style={styles.contactIcon} />
                            <Text style={styles.contactLabel}>Llámanos</Text>
                            <Text style={styles.contactValue}>628292462</Text>
                        </View>
                        <View style={styles.contactBox}>
                            <Image src={getPngIconUrl('web')} style={styles.contactIcon} />
                            <Text style={styles.contactLabel}>Visítanos</Text>
                            <Text style={styles.contactValue}>www.wattify.es</Text>
                        </View>
                        <View style={styles.contactBox}>
                            <Image src={getPngIconUrl('calendar')} style={styles.contactIcon} />
                            <Text style={styles.contactLabel}>Reserva Cita</Text>
                            <Text style={styles.contactValue}>Agenda 15 min</Text>
                        </View>
                    </View>
                </View>
            </Page>

            <Page size="A4" style={styles.page}>
                {/* Results Interpretation */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIcon}>
                            <Image src={getPngIconUrl('lightbulb')} style={{ width: 20, height: 20 }} />
                        </View>
                        <Text style={styles.sectionTitle}>¿Cómo Interpretar los Resultados?</Text>
                    </View>

                    <View style={styles.interpretationItem}>
                        <View style={styles.interpretationHeader}>
                            <Image src={getPngIconUrl('lightning')} style={styles.interpretationIcon} />
                            <Text style={styles.interpretationTitle}>Producción Mensual</Text>
                        </View>
                        <Text style={styles.interpretationText}>
                            El gráfico muestra la energía que generarán tus paneles cada mes. Los meses de verano producen más energía debido a mayor irradiación solar y más horas de luz.
                        </Text>
                    </View>

                    <View style={styles.interpretationItem}>
                        <View style={styles.interpretationHeader}>
                            <Image src={getPngIconUrl('coins')} style={styles.interpretationIcon} />
                            <Text style={styles.interpretationTitle}>Distribución de Costes</Text>
                        </View>
                        <Text style={styles.interpretationText}>
                            Desglose transparente de todos los componentes de tu instalación. Los paneles y la instalación representan la mayor parte del coste, garantizando calidad y durabilidad.
                        </Text>
                    </View>

                    <View style={styles.interpretationItem}>
                        <View style={styles.interpretationHeader}>
                            <Image src={getPngIconUrl('stockup')} style={styles.interpretationIcon} />
                            <Text style={styles.interpretationTitle}>Evolución del Ahorro</Text>
                        </View>
                        <Text style={styles.interpretationText}>
                            Muestra cómo se acumula tu ahorro año tras año. Después del período de amortización, todo el ahorro es beneficio puro durante los siguientes años.
                        </Text>
                    </View>

                    <View style={styles.interpretationItem}>
                        <View style={styles.interpretationHeader}>
                            <Image src={getPngIconUrl('calculadora')} style={styles.interpretationIcon} />
                            <Text style={styles.interpretationTitle}>Período de Amortización</Text>
                        </View>
                        <Text style={styles.interpretationText}>
                            Tiempo estimado para recuperar tu inversión inicial. Con los ahorros en tu factura eléctrica, recuperarás la inversión según los cálculos mostrados.
                        </Text>
                    </View>
                </View>

                {/* Methodology */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIcon}>
                            <Image src={getPngIconUrl('lightbulb')} style={{ width: 20, height: 20 }} />
                        </View>
                        <Text style={styles.sectionTitle}>Metodología y Fuentes de Datos</Text>
                    </View>

                    <View>
                        <Text style={styles.subSectionTitle}>Google Solar API</Text>
                        <Text style={styles.description}>
                            Nuestros cálculos utilizan la avanzada API Solar de Google, que combina:
                        </Text>

                        <View style={styles.methodologyList}>
                            <View style={styles.methodologyItem}>
                                <Text style={styles.bullet}>•</Text>
                                <Text style={styles.methodologyText}>Imágenes aéreas de alta resolución</Text>
                            </View>
                            <View style={styles.methodologyItem}>
                                <Text style={styles.bullet}>•</Text>
                                <Text style={styles.methodologyText}>Modelado 3D del tejado y sombras</Text>
                            </View>
                            <View style={styles.methodologyItem}>
                                <Text style={styles.bullet}>•</Text>
                                <Text style={styles.methodologyText}>Datos meteorológicos históricos</Text>
                            </View>
                            <View style={styles.methodologyItem}>
                                <Text style={styles.bullet}>•</Text>
                                <Text style={styles.methodologyText}>Análisis de irradiación solar regional</Text>
                            </View>
                            <View style={styles.methodologyItem}>
                                <Text style={styles.bullet}>•</Text>
                                <Text style={styles.methodologyText}>Factores de orientación e inclinación</Text>
                            </View>
                        </View>
                    </View>

                    <View>
                        <Text style={styles.subSectionTitle}>Parámetros de Cálculo</Text>

                        <View style={styles.costList}>
                            <View style={styles.parameterItem}>
                                <Text style={styles.parameterLabel}>Precio electricidad:</Text>
                                <Text style={styles.parameterValue}>
                                    {currencyCode === 'COP' ? '986 COP/kWh' : '0,20 €/kWh'}
                                </Text>
                            </View>
                            <View style={styles.parameterItem}>
                                <Text style={styles.parameterLabel}>Escalado anual:</Text>
                                <Text style={styles.parameterValue}>2,2%</Text>
                            </View>
                            <View style={styles.parameterItem}>
                                <Text style={styles.parameterLabel}>Vida útil:</Text>
                                <Text style={styles.parameterValue}>20 años</Text>
                            </View>
                            <View style={styles.parameterItem}>
                                <Text style={styles.parameterLabel}>Degradación anual:</Text>
                                <Text style={styles.parameterValue}>0,5%</Text>
                            </View>
                            <View style={styles.parameterItem}>
                                <Text style={styles.parameterLabel}>Eficiencia DC/AC:</Text>
                                <Text style={styles.parameterValue}>85%</Text>
                            </View>
                            {currencyCode !== 'COP' && (
                                <View style={styles.parameterItem}>
                                    <Text style={styles.parameterLabel}>Bonificación IRPF:</Text>
                                    <Text style={styles.parameterValue}>30%</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                {/* Benefits */}
                <View style={[styles.section, { marginTop: 50 }]}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIcon}>
                            <Image src={getPngIconUrl('leaf')} style={{ width: 20, height: 20 }} />
                        </View>
                        <Text style={styles.sectionTitle}>Beneficios de tu Instalación Solar</Text>
                    </View>

                    <View style={styles.benefitItem}>
                        <Image src={getPngIconUrl('tree')} style={styles.benefitIcon} />
                        <Text style={styles.benefitTitle}>Impacto Ambiental</Text>
                        <Text style={styles.benefitText}>
                            Evitarás la emisión de aproximadamente {yearlyEnergyDcKwh ? `${(yearlyEnergyDcKwh * 0.0005).toFixed(1)} toneladas` : '7,2 toneladas'} de CO₂ al año
                        </Text>
                    </View>

                    <View style={styles.benefitItem}>
                        <Image src={getPngIconUrl('home')} style={styles.benefitIcon} />
                        <Text style={styles.benefitTitle}>Valor de la Vivienda</Text>
                        <Text style={styles.benefitText}>
                            Tu propiedad aumentará su valor de mercado entre un 3-4%
                        </Text>
                    </View>

                    <View style={styles.benefitItem}>
                        <Image src={getPngIconUrl('coins')} style={styles.benefitIcon} />
                        <Text style={styles.benefitTitle}>Estabilidad Energética</Text>
                        <Text style={styles.benefitText}>
                            Protección contra futuras subidas del precio de la electricidad
                        </Text>
                    </View>
                </View>
            </Page>
        </Document>
    );
};

export default SubmissionPDF;