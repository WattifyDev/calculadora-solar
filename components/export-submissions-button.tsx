"use client"

import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import * as XLSX from "xlsx"
import type { SubmissionForTableDisplay } from "@/components/submissions-table"
import { formatCurrency, formatNumber, getPaybackDisplay } from "@/lib/utils"
import { DEFAULT_FINANCIAL_CONSTANTS_ES, DEFAULT_FINANCIAL_CONSTANTS_CO } from "@/lib/solar-financial-calculations"

interface ExportSubmissionsButtonProps {
    submissions: SubmissionForTableDisplay[]
}

function mapSubmissionsForExport(submissions: SubmissionForTableDisplay[]) {
    return submissions.map((s) => {
        // Cost breakdown fields (if present)
        const costBreakdown = s.costBreakdown ?? {};
        const currency = s.currencyCode || 'EUR';

        // Get currency-specific constants based on the submission's currency
        const getCurrencySpecificConstants = (currency: string) => {
            if (currency === 'COP') {
                return {
                    [`Precio medio electricidad (COP/kWh)`]: DEFAULT_FINANCIAL_CONSTANTS_CO.averagePricePerKWh,
                    [`Coste instalación por kWp (COP)`]: DEFAULT_FINANCIAL_CONSTANTS_CO.installationCostPerKw,
                    'Años de vida útil': DEFAULT_FINANCIAL_CONSTANTS_CO.installationLifeSpan,
                };
            } else {
                return {
                    [`Precio medio electricidad (€/kWh)`]: DEFAULT_FINANCIAL_CONSTANTS_ES.averagePricePerKWh,
                    [`Coste instalación por kWp (€)`]: DEFAULT_FINANCIAL_CONSTANTS_ES.installationCostPerKw,
                    'Años de vida útil': DEFAULT_FINANCIAL_CONSTANTS_ES.installationLifeSpan,
                };
            }
        };

        const constants = getCurrencySpecificConstants(currency);

        return {
            "ID de la Solicitud": s.id,
            "Fecha de la Solicitud": s.createdAt ? new Date(s.createdAt).toLocaleDateString('es-ES') : 'N/A',
            "Moneda": currency,
            "Nombre Cliente": s.userName || 'No proporcionado',
            "Email Cliente": s.userEmail || 'No proporcionado',
            "Teléfono Cliente": s.userPhone || 'No proporcionado',
            "Dirección": s.address || 'No proporcionada',
            "Ciudad": s.city || 'No proporcionada',
            // Installation details
            "Consumo Mensual (kWh)": formatNumber(s.averageKwhConsumption ?? s.googleSolarData?.averageKwhConsumption),
            "Factura Mensual Estimada": formatCurrency(s.monthlyElectricityBillAmount ?? s.googleSolarData?.monthlyElectricityBillAmount, currency),
            "Número de Paneles": formatNumber(s.panelCount ?? s.googleSolarData?.panelsCount),
            "Producción Anual Estimada (kWh)": formatNumber(s.googleSolarData?.yearlyEnergyDcKwh),
            "Potencia pico del sistema (kWp)": s.systemSize ? formatNumber(s.systemSize) : 'N/A',
            "Precio por kWp aplicado": formatCurrency(s.priceKWUsed, currency),
            "Precio final de la instalación": formatCurrency(s.totalCost, currency),
            "Panel Seleccionado": s.selectedPanelName || 'N/A',
            "Inversor Seleccionado": s.selectedInverterName ? `${s.selectedInverterName}${s.selectedInverterPeakPower ? ` (${formatNumber(s.selectedInverterPeakPower)} kW)` : ''}` : 'N/A',
            // Cost breakdown
            "Servicios instalación y puesta en marcha (30%)": formatCurrency(costBreakdown.serviciosInstalacionPuestaMarcha, currency),
            "Coste paneles (25%)": formatCurrency(costBreakdown.costePanel, currency),
            "Coste inversor (15%)": formatCurrency(costBreakdown.costeInversor, currency),
            "Puesta en marcha y legalización (15%)": formatCurrency(costBreakdown.puestaMarchaLegalizacion, currency),
            "Garantía y soporte técnico (5%)": formatCurrency(costBreakdown.garantiaSoporteTecnico, currency),
            "Herramienta de monitorización (10%)": formatCurrency(costBreakdown.herramientaMonitorizacion, currency),
            "IVA (21%)": formatCurrency(s.ivaAmount, currency),
            "Coste total con IVA": formatCurrency(s.totalCostWithIva, currency),
            // Financial analysis
            "Coste de Instalación": formatCurrency(s.totalCost, currency),
            "Ahorro Anual Estimado": formatCurrency(s.firstYearSavings, currency),
            "Ahorro Total Estimado (20 años)": formatCurrency(s.lifetimeSavings, currency),
            "Periodo de Amortización": getPaybackDisplay(s.paybackYears, s.firstYearSavings, s.lifetimeSavings),
            // Constants
            ...Object.fromEntries(Object.entries(constants).map(([k, v]) => [k, v])),
            // Google Solar Data
            "Horas Sol/Año": formatNumber(s.googleSolarData?.maxSunshineHoursPerYear),
            "Área Instalación Máx (m²)": formatNumber(s.googleSolarData?.maxArrayAreaMeters2),
            "Nº Máx Paneles (array)": formatNumber(s.googleSolarData?.maxArrayPanelsCount),
            "Nº Paneles (config)": formatNumber(s.googleSolarData?.panelsCount ?? s.panelCount),
            "Producción Anual Estimada (config, kWh)": formatNumber(s.googleSolarData?.yearlyEnergyDcKwh),
            "Consumo Inicial (kWh/mes)": formatNumber(s.googleSolarData?.initialConsumption),
            "Dominio Origen": s.origin || 'N/A',
        };
    });
}

export default function ExportSubmissionsButton({ submissions }: ExportSubmissionsButtonProps) {
    function handleExport() {
        if (!submissions.length) return
        const data = mapSubmissionsForExport(submissions)
        const worksheet = XLSX.utils.json_to_sheet(data)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, "Envíos")
        XLSX.writeFile(workbook, "envios-solares.xlsx")
    }

    return (
        <Button
            className="gap-2 bg-green-600 hover:bg-green-700"
            onClick={handleExport}
            disabled={!submissions.length}
            aria-label="Exportar datos a Excel"
            type="button"
        >
            <Download className="h-4 w-4" />
            Exportar Datos
        </Button>
    )
} 