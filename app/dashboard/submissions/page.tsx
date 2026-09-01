import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getUserSubmissions } from "@/lib/data"
import { getUser } from "@/lib/user"
import SubmissionsTable from "@/components/submissions-table"
import ExportSubmissionsButton from "@/components/export-submissions-button"
import { redirect } from "next/navigation"

interface SubmissionsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const PAGE_SIZE = 20

export default async function SubmissionsPage({ searchParams }: SubmissionsPageProps) {
  const params = searchParams ? await searchParams : {};
  const page = Number(
    typeof params.page === 'string' ? params.page : Array.isArray(params.page) ? params.page[0] : undefined
  ) || 1

  const [data, user] = await Promise.all([
    getUserSubmissions({ page, pageSize: PAGE_SIZE }),
    getUser()
  ])

  if (!user) return null;

  const { submissions, total } = data
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const title = user.role === 'ADMIN' ? 'Todos los Envíos' : `Envíos de ${user.domain || 'su dominio'}`
  const description = user.role === 'ADMIN'
    ? 'Lista completa de direcciones enviadas para cálculo solar'
    : `Lista de direcciones enviadas desde ${user.domain || 'su dominio'}`

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter">Envíos</h1>
          <p className="text-gray-500 mt-2">Gestiona los envíos de direcciones y sus resultados.</p>
        </div>
        <ExportSubmissionsButton submissions={submissions} />
      </div>


      <Suspense fallback={<div>Cargando envíos...</div>}>
        <SubmissionsTable
          submissions={submissions}
          currentPage={page}
          totalPages={totalPages}
          pageSize={PAGE_SIZE}
          total={total}
        />
      </Suspense>

    </div>
  )
}
