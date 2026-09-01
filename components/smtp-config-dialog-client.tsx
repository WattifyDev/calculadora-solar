"use client"

import { useState } from "react"
import { SmtpConfigDialog } from "@/components/smtp-config-dialog"
import { saveSmtpConfig } from "@/lib/actions/user"

interface SmtpConfigDialogClientProps {
    needsSmtpConfig: boolean
}

export function SmtpConfigDialogClient({ needsSmtpConfig }: SmtpConfigDialogClientProps) {
    const [open, setOpen] = useState(true)
    if (!needsSmtpConfig) return null
    return (
        <SmtpConfigDialog
            open={open}
            onOpenChange={setOpen}
            onSave={saveSmtpConfig}
        />
    )
} 