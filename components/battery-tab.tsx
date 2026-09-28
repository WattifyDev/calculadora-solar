'use client'

import { useState } from 'react'
import {
  Battery,
  Zap,
  Clock,
  TrendingDown,
  ShieldCheck,
  CheckCircle2,
  FileText,
  HelpCircle,
  Car,
  Wind,
  Moon,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import { CalPopupButton } from '@/components/cal-popup-button'

// ─── Precios y tipos de cambio de referencia ─────────────────────────────────
const BATTERY_PRICE_PER_KWH: Record<string, number> = {
  EUR: 580,
  COP: 3_400_000,
  GTQ: 4_400,
}

const IVA_RATES: Record<string, number> = {
  EUR: 0.21,
  COP: 0.19,
  GTQ: 0.12,
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€',
  COP: '$',
  GTQ: 'Q',
}

export interface BatteryModelOption {
  brand: 'SOLAX' | 'SAJ'
  capacityKwh: number
  modelName: string
  modulesDesc: string
  voltageType: string
  cycles: string
  warrantyYears: number
  basePriceEUR: number
  datasheetUrl?: string
  features: string[]
}

// Catálogo homologado de baterías propietarias SolaX y SAJ
const BATTERY_CATALOG: BatteryModelOption[] = [
  // --- SOLAX (Triple Power T-BAT H Series) ---
  {
    brand: 'SOLAX',
    capacityKwh: 5.8,
    modelName: 'SolaX Triple Power T-BAT H 5.8',
    modulesDesc: '1 Módulo Master (5.8 kWh)',
    voltageType: 'Alta Tensión (High Voltage)',
    cycles: '>6.000 ciclos (90% DoD)',
    warrantyYears: 10,
    basePriceEUR: 2850,
    datasheetUrl: 'https://www.solaxpower.com/uploads/file/triple-power-5-8-datasheet-en.pdf',
    features: ['Química segura LiFePO4', 'Monitorización por App SolaX Cloud', 'Protección IP65 exterior'],
  },
  {
    brand: 'SOLAX',
    capacityKwh: 11.5,
    modelName: 'SolaX Triple Power T-BAT H 11.5',
    modulesDesc: '1 Master + 1 Slave (11.5 kWh)',
    voltageType: 'Alta Tensión (High Voltage)',
    cycles: '>6.000 ciclos (90% DoD)',
    warrantyYears: 10,
    basePriceEUR: 4890,
    datasheetUrl: 'https://www.solaxpower.com/uploads/file/triple-power-5-8-datasheet-en.pdf',
    features: ['Capacidad ideal para hogares con climatización', 'Función Back-up anti-apagones EPS', 'Plug & Play'],
  },
  {
    brand: 'SOLAX',
    capacityKwh: 17.3,
    modelName: 'SolaX Triple Power T-BAT H 17.3',
    modulesDesc: '1 Master + 2 Slaves (17.3 kWh)',
    voltageType: 'Alta Tensión (High Voltage)',
    cycles: '>6.000 ciclos (90% DoD)',
    warrantyYears: 10,
    basePriceEUR: 6950,
    datasheetUrl: 'https://www.solaxpower.com/uploads/file/triple-power-5-8-datasheet-en.pdf',
    features: ['Máxima autonomía residencial / VE', 'Carga ultra rápida 1C', 'Escalabilidad modular'],
  },

  // --- SAJ (eStorage B2 Series) ---
  {
    brand: 'SAJ',
    capacityKwh: 5.1,
    modelName: 'SAJ B2-5.1-HV1 Series',
    modulesDesc: 'Base de control + 1 Módulo B2',
    voltageType: 'Alta Tensión HV LiFePO4',
    cycles: '>6.000 ciclos (90% DoD)',
    warrantyYears: 10,
    basePriceEUR: 2650,
    datasheetUrl: 'https://www.saj-electric.com/storage-battery-b2/',
    features: ['Diseño compacto y elegante', 'Comunicación nativa CAN con inversor SAJ H2', 'Cero mantenimiento'],
  },
  {
    brand: 'SAJ',
    capacityKwh: 10.2,
    modelName: 'SAJ B2-10.2-HV1 Series',
    modulesDesc: 'Base de control + 2 Módulos B2',
    voltageType: 'Alta Tensión HV LiFePO4',
    cycles: '>6.000 ciclos (90% DoD)',
    warrantyYears: 10,
    basePriceEUR: 4550,
    datasheetUrl: 'https://www.saj-electric.com/storage-battery-b2/',
    features: ['Recomendado para autoconsumo nocturno del 90%', 'App eSolar SEC / eSolar Portal', 'Protección contra sobrecargas'],
  },
  {
    brand: 'SAJ',
    capacityKwh: 15.3,
    modelName: 'SAJ B2-15.3-HV1 Series',
    modulesDesc: 'Base de control + 3 Módulos B2',
    voltageType: 'Alta Tensión HV LiFePO4',
    cycles: '>6.000 ciclos (90% DoD)',
    warrantyYears: 10,
    basePriceEUR: 6450,
    datasheetUrl: 'https://www.saj-electric.com/storage-battery-b2/',
    features: ['Autonomía extendida y vehículos eléctricos', 'Gestión inteligente BMS multinivel', 'IP65 resistente a intemperie'],
  },
]

interface BatteryTabProps {
  baseResults: {
    totalCostWithIva: number | null
    firstYearSavings: number | null
    paybackYears: number | null
    lifetimeSavings: number | null
    averageKwhConsumption: number | null
    currencyCode: string
    calBookingUrl: string
    selectedInverterName?: string | null
    userName?: string | null
    userEmail?: string | null
    userPhone?: string | null
    submissionId?: string | null
    address?: string | null
  }
}

function formatCurrency(amount: number, currency: string) {
  const locale = currency === 'COP' ? 'es-CO' : currency === 'GTQ' ? 'es-GT' : 'es-ES'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatNumber(n: number, decimals = 1) {
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: decimals }).format(n)
}

