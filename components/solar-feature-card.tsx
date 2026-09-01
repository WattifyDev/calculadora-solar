import type { LucideIcon } from "lucide-react"
import { Sun, Leaf, Home, BatteryCharging, PiggyBank, Wrench } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

type IconName = "sun" | "leaf" | "home" | "battery-charging" | "piggy-bank" | "wrench"

interface SolarFeatureCardProps {
  icon: IconName
  title: string
  description: string
}

const iconMap: Record<IconName, LucideIcon> = {
  sun: Sun,
  leaf: Leaf,
  home: Home,
  "battery-charging": BatteryCharging,
  "piggy-bank": PiggyBank,
  wrench: Wrench,
}

export function SolarFeatureCard({ icon, title, description }: SolarFeatureCardProps) {
  const Icon = iconMap[icon]

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="rounded-full bg-green-100 p-3">
            <Icon className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-xl font-bold">{title}</h3>
          <p className="text-gray-500">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}
