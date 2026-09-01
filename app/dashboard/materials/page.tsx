import { Suspense } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import MaterialsTable from "@/components/materials-table"
import { MaterialForm } from "@/components/material-form"
import { getMaterials } from "@/lib/actions/materials"
import { getUser } from "@/lib/user"
import { redirect } from "next/navigation"

export default async function MaterialsPage() {
  const user = await getUser()
  if (!user) redirect("/login")

  const materials = await getMaterials()
  const isAdmin = user.role === "ADMIN"

  return (
    <div className="p-6 space-y-8 md:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tighter">Materiales</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Gestiona los materiales de paneles solares, precios y márgenes.
        </p>
      </div>

      <Tabs defaultValue="list" className="space-y-6">
        <TabsList>
          <TabsTrigger value="list">Lista de Materiales</TabsTrigger>
          {isAdmin && <TabsTrigger value="create">Nuevo Material</TabsTrigger>}
        </TabsList>

        <TabsContent value="list" className="space-y-6">

          <Suspense fallback={<div>Cargando materiales...</div>}>
            <MaterialsTable initialMaterials={materials} userRole={user.role} />
          </Suspense>

        </TabsContent>

        {isAdmin && (
          <TabsContent value="create">

            <MaterialForm />

          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
