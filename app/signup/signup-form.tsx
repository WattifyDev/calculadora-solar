"use client"

import { useActionState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signup } from "@/lib/actions/auth"
import type { State } from "@/lib/actions/auth"

const initialState: State = {
    errors: {},
    message: null
}

function SubmitButton({ isPending }: { isPending: boolean }) {
    return (
        <Button type="submit" className="w-full h-11 text-lg" disabled={isPending}>
            {isPending ? "Creando usuario..." : "Crear Usuario"}
        </Button>
    )
}

export function SignupForm() {
    const [state, dispatch, isPending] = useActionState(signup, initialState)

    return (
        <Card className="mx-auto w-full max-w-3xl shadow-lg transition-all duration-300 hover:shadow-xl">
            <CardHeader className="space-y-4 px-8 pt-8 text-center">
                <div className="flex flex-col items-center gap-4">
                    <Image
                        src="/wattifylogo.png"
                        alt="Wattify Logo"
                        priority
                        width={200}
                        height={100}
                        className="mb-2 transition-transform duration-300 hover:scale-105"
                    />
                    <CardTitle className="text-3xl font-bold text-gray-800">Crear Cuenta</CardTitle>
                    <p className="text-gray-600">Únete a Wattify y comienza a gestionar tus proyectos solares</p>
                </div>
            </CardHeader>
            <form action={dispatch}>
                <CardContent className="space-y-8 px-8">
                    {state?.message && (
                        <p className="text-sm text-destructive text-center bg-destructive/10 p-3 rounded-md animate-in fade-in slide-in-from-top-2">
                            {state.message}
                        </p>
                    )}

                    {/* Personal Information */}
                    <div className="space-y-6 bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                            Información Personal
                        </h3>
                        <div className="space-y-3">
                            <Label htmlFor="name">Nombre</Label>
                            <Input
                                id="name"
                                name="name"
                                className={state?.errors?.name ? "border-destructive" : ""}
                                aria-describedby={state?.errors?.name ? "name-error" : undefined}
                            />
                            {state?.errors?.name && (
                                <p id="name-error" className="text-sm text-destructive">
                                    {state.errors.name[0]}
                                </p>
                            )}
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="email">Correo electrónico</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                className={state?.errors?.email ? "border-destructive" : ""}
                                aria-describedby={state?.errors?.email ? "email-error" : undefined}
                            />
                            {state?.errors?.email && (
                                <p id="email-error" className="text-sm text-destructive">
                                    {state.errors.email[0]}
                                </p>
                            )}
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="password">Contraseña</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                className={state?.errors?.password ? "border-destructive" : ""}
                                aria-describedby={state?.errors?.password ? "password-error" : undefined}
                            />
                            {state?.errors?.password && (
                                <p id="password-error" className="text-sm text-destructive">
                                    {state.errors.password[0]}
                                </p>
                            )}
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                            <Input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                className={state?.errors?.confirmPassword ? "border-destructive" : ""}
                                aria-describedby={state?.errors?.confirmPassword ? "confirmPassword-error" : undefined}
                            />
                            {state?.errors?.confirmPassword && (
                                <p id="confirmPassword-error" className="text-sm text-destructive">
                                    {state.errors.confirmPassword[0]}
                                </p>
                            )}
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="domain">Dominio</Label>
                            <Input
                                id="domain"
                                name="domain"
                                placeholder="ej: miempresa.com"
                                className={state?.errors?.domain ? "border-destructive" : ""}
                                aria-describedby={state?.errors?.domain ? "domain-error" : undefined}
                            />
                            {state?.errors?.domain && (
                                <p id="domain-error" className="text-sm text-destructive">
                                    {state.errors.domain[0]}
                                </p>
                            )}
                            <p className="text-xs text-gray-600">
                                Este dominio se usará para filtrar las solicitudes. Solo verás las solicitudes que vengan de este dominio.
                            </p>
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="priceKW">Precio por kW (€/kW o COP/kW)</Label>
                            <Input
                                id="priceKW"
                                name="priceKW"
                                type="number"
                                step="0.01"
                                placeholder="ej: 1200"
                                className={state?.errors?.priceKW ? "border-destructive" : ""}
                                aria-describedby={state?.errors?.priceKW ? "priceKW-error" : undefined}
                            />
                            {state?.errors?.priceKW && (
                                <p id="priceKW-error" className="text-sm text-destructive">
                                    {state.errors.priceKW[0]}
                                </p>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                                <Label htmlFor="priceKWCurrency">Moneda</Label>
                                <select
                                    id="priceKWCurrency"
                                    name="priceKWCurrency"
                                    className={"border rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary " + (state?.errors?.priceKWCurrency ? "border-destructive" : "")}
                                    defaultValue="EUR"
                                    aria-describedby={state?.errors?.priceKWCurrency ? "priceKWCurrency-error" : undefined}
                                >
                                    <option value="EUR">🇪🇸 EUR (€)</option>
                                    <option value="COP">🇨🇴 COP ($)</option>
                                    <option value="GTQ">🇬🇹 GTQ (Q)</option>
                                </select>
                            </div>
                            {state?.errors?.priceKWCurrency && (
                                <p id="priceKWCurrency-error" className="text-sm text-destructive">
                                    {state.errors.priceKWCurrency[0]}
                                </p>
                            )}
                            <p className="text-xs text-gray-600">
                                Este es el precio base por kilovatio que se utilizará para calcular los costos de las instalaciones.
                            </p>
                        </div>
                    </div>

                    {/* Cost Breakdown Preferences */}
                    <div className="space-y-6 bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                            Preferencias de Desglose de Costos
                        </h3>
                        <p className="text-sm text-gray-600">
                            Define los porcentajes para las siguientes categorías en el desglose de costos de tus proyectos.
                            Estos valores se pueden ajustar más tarde en tu configuración. Introduce valores decimales (ej: 0.15 para 15%).
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                            <div className="space-y-3">
                                <Label htmlFor="commissioningLegalizationPercentage">Puesta en Marcha y Legalización (%)</Label>
                                <Input
                                    id="commissioningLegalizationPercentage"
                                    name="commissioningLegalizationPercentage"
                                    type="number"
                                    step="0.01"
                                    placeholder="ej: 0.15"
                                    defaultValue="0.15"
                                    className={state?.errors?.commissioningLegalizationPercentage ? "border-destructive" : ""}
                                    aria-describedby={state?.errors?.commissioningLegalizationPercentage ? "commissioningLegalizationPercentage-error" : undefined}
                                />
                                {state?.errors?.commissioningLegalizationPercentage && (
                                    <p id="commissioningLegalizationPercentage-error" className="text-sm text-destructive">
                                        {state.errors.commissioningLegalizationPercentage[0]}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-3">
                                <Label htmlFor="warrantySupportPercentage">Garantía y Soporte Técnico (%)</Label>
                                <Input
                                    id="warrantySupportPercentage"
                                    name="warrantySupportPercentage"
                                    type="number"
                                    step="0.01"
                                    placeholder="ej: 0.05"
                                    defaultValue="0.05"
                                    className={state?.errors?.warrantySupportPercentage ? "border-destructive" : ""}
                                    aria-describedby={state?.errors?.warrantySupportPercentage ? "warrantySupportPercentage-error" : undefined}
                                />
                                {state?.errors?.warrantySupportPercentage && (
                                    <p id="warrantySupportPercentage-error" className="text-sm text-destructive">
                                        {state.errors.warrantySupportPercentage[0]}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-3">
                                <Label htmlFor="monitoringToolPercentage">Herramienta de Monitorización (%)</Label>
                                <Input
                                    id="monitoringToolPercentage"
                                    name="monitoringToolPercentage"
                                    type="number"
                                    step="0.01"
                                    placeholder="ej: 0.10"
                                    defaultValue="0.10"
                                    className={state?.errors?.monitoringToolPercentage ? "border-destructive" : ""}
                                    aria-describedby={state?.errors?.monitoringToolPercentage ? "monitoringToolPercentage-error" : undefined}
                                />
                                {state?.errors?.monitoringToolPercentage && (
                                    <p id="monitoringToolPercentage-error" className="text-sm text-destructive">
                                        {state.errors.monitoringToolPercentage[0]}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-3">
                                <Label htmlFor="installationServicesPercentage">Servicios de Instalación y Puesta en Marcha (%)</Label>
                                <Input
                                    id="installationServicesPercentage"
                                    name="installationServicesPercentage"
                                    type="number"
                                    step="0.01"
                                    placeholder="ej: 0.30"
                                    defaultValue="0.30"
                                    className={state?.errors?.installationServicesPercentage ? "border-destructive" : ""}
                                    aria-describedby={state?.errors?.installationServicesPercentage ? "installationServicesPercentage-error" : undefined}
                                />
                                {state?.errors?.installationServicesPercentage && (
                                    <p id="installationServicesPercentage-error" className="text-sm text-destructive">
                                        {state.errors.installationServicesPercentage[0]}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-3">
                                <Label htmlFor="structureCostPercentage">Estructura (%)</Label>
                                <Input
                                    id="structureCostPercentage"
                                    name="structureCostPercentage"
                                    type="number"
                                    step="0.01"
                                    placeholder="ej: 0.05"
                                    defaultValue="0.05"
                                    className={state?.errors?.structureCostPercentage ? "border-destructive" : ""}
                                    aria-describedby={state?.errors?.structureCostPercentage ? "structureCostPercentage-error" : undefined}
                                />
                                {state?.errors?.structureCostPercentage && (
                                    <p id="structureCostPercentage-error" className="text-sm text-destructive">
                                        {state.errors.structureCostPercentage[0]}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-3">
                                <Label htmlFor="inverterCostPercentage">Inversor (%)</Label>
                                <Input
                                    id="inverterCostPercentage"
                                    name="inverterCostPercentage"
                                    type="number"
                                    step="0.01"
                                    placeholder="ej: 0.35"
                                    defaultValue="0.35"
                                    className={state?.errors?.inverterCostPercentage ? "border-destructive" : ""}
                                    aria-describedby={state?.errors?.inverterCostPercentage ? "inverterCostPercentage-error" : undefined}
                                />
                                {state?.errors?.inverterCostPercentage && (
                                    <p id="inverterCostPercentage-error" className="text-sm text-destructive">
                                        {state.errors.inverterCostPercentage[0]}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>


                </CardContent>
                <CardFooter className="flex flex-col px-8 py-8 gap-4 bg-white rounded-b-lg border-t border-gray-100">
                    <SubmitButton isPending={isPending} />

                </CardFooter>
            </form>
        </Card>
    )
} 