import { notFound } from "next/navigation"
import { getSolarResults } from "@/lib/data"
import { User, Home, Wrench, BarChart2, Info, BadgePercent } from "lucide-react"

function formatCurrency(amount: number | null | undefined, currency: string = 'EUR') {
  if (amount === null || typeof amount === 'undefined') return 'N/A';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
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

interface ResultsPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { id } = await params
  const results = await getSolarResults(id);

  if (!results) {
    notFound();
    return null;
  }

  const {
    userName,
    userEmail,
    userPhone,
    address,
    city,
    averageKwhConsumption,
    monthlyElectricityBillAmount,
    panelCount,
    yearlyEnergyDcKwh,
    installationSizeKW,
    priceKWUsed,
    precioFinal,
    selectedPanelName,
    selectedInverterName,
    selectedInverterPeakPower,
    costBreakdown,
    ivaAmount,
    totalCostWithIva,
    totalCost,
    firstYearSavings,
    lifetimeSavings,
    paybackYears,
    currencyCode,
    constants,
    incentiveNote,
    id: submissionId,
    createdAt,
  } = results;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-2 sm:px-0">
      <div className="container mx-auto max-w-5xl space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2">
              <BarChart2 className="w-7 h-7 text-primary" /> Informe de Estimación Solar
            </h1>
            <p className="text-muted-foreground mt-1">
              Detalles para la dirección: <span className="font-semibold text-gray-800">{address}</span>
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            {/* Client Info */}
            <section className="relative bg-white rounded-xl border-l-4 border-primary/70 shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold tracking-tight">Información del Cliente</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-gray-700">
                <div><span className="font-medium">Nombre:</span> {userName || 'No proporcionado'}</div>
                <div><span className="font-medium">Email:</span> {userEmail || 'No proporcionado'}</div>
                <div><span className="font-medium">Teléfono:</span> {userPhone || 'No proporcionado'}</div>
                <div><span className="font-medium">Dirección:</span> {address || 'No proporcionada'}</div>
                <div><span className="font-medium">Ciudad:</span> {city || 'No proporcionada'}</div>
              </div>
            </section>

            {/* Installation Details */}
            <section className="relative bg-white rounded-xl border-l-4 border-blue-400 shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <Home className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-bold tracking-tight">Detalles de la Instalación</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-gray-700">
                <div><span className="font-medium">Consumo Mensual:</span> {formatNumber(averageKwhConsumption)} kWh</div>
                <div><span className="font-medium">Factura Mensual Estimada:</span> {formatCurrency(monthlyElectricityBillAmount, currencyCode)}</div>
                <div><span className="font-medium">Número de Paneles:</span> {formatNumber(panelCount)}</div>
                <div><span className="font-medium">Producción Anual Estimada:</span> {formatNumber(yearlyEnergyDcKwh)} kWh</div>
                <div><span className="font-medium">Potencia pico del sistema:</span> {installationSizeKW ? formatNumber(installationSizeKW) + ' kWp' : 'N/A'}</div>
                <div><span className="font-medium">Precio por kWp aplicado:</span> {formatCurrency(priceKWUsed, currencyCode)}</div>
                <div><span className="font-medium">Precio final de la instalación:</span> {formatCurrency(precioFinal, currencyCode)}</div>
                <div><span className="font-medium">Panel Seleccionado:</span> {selectedPanelName || 'N/A'}</div>
                <div><span className="font-medium">Inversor Seleccionado:</span> {selectedInverterName || 'N/A'}{selectedInverterPeakPower ? ` (${formatNumber(selectedInverterPeakPower)} kW)` : ''}</div>
              </div>
            </section>
          </div>

          <div className="space-y-8">
            {/* Cost Breakdown */}
            <section className="relative bg-white rounded-xl border-l-4 border-amber-400 shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <Wrench className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold tracking-tight">Desglose de Costes</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-gray-700">
                <div><span className="font-medium">Servicios instalación y puesta en marcha (25%):</span> {formatCurrency(costBreakdown?.serviciosInstalacionPuestaMarcha, currencyCode)}</div>
                <div><span className="font-medium">Coste paneles (25%):</span> {formatCurrency(costBreakdown?.costePanel, currencyCode)}</div>
                <div><span className="font-medium">Coste inversor (15%):</span> {formatCurrency(costBreakdown?.costeInversor, currencyCode)}</div>
                <div><span className="font-medium">Puesta en marcha y legalización (15%):</span> {formatCurrency(costBreakdown?.puestaMarchaLegalizacion, currencyCode)}</div>
                <div><span className="font-medium">Garantía y soporte técnico (5%):</span> {formatCurrency(costBreakdown?.garantiaSoporteTecnico, currencyCode)}</div>
                <div><span className="font-medium">Herramienta de monitorización (10%):</span> {formatCurrency(costBreakdown?.herramientaMonitorizacion, currencyCode)}</div>
                {costBreakdown?.bateria ? (
                  <div><span className="font-medium text-emerald-700">Batería de Almacenamiento:</span> {formatCurrency(costBreakdown?.bateria, currencyCode)}</div>
                ) : null}
                <div><span className="font-medium">IVA:</span> {formatCurrency(ivaAmount, currencyCode)}</div>
                <div><span className="font-medium font-bold">Coste total con IVA:</span> {formatCurrency(totalCostWithIva, currencyCode)}</div>
              </div>
            </section>

            {/* Financial Analysis */}
            <section className="relative bg-white rounded-xl border-l-4 border-green-500 shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="w-5 h-5 text-green-500" />
                <h2 className="text-lg font-bold tracking-tight">Análisis Financiero ({currencyCode})</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-gray-700">
                <div><span className="font-medium">Coste de Instalación:</span> {formatCurrency(totalCost, currencyCode)}</div>
                <div><span className="font-medium">Ahorro Anual Estimado:</span> {formatCurrency(firstYearSavings, currencyCode)}</div>
                <div><span className="font-medium">Ahorro Total Estimado (20 años):</span> {formatCurrency(lifetimeSavings, currencyCode)}</div>
                <div><span className="font-medium">Periodo de Amortización:</span> {getPaybackDisplay(paybackYears, firstYearSavings, lifetimeSavings)}</div>
              </div>
            </section>

            {/* Constants */}
            <section className="relative bg-white rounded-xl border-l-4 border-sky-400 shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-5 h-5 text-sky-400" />
                <h2 className="text-lg font-bold tracking-tight">Constantes Financieras Aplicadas</h2>
              </div>
              <ul className="list-disc pl-6 text-gray-700">
                {Object.entries(constants).map(([label, value]) => (
                  <li key={label}><span className="font-medium">{label}:</span> {value !== undefined && value !== null ? String(value) : 'N/A'}</li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        {/* Incentive Note */}
        <section className="relative bg-gradient-to-r from-yellow-100 to-yellow-50 border border-yellow-300 rounded-xl p-6 flex items-start gap-3 shadow-lg">
          <BadgePercent className="w-7 h-7 text-yellow-500 mt-1" />
          <div>
            <span className="font-bold text-yellow-900 text-lg block mb-1">Nota sobre incentivos:</span>
            <span className="text-yellow-900 text-base">{incentiveNote}</span>
          </div>
        </section>

        {/* Footer */}
        <footer className="mx-auto max-w-2xl bg-white rounded-lg shadow border border-gray-200 text-center text-xs text-muted-foreground mt-8 py-4 px-4">
          Se adjunta un informe detallado en PDF para su referencia.<br />
          ID de la Solicitud: {submissionId}<br />
          Fecha de la Solicitud: {createdAt ? new Date(createdAt).toLocaleDateString('es-ES') : 'N/A'}
        </footer>
      </div>
    </div>
  )
}
