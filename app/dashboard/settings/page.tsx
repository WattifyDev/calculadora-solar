import { getUser } from "@/lib/user"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { SettingsForm } from "./settings-form"

export default async function SettingsPage() {
    const user = await getUser()
    if (!user) {
        redirect("/login")
    }

    // Get full user data including SMTP and IMAP settings
    const userData = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
            name: true,
            email: true,
            smtpHost: true,
            smtpPort: true,
            smtpUser: true,
            smtpPassword: true,
            smtpFrom: true,
            priceKW: true,
            priceKWCurrency: true,
            commissioningLegalizationPercentage: true,
            warrantySupportPercentage: true,
            monitoringToolPercentage: true,
            structureCostPercentage: true,
            installationServicesPercentage: true,
        },
    })

    if (!userData) {
        redirect("/login")
    }

    return (
        <div className="container py-10">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
                <p className="text-muted-foreground">
                    Gestiona tu configuración y preferencias de cuenta
                </p>
            </div>
            <SettingsForm user={userData} />
        </div>
    )
} 