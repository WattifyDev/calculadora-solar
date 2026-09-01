"use server"

import { prisma } from "@/lib/db"
import { signupSchema, type SignupResponse, loginSchema, type LoginResponse } from "@/lib/definitions"
import bcrypt from "bcryptjs"
import { createSession } from "../session"
import { redirect } from "next/navigation"
import { z } from "zod"
import { hash } from "bcryptjs"

const SignupFormSchema = z.object({
    name: z.string().min(1, "El nombre es requerido"),
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
    confirmPassword: z.string(),
    domain: z.string().min(1, "El dominio es requerido").regex(
        /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.([a-zA-Z]{2,}|[a-zA-Z]{2,}\.[a-zA-Z]{2,})$/,
        "Formato de dominio inválido (ej: miempresa.com)"
    ),
    priceKW: z.coerce.number().min(0, "El precio por kW debe ser positivo"),
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

export type State = {
    errors?: {
        name?: string[]
        email?: string[]
        password?: string[]
        confirmPassword?: string[]
        domain?: string[]
        priceKW?: string[]
        priceKWCurrency?: string[]
        inverterCostPercentage?: string[]
        commissioningLegalizationPercentage?: string[]
        warrantySupportPercentage?: string[]
        monitoringToolPercentage?: string[]
        installationServicesPercentage?: string[]
        structureCostPercentage?: string[]
    }
    message?: string | null
}

export async function signup(prevState: State | undefined, formData: FormData) {
    const validatedFields = SignupFormSchema.safeParse({
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
        confirmPassword: formData.get("confirmPassword"),
        domain: formData.get("domain"),
        priceKW: formData.get("priceKW"),
        priceKWCurrency: formData.get("priceKWCurrency"),
        inverterCostPercentage: formData.get("inverterCostPercentage"),
        commissioningLegalizationPercentage: formData.get("commissioningLegalizationPercentage"),
        warrantySupportPercentage: formData.get("warrantySupportPercentage"),
        monitoringToolPercentage: formData.get("monitoringToolPercentage"),
        installationServicesPercentage: formData.get("installationServicesPercentage"),
        structureCostPercentage: formData.get("structureCostPercentage"),
    })

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Campos inválidos. Por favor revisa los errores.",
        }
    }

    const { name, email, password, domain, priceKW, priceKWCurrency,
        inverterCostPercentage, commissioningLegalizationPercentage, warrantySupportPercentage, monitoringToolPercentage,
        installationServicesPercentage, structureCostPercentage
    } = validatedFields.data

    try {
        const existingUser = await prisma.user.findUnique({
            where: { email },
        })

        if (existingUser) {
            return {
                message: "El email ya está registrado",
            }
        }

        const hashedPassword = await hash(password, 10)

        await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                domain,
                priceKW,
                priceKWCurrency,
                inverterCostPercentage,
                commissioningLegalizationPercentage,
                warrantySupportPercentage,
                monitoringToolPercentage,
                installationServicesPercentage,
                structureCostPercentage,
            },
        })

    } catch (error) {
        return {
            message: "Error al crear la cuenta. Por favor intenta nuevamente.",
        }
    }

    redirect("/dashboard/users")
}

export async function login(
    prevState: LoginResponse | null,
    formData: FormData
): Promise<LoginResponse> {
    const validationResult = loginSchema.safeParse({
        email: formData.get("email"),
        password: formData.get("password"),
    })

    if (!validationResult.success) {
        return {
            errors: validationResult.error.flatten().fieldErrors,
            data: Object.fromEntries(formData.entries()),
        }
    }

    const data = validationResult.data

    let authenticatedUserId: string | null = null;

    try {
        const user = await prisma.user.findUnique({
            where: { email: data.email },
        }).catch(() => null);

        if (user) {
            const validPassword = await bcrypt.compare(data.password, user.password)
            if (validPassword) {
                authenticatedUserId = String(user.id);
            }
        }

        // Fallback login for admin when DB is offline or initial setup
        if (!authenticatedUserId) {
            if (
                (data.email === 'info@wattify.es' || data.email === 'admin@gmail.com') &&
                (data.password === 'calculadorasolar@2025' || data.password === 'hacelerix')
            ) {
                authenticatedUserId = 'admin-dev-id';
            }
        }

        if (!authenticatedUserId) {
            return {
                error: "Credenciales inválidas",
                data: { email: data.email },
            }
        }

        await createSession(authenticatedUserId)

    } catch (error) {
        console.error("Error during login:", error)
        return {
            error: "Error al iniciar sesión",
            data: { email: data.email },
        }
    }

    redirect("/dashboard")
}