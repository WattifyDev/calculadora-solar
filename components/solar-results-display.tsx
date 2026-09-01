import type { SolarResults } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Sun, Battery, DollarSign, Calendar } from "lucide-react"

interface SolarResultsDisplayProps {
  results: SolarResults
}

export default function SolarResultsDisplay({ results }: SolarResultsDisplayProps) {
  const { solarPotential, installationCost, roofArea, annualSavings, paybackPeriod, environmentalImpact } = results

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl">Potencial Solar</CardTitle>
          <CardDescription>Producción de energía anual estimada</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Sun className="mr-2 h-5 w-5 text-yellow-500" />
              <span className="text-3xl font-bold">{solarPotential.annualProduction}</span>
              <span className="ml-1 text-gray-500">kWh/año</span>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Promedio Diario</div>
              <div className="font-medium">{solarPotential.dailyAverage} kWh</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-sm">
              <span>Eficiencia Solar</span>
              <span className="font-medium">{solarPotential.efficiency}%</span>
            </div>
            <Progress value={solarPotential.efficiency} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl">Detalles de Instalación</CardTitle>
          <CardDescription>Costos estimados y especificaciones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <div className="text-sm text-gray-500">Costo de Instalación</div>
              <div className="flex items-center">
                <DollarSign className="mr-1 h-4 w-4 text-green-600" />
                <span className="text-xl font-bold">{installationCost.total}</span>
              </div>
              <div className="text-xs text-gray-500">{installationCost.perWatt} por vatio</div>
            </div>

            <div className="space-y-1">
              <div className="text-sm text-gray-500">Tamaño del Sistema</div>
              <div className="flex items-center">
                <Battery className="mr-1 h-4 w-4 text-blue-600" />
                <span className="text-xl font-bold">{installationCost.systemSize} kW</span>
              </div>
              <div className="text-xs text-gray-500">{installationCost.panelCount} paneles</div>
            </div>

            <div className="space-y-1">
              <div className="text-sm text-gray-500">Área del Techo</div>
              <div className="text-xl font-bold">{roofArea.suitable} m²</div>
              <div className="text-xs text-gray-500">{roofArea.percentage}% del área total del techo</div>
            </div>

            <div className="space-y-1">
              <div className="text-sm text-gray-500">Período de Amortización</div>
              <div className="flex items-center">
                <Calendar className="mr-1 h-4 w-4 text-purple-600" />
                <span className="text-xl font-bold">{paybackPeriod.years} años</span>
              </div>
              <div className="text-xs text-gray-500">ROI: {paybackPeriod.roi}%</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Beneficios Financieros</CardTitle>
          <CardDescription>Ahorros estimados a lo largo del tiempo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between">
              <div>
                <div className="text-sm text-gray-500">Ahorro Anual</div>
                <div className="text-xl font-bold text-green-600">{annualSavings.firstYear}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Ahorro a 25 Años</div>
                <div className="text-xl font-bold text-green-600">{annualSavings.lifetime}</div>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Impacto Ambiental</div>
              <div className="text-base">
                Equivalente a plantar {environmentalImpact.treesPlanted} árboles o reducir{" "}
                {environmentalImpact.co2Reduction} toneladas de CO₂ anualmente
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
