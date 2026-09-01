"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

interface SmtpConfigDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    initialValues?: {
        smtpHost?: string
        smtpPort?: number
        smtpUser?: string
        smtpPassword?: string
        smtpFrom?: string
    }
    onSave: (values: {
        smtpHost: string
        smtpPort: number
        smtpUser: string
        smtpPassword: string
        smtpFrom: string
    }) => Promise<{ error?: string } | void>
}

export function SmtpConfigDialog({ open, onOpenChange, initialValues, onSave }: SmtpConfigDialogProps) {
    const [form, setForm] = useState({
        smtpHost: initialValues?.smtpHost || "",
        smtpPort: initialValues?.smtpPort?.toString() || "587",
        smtpUser: initialValues?.smtpUser || "",
        smtpPassword: initialValues?.smtpPassword || "",
        smtpFrom: initialValues?.smtpFrom || ""
    })
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setIsSaving(true)
        setError(null)
        const result = await onSave({
            smtpHost: form.smtpHost,
            smtpPort: Number(form.smtpPort),
            smtpUser: form.smtpUser,
            smtpPassword: form.smtpPassword,
            smtpFrom: form.smtpFrom
        })
        setIsSaving(false)
        if (result && result.error) {
            setError(result.error)
        } else {
            onOpenChange(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="max-w-md w-full">
                <SheetHeader>
                    <SheetTitle>Configurar SMTP</SheetTitle>
                </SheetHeader>
                <form onSubmit={handleSubmit} className="space-y-6 mt-6">
                    <div className="space-y-3">
                        <Label htmlFor="smtpHost">Servidor SMTP</Label>
                        <Input id="smtpHost" name="smtpHost" value={form.smtpHost} onChange={handleChange} required />
                    </div>
                    <div className="space-y-3">
                        <Label htmlFor="smtpPort">Puerto SMTP</Label>
                        <Input id="smtpPort" name="smtpPort" type="number" value={form.smtpPort} onChange={handleChange} required />
                    </div>
                    <div className="space-y-3">
                        <Label htmlFor="smtpUser">Usuario SMTP</Label>
                        <Input id="smtpUser" name="smtpUser" value={form.smtpUser} onChange={handleChange} required />
                    </div>
                    <div className="space-y-3">
                        <Label htmlFor="smtpPassword">Contraseña SMTP</Label>
                        <Input id="smtpPassword" name="smtpPassword" type="password" value={form.smtpPassword} onChange={handleChange} required />
                    </div>
                    <div className="space-y-3">
                        <Label htmlFor="smtpFrom">Email de remitente</Label>
                        <Input id="smtpFrom" name="smtpFrom" type="email" value={form.smtpFrom} onChange={handleChange} required />
                    </div>
                    {error && <p className="text-destructive text-sm">{error}</p>}
                    <SheetFooter>
                        <Button type="submit" className="w-full" disabled={isSaving}>{isSaving ? "Guardando..." : "Guardar configuración"}</Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    )
} 