export function BatteryTab({ baseResults }: BatteryTabProps) {
  const {
    totalCostWithIva,
    firstYearSavings,
    averageKwhConsumption,
    currencyCode,
    calBookingUrl,
    selectedInverterName,
  } = baseResults

  const currency = currencyCode || 'EUR'
  const ivaRate = IVA_RATES[currency] ?? 0.21

  // Detección automática de marca emparejada con el inversor
  const inverterStr = (selectedInverterName || '').toLowerCase()
  const isSajInverter = inverterStr.includes('saj')
  const defaultBrand: 'SOLAX' | 'SAJ' = isSajInverter ? 'SAJ' : 'SOLAX'

  const [activeBrand, setActiveBrand] = useState<'SOLAX' | 'SAJ'>(defaultBrand)
  const [selectedBattery, setSelectedBattery] = useState<BatteryModelOption | null>(null)

  // Estados del asistente guiado de dimensionado
  const [showWizard, setShowWizard] = useState(false)
  const [hasEV, setHasEV] = useState(false)
  const [hasAerothermal, setHasAerothermal] = useState(false)
  const [highNightConsumption, setHighNightConsumption] = useState(false)

  // Filtrar baterías según la marca seleccionada
  const availableBatteries = BATTERY_CATALOG.filter((b) => b.brand === activeBrand)

  // Cálculo de recomendación asistida
  function getRecommendedCapacity(): number {
    let score = 0
    if (hasEV) score += 2
    if (hasAerothermal) score += 2
    if (highNightConsumption) score += 1
    const dailyKwh = (averageKwhConsumption ?? 350) / 30
    if (dailyKwh > 20) score += 1

    if (score <= 1) return activeBrand === 'SOLAX' ? 5.8 : 5.1
    if (score <= 3) return activeBrand === 'SOLAX' ? 11.5 : 10.2
    return activeBrand === 'SOLAX' ? 17.3 : 15.3
  }

  function handleApplyWizard() {
    const recommendedCap = getRecommendedCapacity()
    const match = availableBatteries.find((b) => b.capacityKwh === recommendedCap) || availableBatteries[0]
    setSelectedBattery(match)
    setShowWizard(false)
  }

  // Cálculos dinámicos con la batería seleccionada
  function calculateMetrics(battery: BatteryModelOption) {
    let baseCost = battery.basePriceEUR
    if (currency === 'COP') baseCost = battery.capacityKwh * BATTERY_PRICE_PER_KWH.COP
    else if (currency === 'GTQ') baseCost = battery.capacityKwh * BATTERY_PRICE_PER_KWH.GTQ

    const batteryIva = baseCost * ivaRate
    const batteryCostWithIva = baseCost + batteryIva
    const newTotalWithIva = (totalCostWithIva ?? 0) + batteryCostWithIva

    const dailyKwh = (averageKwhConsumption ?? 350) / 30
    const nightlyKwh = dailyKwh * 0.45 // ~45% del consumo suele ser nocturno/tarde
    const autonomyHours = nightlyKwh > 0 ? (battery.capacityKwh / nightlyKwh) * 8 : null

    // Ahorro adicional por autoconsumo nocturno (~20-25% más de ahorro en factura)
    const extraSavingsFactor = 0.22
    const newFirstYearSavings = (firstYearSavings ?? 0) * (1 + extraSavingsFactor)
    const newPayback = newFirstYearSavings > 0 ? newTotalWithIva / newFirstYearSavings : null

    return {
      batteryCostWithIva,
      newTotalWithIva,
      autonomyHours: autonomyHours ? Math.min(14, autonomyHours) : null,
      newFirstYearSavings,
      newPayback,
    }
  }

  const metrics = selectedBattery ? calculateMetrics(selectedBattery) : null

  function buildCalUrl(battery: BatteryModelOption) {
    try {
      const url = new URL(calBookingUrl)
      const existingNotes = url.searchParams.get('notes') ?? ''
      const brandInverterNote = `Inversor: ${selectedInverterName || activeBrand} | Batería Propietaria: ${battery.modelName} (${battery.capacityKwh} kWh)`
      url.searchParams.set('notes', existingNotes ? `${existingNotes} | ${brandInverterNote}` : brandInverterNote)
      return url.toString()
    } catch {
      return calBookingUrl
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabecera Tecnológica */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 border border-emerald-500/20 p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
              <Battery className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight">Almacenamiento Inteligente</h2>
                <span className="bg-[#CBFF54] text-[#063231] text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Baterías Propietarias
                </span>
              </div>
              <p className="text-slate-300 text-xs mt-0.5">
                Ecosistemas homologados 100% compatibles con inversor{' '}
                <strong className="text-white">{selectedInverterName || `${activeBrand} Híbrido`}</strong>
              </p>
            </div>
          </div>

          {/* Toggle de Marca Propietaria */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/80 shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveBrand('SOLAX')
                setSelectedBattery(null)
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                activeBrand === 'SOLAX'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              SolaX Power
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveBrand('SAJ')
                setSelectedBattery(null)
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                activeBrand === 'SAJ'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              SAJ Electric
            </button>
          </div>
        </div>

        <p className="text-slate-300 text-sm mt-4 leading-relaxed max-w-3xl">
          Almacena los excedentes de energía generados durante el día para utilizarlos durante la noche o ante cortes de luz. 
          Garantizamos máxima eficiencia mediante comunicación nativa CAN/BMS entre inversor y batería de la misma marca.
        </p>
      </div>

      {/* Asistente Guiado (Colapsable) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-800">¿No sabes qué capacidad necesitas?</h3>
          </div>
          <button
            type="button"
            onClick={() => setShowWizard(!showWizard)}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            {showWizard ? 'Ocultar asistente' : 'Calcular mi capacidad ideal'}
            <ArrowRight className={`w-3.5 h-3.5 transition-transform ${showWizard ? 'rotate-90' : ''}`} />
          </button>
        </div>

        {showWizard && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            <p className="text-xs text-slate-500">Selecciona los hábitos de tu vivienda para sugerirte el tamaño óptimo:</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <label
                className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  hasEV ? 'border-emerald-500 bg-emerald-50/60 font-semibold text-emerald-950' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={hasEV}
                  onChange={(e) => setHasEV(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <Car className="w-4 h-4 text-slate-600 shrink-0" />
                <span>Tengo o tendré Coche Eléctrico (VE)</span>
              </label>

              <label
                className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  hasAerothermal ? 'border-emerald-500 bg-emerald-50/60 font-semibold text-emerald-950' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={hasAerothermal}
                  onChange={(e) => setHasAerothermal(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <Wind className="w-4 h-4 text-slate-600 shrink-0" />
                <span>Aerotermia o Clima Nocturno</span>
              </label>

              <label
                className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  highNightConsumption ? 'border-emerald-500 bg-emerald-50/60 font-semibold text-emerald-950' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={highNightConsumption}
                  onChange={(e) => setHighNightConsumption(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <Moon className="w-4 h-4 text-slate-600 shrink-0" />
                <span>Alto consumo tarde/noche (&gt;19:00h)</span>
              </label>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleApplyWizard}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <span>Aplicar recomendación ({getRecommendedCapacity()} kWh)</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Catálogo de Modelos Propietarios */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-slate-800">
            Modelos Disponibles: <span className="text-emerald-600">{activeBrand === 'SOLAX' ? 'SolaX Triple Power' : 'SAJ eStorage B2'}</span>
          </p>
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> 10 Años de Garantía Oficial
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {availableBatteries.map((battery) => {
            const isSelected = selectedBattery?.capacityKwh === battery.capacityKwh && selectedBattery?.brand === battery.brand
            const batteryMetrics = calculateMetrics(battery)

            return (
              <div
                key={`${battery.brand}-${battery.capacityKwh}`}
                onClick={() => setSelectedBattery(battery)}
                className={`relative rounded-2xl border-2 p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/40 shadow-lg shadow-emerald-500/10'
                    : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md'
                }`}
              >
                {battery.capacityKwh >= 10 && battery.capacityKwh <= 12 && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#CBFF54] text-[#063231] text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wide whitespace-nowrap shadow-sm">
                    Recomendado Residencial
                  </span>
                )}

                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="text-2xl font-black text-slate-900 tracking-tight">{battery.capacityKwh} kWh</div>
                      <div className="text-xs font-bold text-emerald-700 mt-0.5">{battery.modelName}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{battery.modulesDesc}</div>
                    </div>
                    <div className={`p-2 rounded-xl ${isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <Battery className="w-6 h-6" />
                    </div>
                  </div>

                  <ul className="space-y-1.5 my-3 pt-3 border-t border-slate-100">
                    {battery.features.map((f, i) => (
                      <li key={i} className="text-[11px] text-slate-600 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 border-t border-slate-100 mt-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-500 font-medium">Inversión Batería:</span>
                    <span className="text-base font-black text-slate-900">
                      +{formatCurrency(batteryMetrics.batteryCostWithIva, currency)}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 text-right mt-0.5">IVA e instalación incluidos</div>

                  {battery.datasheetUrl && (
                    <a
                      href={battery.datasheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="mt-3 inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold hover:underline"
                    >
                      <FileText className="w-3 h-3" />
                      <span>Ficha Técnica Oficial (PDF)</span>
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Panel de Resultados y Simulación Dinámica */}
      {selectedBattery && metrics ? (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Métricas clave */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-1.5 mb-1 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Coste Batería</span>
              </div>
              <div className="text-xl font-black text-slate-900">{formatCurrency(metrics.batteryCostWithIva, currency)}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">IVA e integración incluidos</div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-1.5 mb-1 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <TrendingDown className="w-4 h-4 text-blue-500" />
                <span>Presupuesto Total</span>
              </div>
              <div className="text-xl font-black text-slate-900">{formatCurrency(metrics.newTotalWithIva, currency)}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Solar + Batería con IVA</div>
            </div>

            {metrics.autonomyHours !== null && (
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center gap-1.5 mb-1 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <Clock className="w-4 h-4 text-purple-500" />
                  <span>Autonomía Noche</span>
                </div>
                <div className="text-xl font-black text-slate-900">~{formatNumber(metrics.autonomyHours, 0)} Horas</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Cobertura estimada sin red</div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-1.5 mb-1 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Amortización</span>
              </div>
              <div className="text-xl font-black text-slate-900">
                {metrics.newPayback ? `${formatNumber(metrics.newPayback, 0)} años` : 'N/A'}
              </div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">Autoconsumo elevado al ~90%</div>
            </div>
          </div>

          {/* Comparativa Detallada */}
          <div className="rounded-2xl bg-slate-100/80 border border-slate-200 p-5">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3">
              Comparativa de Propuesta: Solo Fotovoltaica vs Solar + Almacenamiento
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="text-xs font-bold text-slate-500 mb-1">☀️ Solo Instalación Solar</div>
                <div className="text-lg font-black text-slate-800">{formatCurrency(totalCostWithIva ?? 0, currency)}</div>
                <div className="text-xs text-slate-500 mt-2 space-y-1">
                  <div>• Autoconsumo medio: ~40% - 45%</div>
                  <div>• Excedentes vertidos a la red</div>
                  <div>• Sin protección ante apagones</div>
                </div>
              </div>

              <div className="bg-emerald-50/70 p-4 rounded-xl border-2 border-emerald-500">
                <div className="text-xs font-bold text-emerald-800 mb-1">
                  🔋 Solar + Batería {selectedBattery.modelName} ({selectedBattery.capacityKwh} kWh)
                </div>
                <div className="text-lg font-black text-emerald-900">{formatCurrency(metrics.newTotalWithIva, currency)}</div>
                <div className="text-xs text-emerald-800 mt-2 space-y-1 font-medium">
                  <div>• Autoconsumo optimizado: ~85% - 90%</div>
                  <div>• Ahorro extra anual: +{formatCurrency(metrics.newFirstYearSavings - (firstYearSavings ?? 0), currency)}/año</div>
                  <div>• Sistema preparado para Back-up EPS</div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA de Agendamiento / Contacto con Batería */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-6 sm:p-7 shadow-2xl border border-emerald-500/30 text-white">
            <div className="absolute top-0 right-0 -mt-6 -mr-6 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-5">
              <div className="space-y-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#CBFF54] text-[#063231] text-xs font-black tracking-wider uppercase">
                  <span>🔋</span> Propuesta Solar + {selectedBattery.modelName}
                </div>
                <h3 className="text-xl font-black tracking-tight">
                  Revisar configuración de {selectedBattery.capacityKwh} kWh con un Ingeniero
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
                  Validaremos el espacio de instalación para la batería, comprobaremos la sección de cableado y te facilitaremos la memoria técnica.
                </p>
              </div>
              <div className="shrink-0 w-full md:w-auto">
                <CalPopupButton
                  calUrl={buildCalUrl(selectedBattery)}
                  label="Agendar videollamada con batería"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
          <Battery className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-700 font-bold text-base">Selecciona un modelo de batería arriba para simular tu ahorro y autonomía</p>
          <p className="text-slate-400 text-xs mt-1">
            Garantizamos compatibilidad 100% nativa con inversores {activeBrand === 'SOLAX' ? 'SolaX' : 'SAJ'}
          </p>
        </div>
      )}
    </div>
  )
}
