import type React from "react"
import { Sidebar } from "@/components/sidebar"
import { getUser } from "@/lib/user"
import { SmtpConfigDialogClient } from "@/components/smtp-config-dialog-client"

export async function DashboardShell({ children }: { children: React.ReactNode }) {
    const user = await getUser()
    const needsSmtpConfig = Boolean(user && (
        !user.smtpHost || !user.smtpPort || !user.smtpUser || !user.smtpFrom
    ))

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar userRole={user?.role} />
            <div className="flex-1 flex flex-col overflow-y-auto md:ml-72">
                <SmtpConfigDialogClient needsSmtpConfig={needsSmtpConfig} />
                <main className="flex-1 p-6 md:p-8">{children}</main>
            </div>
        </div>
    )
}