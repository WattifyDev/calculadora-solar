import { Suspense } from "react"
import { getAllUsers } from "@/lib/data"
import { getUser } from "@/lib/user"
import { redirect } from "next/navigation"
import UsersTable from "@/components/users-table"

interface UsersPageProps {
    searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const PAGE_SIZE = 20

export default async function UsersPage({ searchParams }: UsersPageProps) {
    const user = await getUser()

    // Check if user is authenticated and is admin
    if (!user) {
        redirect("/login")
    }

    if (user.role !== "ADMIN") {
        redirect("/dashboard")
    }

    const params = searchParams ? await searchParams : {};
    const page = Number(
        typeof params.page === 'string' ? params.page : Array.isArray(params.page) ? params.page[0] : undefined
    ) || 1

    const { users, total } = await getAllUsers({ page, pageSize: PAGE_SIZE })
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tighter">Usuarios</h1>
                <p className="text-gray-500 mt-2">Gestiona todos los usuarios del sistema.</p>
            </div>

            <Suspense fallback={<div>Cargando usuarios...</div>}>
                <UsersTable
                    users={users}
                    currentPage={page}
                    totalPages={totalPages}
                />
            </Suspense>
        </div>
    )
}
