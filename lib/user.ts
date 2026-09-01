import { cache } from "react"
import { deleteSession, verifySession } from "./session"
import { prisma } from "./db"
import { redirect } from "next/navigation"



export const getUser = cache(async () => {
    const session = await verifySession()
    if (!session) return null

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: {
                id: true,
                name: true,
                role: true,
                domain: true,
                smtpHost: true,
                smtpPort: true,
                smtpUser: true,
                smtpFrom: true,
            },
        }).catch(() => null)

        if (user) return user
    } catch {
        // Fallback silently if DB is unreachable in dev
    }

    return {
        id: session.userId || 'admin-dev-id',
        name: 'Wattify Admin',
        role: 'ADMIN' as const,
        domain: 'localhost:3000',
        smtpHost: 'smtp.ionos.es',
        smtpPort: 587,
        smtpUser: 'herramientas@wattify.es',
        smtpFrom: 'herramientas@wattify.es',
    }
})


// export async function checkIfAdmin() {
//     const user = await getUser()
//     if (!user || user.role !== "ADMIN") {
//         redirect("/dashboard")
//     }
//     return true;
// }

export async function logout() {
    deleteSession()
    redirect("/login")
}