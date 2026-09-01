import { Users, Send, TrendingUp, CalendarDays, Package, Link as LinkIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import Link from "next/link"
import { getDashboardStats } from "@/lib/actions/dashboard"
import { formatDistanceToNow } from "date-fns"

export default async function DashboardPage() {
  const { totalSubmissions, todaySubmissions, monthSubmissions, recentSubmissions } = await getDashboardStats()

  const stats = [
    {
      title: "Total de Envíos",
      value: totalSubmissions.toString(),
      icon: Send,
      href: "/dashboard/submissions",
    },
    {
      title: "Envíos Hoy",
      value: todaySubmissions.toString(),
      icon: TrendingUp,
      href: "/dashboard/submissions",
    },
    {
      title: "Envíos Este Mes",
      value: monthSubmissions.toString(),
      icon: CalendarDays,
      href: "/dashboard/submissions",
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tighter">Panel de Control</h1>
        <p className="text-gray-500 mt-2">Bienvenido al panel de administración de Wattify.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {stats.map((stat, i) => (
          <Link href={stat.href} key={i} className="block">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-5 w-5 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>Los últimos envíos y actualizaciones</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSubmissions.map((submission) => (
                <div key={submission.id} className="flex items-center gap-4 border-b pb-4 last:border-0">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Nuevo envío de dirección</p>
                    <p className="text-xs text-gray-500">{submission.address}</p>
                  </div>
                  <div className="text-xs text-gray-500">
                    hace {formatDistanceToNow(submission.createdAt)}
                  </div>
                </div>
              ))}
              {recentSubmissions.length === 0 && (
                <p className="text-sm text-gray-500">No hay envíos recientes</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
            <CardDescription>Accede a funciones comunes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <Link href="/dashboard/submissions">
                <div className="flex items-center gap-3 rounded-lg border p-4 hover:bg-gray-50 transition-colors">
                  <Send className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">Envíos</p>
                    <p className="text-xs text-gray-500">Gestionar todos los envíos de la calculadora</p>
                  </div>
                </div>
              </Link>
              <Link href="/dashboard/materials">
                <div className="flex items-center gap-3 rounded-lg border p-4 hover:bg-gray-50 transition-colors">
                  <Package className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">Materiales</p>
                    <p className="text-xs text-gray-500">Administrar materiales y precios</p>
                  </div>
                </div>
              </Link>
              <Link href="/dashboard/embed">
                <div className="flex items-center gap-3 rounded-lg border p-4 hover:bg-gray-50 transition-colors">
                  <LinkIcon className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">Integraciones</p>
                    <p className="text-xs text-gray-500">Configurar integraciones y código embed</p>
                  </div>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
