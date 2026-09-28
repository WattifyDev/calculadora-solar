'use client'

import { useState } from 'react'
import { Battery, Zap, Clock, TrendingDown, CalendarCheck } from 'lucide-react'
import { CalPopupButton } from '@/components/cal-popup-button'

// ─── Constantes por divisa ──────────────────────────────────────────────────
const BATTERY_PRICE_PER_KWH: Record<string, number> = {
  EUR: 600,
  COP: 3_500_000,
  GTQ: 4_500,
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

const NIGHT_CONSUMPTION_FACTOR = 0.4

interface BatteryTabProps {
  baseResults: {
    totalCostWithIva: number | null
    firstYearSavings: number | null
    paybackYears: number | null
    lifetimeSavings: number | null
    averageKwhConsumption: number | null
    currencyCode: string
    calBookingUrl: string
    userName?: string | null
    userEmail?: string | null
    userPhone?: string | null
    submissionId?: string | null
    address?: string | null
  }
}

const CAPACITY_OPTIONS = [5, 10, 15]

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
  const [selected, setSelected] = useState<number | null>(null)

  const {
    totalCostWithIva,
    firstYearSavings,
    averageKwhConsumption,
    currencyCode,
    calBookingUrl,
  } = baseResults

  const currency = currencyCode || 'EUR'
  const symbol = CURRENCY_SYMBOLS[currency] || '€'
  const pricePerKwh = BATTERY_PRICE_PER_KWH[currency] ?? BATTERY_PRICE_PER_KWH.EUR
  const ivaRate = IVA_RATES[currency] ?? 0.21

  function calcBattery(capacityKwh: number) {
    const batteryBase = capacityKwh * pricePerKwh
    const batteryIva = batteryBase * ivaRate
    const batteryCostWithIva = batteryBase + batteryIva
    const newTotalWithIva = (totalCostWithIva ?? 0) + batteryCostWithIva
    const dailyKwh = (averageKwhConsumption ?? 300) / 30
    const nightlyKwh = dailyKwh * NIGHT_CONSUMPTION_FACTOR
    const autonomyHours = nightlyKwh > 0 ? capacityKwh / nightlyKwh : null
    const extraSavingsRate = 0.15
    const newFirstYearSavings = (firstYearSavings ?? 0) * (1 + extraSavingsRate)
    const newPayback = newFirstYearSavings > 0 ? newTotalWithIva / newFirstYearSavings : null
    return { batteryCostWithIva, newTotalWithIva, autonomyHours, newFirstYearSavings, newPayback }
  }

  const calc = selected !== null ? calcBattery(selected) : null

  function buildCalUrl(capacityKwh: number) {
    try {
      const url = new URL(calBookingUrl)
      const existingNotes = url.searchParams.get('notes') ?? ''
      const batteryNote = `Con batería: ${capacityKwh} kWh`
      url.searchParams.set('notes', existingNotes ? `${existingNotes} | ${batteryNote}` : batteryNote)
      return url.toString()
    } catch {
      return calBookingUrl
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 border border-emerald-500/20 p-6 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <Battery className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight">Almacenamiento con Batería</h2>
            <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">Opcional · Sin compromiso</p>
          </div>
        </div>
        <p className="text-slate-300 text-sm leading-relaxed">
          Añade una batería de litio y almacena el excedente solar para consumirlo por la noche.
          Eleva tu autoconsumo hasta un <strong className="text-white">90%</strong> y reduce tu dependencia de la red.
        </p>
      </div>

      {/* Selector de capacidad */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">Selecciona la capacidad de la batería:</p>
        <div className="grid grid-cols-3 gap-3">
          {CAPACITY_OPTIONS.map((kwh) => {
            const isSelected = selected === kwh
            const previewCost = calcBattery(kwh).batteryCostWithIva
            return (
              <button
                key={kwh}
                type="button"
                onClick={() => setSelected(kwh)}
                className={`relative rounded-xl border-2 p-4 text-center transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-100'
                    : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50'
                }`}
              >
                {kwh === 10 && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#CBFF54] text-[#063231] text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide whitespace-nowrap">
                    Popular
                  </span>
                )}
                <Battery className={`w-6 h-6 mx-auto mb-2 ${isSelected ? 'text-emerald-600' : 'text-gray-400'}`} />
                <div className={`text-2xl font-black ${isSelected ? 'text-emerald-700' : 'text-gray-800'}`}>
                  {kwh} kWh
                </div>
                <div className={`text-xs mt-1 font-medium ${isSelected ? 'text-emerald-600' : 'text-gray-500'}`}>
                  +{formatCurrency(previewCost, currency)}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Resultados dinámicos */}
      {calc && selected !== null ? (
        <div className="space-y-4">
          {/* Métricas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Coste batería</span>
              </div>
              <div className="text-xl font-black text-gray-900">{formatCurrency(calc.batteryCostWithIva, currency)}</div>
              <div className="text-xs text-gray-400 mt-0.5">IVA incluido</div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Inversión total</span>
              </div>
              <div className="text-xl font-black text-gray-900">{formatCurrency(calc.newTotalWithIva, currency)}</div>
              <div className="text-xs text-gray-400 mt-0.5">Solar + batería con IVA</div>
            </div>

            {calc.autonomyHours !== null && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Autonomía nocturna</span>
                </div>
                <div className="text-xl font-black text-gray-900">{formatNumber(calc.autonomyHours)} h</div>
                <div className="text-xs text-gray-400 mt-0.5">Estimado por noche</div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <CalendarCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Amortización</span>
              </div>
              <div className="text-xl font-black text-gray-900">
                {calc.newPayback ? `${formatNumber(calc.newPayback, 0)} años` : 'N/A'}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">Con ahorro estimado</div>
            </div>
          </div>

          {/* Comparativa */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3">Comparativa</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">☀️ Solo instalación solar</span>
                <span className="font-semibold text-gray-800">{formatCurrency(totalCostWithIva ?? 0, currency)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-emerald-700 font-medium">🔋 Solar + Batería {selected} kWh</span>
                <span className="font-black text-emerald-700">{formatCurrency(calc.newTotalWithIva, currency)}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                <span className="text-gray-500 text-xs">Diferencia</span>
                <span className="text-amber-600 font-semibold text-xs">+{formatCurrency(calc.batteryCostWithIva, currency)}</span>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-gray-400 leading-relaxed">
            * Estimación orientativa a ~{symbol}{pricePerKwh.toLocaleString('es-ES')}/{currency !== 'EUR' ? 'kWh' : 'kWh'} instalado.
            El precio final depende del modelo y fabricante. Autonomía calculada sobre consumo nocturno estimado del 40% del consumo diario.
          </p>

          {/* CTA */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-6 shadow-2xl border border-emerald-500/30 text-white">
            <div className="absolute top-0 right-0 -mt-6 -mr-6 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#CBFF54] text-[#063231] text-xs font-black tracking-wider uppercase">
                  <span>🔋</span> Presupuesto con Batería
                </div>
                <h3 className="text-xl font-black tracking-tight">Batería de {selected} kWh incluida</h3>
                <p className="text-slate-300 text-sm">
                  Un ingeniero optimizará la solución para tu caso concreto.
                </p>
              </div>
              <div className="shrink-0">
                <CalPopupButton
                  calUrl={buildCalUrl(selected)}
                  label="Solicitar presupuesto con batería"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center">
          <Battery className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Selecciona una capacidad arriba para ver el presupuesto con batería</p>
          <p className="text-gray-400 text-sm mt-1">Sin compromiso · Podrás decidir más adelante</p>
        </div>
      )}
    </div>
  )
}
