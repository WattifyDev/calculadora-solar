"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { GoogleSolarData } from "@/lib/types";
import { Sun, Aperture, PanelTop, Bolt, DollarSign, TrendingUp, Zap } from 'lucide-react';

interface SolarDataCardProps {
  googleSolarData: GoogleSolarData | null | undefined;
  currencyCode?: string | null;
  monthlyElectricityBillAmountFormatted?: string | null;
  averageKwhConsumptionFormatted?: string | null;
  estimatedInstallationCostFormatted?: string | null;
  estimatedAnnualSavingsFormatted?: string | null;
  estimatedLifetimeSavingsFormatted?: string | null;
  paybackYearsFormatted?: string | null;
}

function DataPoint({ icon: Icon, label, value, unit }: { icon: React.ElementType, label: string, value: string | number | undefined | null, unit?: string }) {
  if (value === undefined || value === null || value === "N/A") {
    return null; // Don't render if value is not available
  }
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-b-0">
      <div className="flex items-center">
        <Icon className="mr-3 h-5 w-5 text-muted-foreground" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-sm">
        <span className="font-semibold">{value}</span>
        {unit && <span className="ml-1 text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

export default function SolarDataCard({
  googleSolarData,
  currencyCode,
  monthlyElectricityBillAmountFormatted,
  averageKwhConsumptionFormatted,
  estimatedInstallationCostFormatted,
  estimatedAnnualSavingsFormatted,
  estimatedLifetimeSavingsFormatted,
  paybackYearsFormatted
}: SolarDataCardProps) {
  if (!googleSolarData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Datos Solares (Google)</CardTitle>
          <CardDescription>Información adicional de potencial solar.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No hay datos solares de Google disponibles para este envío.</p>
        </CardContent>
      </Card>
    );
  }

  const {
    maxSunshineHoursPerYear,
    maxArrayAreaMeters2,
    maxArrayPanelsCount,
    panelsCount,
    yearlyEnergyDcKwh
  } = googleSolarData;

  const hasAnyData = [
    maxSunshineHoursPerYear,
    maxArrayAreaMeters2,
    maxArrayPanelsCount,
    panelsCount,
    yearlyEnergyDcKwh
  ].some(value => value !== null && value !== undefined);

  if (!hasAnyData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Datos Solares (Google)</CardTitle>
          <CardDescription>Información adicional de potencial solar.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No se encontraron datos específicos de Google Solar para este envío.</p>
        </CardContent>
      </Card>
    );
  }

  const hasAnySolarPotentialData = [
    maxSunshineHoursPerYear,
    maxArrayAreaMeters2,
    maxArrayPanelsCount,
    panelsCount,
    yearlyEnergyDcKwh
  ].some(value => value !== null && value !== undefined);

  const hasAnyFinancialData = [
    monthlyElectricityBillAmountFormatted,
    averageKwhConsumptionFormatted,
    estimatedInstallationCostFormatted,
    estimatedAnnualSavingsFormatted,
    estimatedLifetimeSavingsFormatted,
    paybackYearsFormatted
  ].some(value => value !== null && value !== undefined && value !== "N/A");

  if (!hasAnySolarPotentialData && !hasAnyFinancialData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Datos Solares y Financieros (Google)</CardTitle>
          <CardDescription>Información adicional de potencial solar y estimaciones financieras.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No se encontraron datos específicos de Google Solar ni estimaciones financieras para este envío.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos Solares y Financieros (Google)</CardTitle>
        <CardDescription>
          Información detallada del potencial solar y estimaciones financieras según Google Solar API.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasAnySolarPotentialData && (
          <>
            <h4 className="text-md font-semibold mt-4 mb-2">Potencial Solar</h4>
            <DataPoint
              icon={Sun}
              label="Horas de sol/año"
              value={maxSunshineHoursPerYear ? Math.round(maxSunshineHoursPerYear) : "N/A"}
            />
            <DataPoint
              icon={Aperture}
              label="Área de instalación (máx.)"
              value={maxArrayAreaMeters2 ? maxArrayAreaMeters2.toFixed(0) : "N/A"}
              unit="m²"
            />
            <DataPoint
              icon={PanelTop}
              label="Nº máximo de paneles (array)"
              value={maxArrayPanelsCount ?? "N/A"}
            />
            <DataPoint
              icon={PanelTop}
              label="Nº de paneles (config.)"
              value={panelsCount ? `${panelsCount} / ${maxArrayPanelsCount || '?'}` : "N/A"}
            />
            <DataPoint
              icon={Bolt}
              label="Energía anual estimada (config.)"
              value={yearlyEnergyDcKwh ? yearlyEnergyDcKwh.toFixed(0) : "N/A"}
              unit="kWh"
            />
          </>
        )}

        {hasAnyFinancialData && (
          <>
            <h4 className="text-md font-semibold mt-6 mb-2">Estimaciones Financieras ({currencyCode || ''})</h4>
            <DataPoint
              icon={DollarSign}
              label="Factura mensual estimada"
              value={monthlyElectricityBillAmountFormatted}
            />
            <DataPoint
              icon={Zap}
              label="Consumo medio estimado"
              value={averageKwhConsumptionFormatted}
            />
            <DataPoint
              icon={DollarSign}
              label="Coste de instalación estimado"
              value={estimatedInstallationCostFormatted}
            />
            <DataPoint
              icon={TrendingUp}
              label="Ahorro anual estimado"
              value={estimatedAnnualSavingsFormatted}
            />
            <DataPoint
              icon={TrendingUp}
              label="Ahorro total estimado (20 años)"
              value={estimatedLifetimeSavingsFormatted}
            />
            <DataPoint
              icon={TrendingUp}
              label="Periodo de amortización"
              value={paybackYearsFormatted}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
} 