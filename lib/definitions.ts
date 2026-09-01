import { z } from "zod"

export const signupSchema = z.object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    email: z.string().email("Correo electrónico inválido"),
    password: z
        .string()
        .min(6, "La contraseña debe tener al menos 6 caracteres"),
    confirmPassword: z.string(),
    priceKWCurrency: z.enum(["EUR", "COP", "GTQ"], { required_error: "La moneda es requerida" }),
    inverterCostPercentage: z.coerce.number().min(0, "El porcentaje debe ser positivo").max(1, "El porcentaje no puede exceder 1 (100%)"),
    commissioningLegalizationPercentage: z.coerce.number().min(0, "El porcentaje debe ser positivo").max(1, "El porcentaje no puede exceder 1 (100%)"),
    warrantySupportPercentage: z.coerce.number().min(0, "El porcentaje debe ser positivo").max(1, "El porcentaje no puede exceder 1 (100%)"),
    monitoringToolPercentage: z.coerce.number().min(0, "El porcentaje debe ser positivo").max(1, "El porcentaje no puede exceder 1 (100%)"),
    installationServicesPercentage: z.coerce.number().min(0, "El porcentaje debe ser positivo").max(1, "El porcentaje no puede exceder 1 (100%)"),
    structureCostPercentage: z.coerce.number().min(0, "El porcentaje debe ser positivo").max(1, "El porcentaje no puede exceder 1 (100%)"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
})

export const loginSchema = z.object({
    email: z.string().email("Correo electrónico inválido"),
    password: z.string().min(1, "La contraseña es requerida"),
})

export const clientSchema = z.object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    email: z.string().email("Correo electrónico inválido"),
    phone: z.string().optional(),
    address: z.string().optional(),
})

export type SignupSchemaType = z.infer<typeof signupSchema>
export type LoginSchemaType = z.infer<typeof loginSchema>
export type ClientSchemaType = z.infer<typeof clientSchema>

export type FieldErrors = {
    [K in keyof SignupSchemaType]?: string[]
}

export interface SignupResponse {
    errors?: FieldErrors
    error?: string
    data?: Record<string, any>
}

export type LoginResponse = {
    errors?: {
        [K in keyof LoginSchemaType]?: string[]
    }
    error?: string
    data?: Record<string, any>
}