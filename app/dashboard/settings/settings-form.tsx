"use client"

import { useActionState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { updateUserSettings, type UserSettingsState } from "@/lib/actions/user"
import { CURRENCY_OPTIONS } from "@/lib/currency"
import type { User } from "@/generated/prisma"

// Define a more specific type for the user prop, including the new fields.
// This should align with what's fetched in settings/page.tsx.
interface SettingsFormUser {
    name: string | null;
    email: string;
    smtpHost: string | null;
    smtpPort: number | null;
    smtpUser: string | null;
    smtpPassword?: string | null; // Password might not always be sent to client
    smtpFrom: string | null;
    priceKW: number | null;
    priceKWCurrency: string | null;
    commissioningLegalizationPercentage: number | null;
    warrantySupportPercentage: number | null;
    monitoringToolPercentage: number | null;
    structureCostPercentage: number | null;
    installationServicesPercentage: number | null;
}

interface SettingsFormProps {
    user: SettingsFormUser;
}

type ExtendedUserSettingsState = UserSettingsState & {
    errors: UserSettingsState["errors"] & {
        installationServicesPercentage?: string[];
        structureCostPercentage?: string[];
    };
};

const initialState: ExtendedUserSettingsState = {
    message: null,
    errors: {},
    success: false,
};

function SubmitButton({ isPending }: { isPending: boolean }) {
    return (
        <Button type="submit" className="w-full sm:w-auto" disabled={isPending}>
            {isPending ? "Guardando Cambios..." : "Guardar Cambios"}
        </Button>
    )
}

export function SettingsForm({ user }: SettingsFormProps) {
    const [state, dispatch, isPending] = useActionState(updateUserSettings, initialState)

    useEffect(() => {
        if (state?.success) {
            console.log("Settings updated successfully");
        }
        if (state?.message && !state.success && state.errors && Object.keys(state.errors).length > 0) {
            console.error("Error updating settings:", state.message, state.errors);
        }
    }, [state]);

    return (
        <form action={dispatch}>
            <Card>
                <CardHeader>
                    <CardTitle>Información Personal</CardTitle>
                    <CardDescription>Actualiza tu información personal y de contacto.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {state?.message && (
                        <p className={`p-3 rounded-md text-sm ${state.success ? 'bg-green-100 text-green-700' : 'bg-destructive/10 text-destructive'}`}>
                            {state.message}
                        </p>
                    )}
                    <div className="space-y-3">
                        <Label htmlFor="name">Nombre</Label>
                        <Input id="name" name="name" defaultValue={user.name ?? ""} />
                        {state?.errors?.name && <p className="text-sm text-destructive">{state.errors.name[0]}</p>}
                    </div>
                    <div className="space-y-3">
                        <Label htmlFor="email">Correo Electrónico</Label>
                        <Input id="email" name="email" type="email" defaultValue={user.email} disabled readOnly />
                        <p className="text-xs text-muted-foreground">El correo electrónico no se puede modificar.</p>
                    </div>
                </CardContent>
            </Card>

            <Card className="mt-8">
                <CardHeader>
                    <CardTitle>Configuración Comercial y Moneda</CardTitle>
                    <CardDescription>
                        Establece el precio base por kW y la moneda preferida para los cálculos solares.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div className="space-y-3">
                            <Label htmlFor="priceKW">Precio Venta por kWp</Label>
                            <Input
                                id="priceKW"
                                name="priceKW"
                                type="number"
                                step="1"
                                placeholder="ej: 1200"
                                defaultValue={user.priceKW?.toString() ?? ""}
                            />
                            <p className="text-xs text-muted-foreground">Si se deja vacío, se usará el precio por defecto del país.</p>
                            {state?.errors?.priceKW && <p className="text-sm text-destructive">{state.errors.priceKW[0]}</p>}
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="priceKWCurrency">Moneda Preferida</Label>
                            <select
                                id="priceKWCurrency"
                                name="priceKWCurrency"
                                defaultValue={user.priceKWCurrency ?? "EUR"}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {CURRENCY_OPTIONS.map((c) => (
                                    <option key={c.code} value={c.code}>
                                        {c.flag} {c.label} ({c.symbol})
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-muted-foreground">Moneda utilizada para presupuestos y amortización.</p>
                            {state?.errors?.priceKWCurrency && <p className="text-sm text-destructive">{state.errors.priceKWCurrency[0]}</p>}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="mt-8">
                <CardHeader>
                    <CardTitle>Preferencias de Desglose de Costos</CardTitle>
                    <CardDescription>
                        Define los porcentajes (ej: 0.15 para 15%) para las siguientes categorías en el desglose de costos de tus proyectos.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div className="space-y-3">
                            <Label htmlFor="commissioningLegalizationPercentage">Puesta en Marcha y Legalización (%)</Label>
                            <Input
                                id="commissioningLegalizationPercentage"
                                name="commissioningLegalizationPercentage"
                                type="number"
                                step="0.01"
                                placeholder="ej: 0.15"
                                defaultValue={user.commissioningLegalizationPercentage?.toString() ?? "0.15"}
                                className={state?.errors?.commissioningLegalizationPercentage ? "border-destructive" : ""}
                            />
                            {state?.errors?.commissioningLegalizationPercentage && <p className="text-sm text-destructive">{state.errors.commissioningLegalizationPercentage[0]}</p>}
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="warrantySupportPercentage">Garantía y Soporte Técnico (%)</Label>
                            <Input
                                id="warrantySupportPercentage"
                                name="warrantySupportPercentage"
                                type="number"
                                step="0.01"
                                placeholder="ej: 0.05"
                                defaultValue={user.warrantySupportPercentage?.toString() ?? "0.05"}
                                className={state?.errors?.warrantySupportPercentage ? "border-destructive" : ""}
                            />
                            {state?.errors?.warrantySupportPercentage && <p className="text-sm text-destructive">{state.errors.warrantySupportPercentage[0]}</p>}
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="monitoringToolPercentage">Herramienta de Monitorización (%)</Label>
                            <Input
                                id="monitoringToolPercentage"
                                name="monitoringToolPercentage"
                                type="number"
                                step="0.01"
                                placeholder="ej: 0.10"
                                defaultValue={user.monitoringToolPercentage?.toString() ?? "0.10"}
                                className={state?.errors?.monitoringToolPercentage ? "border-destructive" : ""}
                            />
                            {state?.errors?.monitoringToolPercentage && <p className="text-sm text-destructive">{state.errors.monitoringToolPercentage[0]}</p>}
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="installationServicesPercentage">Servicios de Instalación y Puesta en Marcha (%)</Label>
                            <Input
                                id="installationServicesPercentage"
                                name="installationServicesPercentage"
                                type="number"
                                step="0.01"
                                placeholder="ej: 0.30"
                                defaultValue={user.installationServicesPercentage?.toString() ?? "0.30"}
                                className={state?.errors?.installationServicesPercentage ? "border-destructive" : ""}
                            />
                            {state?.errors?.installationServicesPercentage && <p className="text-sm text-destructive">{state.errors.installationServicesPercentage[0]}</p>}
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="structureCostPercentage">Estructura (%)</Label>
                            <Input
                                id="structureCostPercentage"
                                name="structureCostPercentage"
                                type="number"
                                step="0.01"
                                placeholder="ej: 0.05"
                                defaultValue={user.structureCostPercentage?.toString() ?? "0.05"}
                                className={state?.errors?.structureCostPercentage ? "border-destructive" : ""}
                            />
                            {state?.errors?.structureCostPercentage && <p className="text-sm text-destructive">{state.errors.structureCostPercentage[0]}</p>}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="mt-8">
                <CardHeader>
                    <CardTitle>Configuración de Correo (SMTP)</CardTitle>
                    <CardDescription>Configura los detalles de tu servidor SMTP para el envío de correos.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div className="space-y-3">
                            <Label htmlFor="smtpHost">Servidor SMTP</Label>
                            <Input id="smtpHost" name="smtpHost" defaultValue={user.smtpHost ?? ""} placeholder="ej: smtp.gmail.com" />
                            {state?.errors?.smtpHost && <p className="text-sm text-destructive">{state.errors.smtpHost[0]}</p>}
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="smtpPort">Puerto SMTP</Label>
                            <Input id="smtpPort" name="smtpPort" type="number" defaultValue={user.smtpPort?.toString() ?? "587"} placeholder="ej: 587" />
                            {state?.errors?.smtpPort && <p className="text-sm text-destructive">{state.errors.smtpPort[0]}</p>}
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="smtpUser">Usuario SMTP</Label>
                            <Input id="smtpUser" name="smtpUser" defaultValue={user.smtpUser ?? ""} placeholder="ej: tu@email.com" />
                            {state?.errors?.smtpUser && <p className="text-sm text-destructive">{state.errors.smtpUser[0]}</p>}
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="smtpPassword">Contraseña SMTP</Label>
                            <Input id="smtpPassword" name="smtpPassword" type="password" placeholder="******" autoComplete="new-password" />
                            <p className="text-xs text-muted-foreground">Dejar en blanco para no modificar.</p>
                            {state?.errors?.smtpPassword && <p className="text-sm text-destructive">{state.errors.smtpPassword[0]}</p>}
                        </div>
                        <div className="space-y-3 col-span-full">
                            <Label htmlFor="smtpFrom">Email de Remitente SMTP</Label>
                            <Input id="smtpFrom" name="smtpFrom" type="email" defaultValue={user.smtpFrom ?? ""} placeholder="ej: noreply@miempresa.com" />
                            {state?.errors?.smtpFrom && <p className="text-sm text-destructive">{state.errors.smtpFrom[0]}</p>}
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                    <SubmitButton isPending={isPending} />
                </CardFooter>
            </Card>
        </form>
    )
} 