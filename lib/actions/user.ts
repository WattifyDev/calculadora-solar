"use server"

import { prisma } from "@/lib/db"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { getUser } from "@/lib/user"
import { sendAdminNotification } from "@/lib/email"

// Zod schema for validating user settings update
const UserSettingsSchema = z.object({
    name: z.string().min(1, "El nombre es requerido").optional(),
    // email: z.string().email("Email inválido").optional(), // Email change might need separate verification flow, omitting for now
    smtpHost: z.string().optional().nullable(),
    smtpPort: z.coerce.number().positive("El puerto debe ser un número positivo").optional().nullable(),
    smtpUser: z.string().optional().nullable(),
    smtpPassword: z.string().optional().nullable(), // Password should ideally be "******" if not changed, or new value
    smtpFrom: z.string().email("Email de remitente inválido").optional().nullable(),

    // Price per kW and Currency
    priceKW: z.coerce.number().positive("El precio por kW debe ser un número positivo").optional().nullable(),
    priceKWCurrency: z.enum(["EUR", "COP", "GTQ"]).optional(),

    // New percentage fields
    inverterCostPercentage: z.coerce.number().min(0, "El porcentaje debe ser no negativo").max(1, "El porcentaje no puede exceder 1 (100%)").optional(),
    commissioningLegalizationPercentage: z.coerce.number().min(0, "El porcentaje debe ser no negativo").max(1, "El porcentaje no puede exceder 1 (100%)").optional(),
    warrantySupportPercentage: z.coerce.number().min(0, "El porcentaje debe ser no negativo").max(1, "El porcentaje no puede exceder 1 (100%)").optional(),
    monitoringToolPercentage: z.coerce.number().min(0, "El porcentaje debe ser no negativo").max(1, "El porcentaje no puede exceder 1 (100%)").optional(),
    installationServicesPercentage: z.coerce.number().min(0, "El porcentaje debe ser no negativo").max(1, "El porcentaje no puede exceder 1 (100%)").optional(),
    structureCostPercentage: z.coerce.number().min(0, "El porcentaje debe ser no negativo").max(1, "El porcentaje no puede exceder 1 (100%)").optional(),
});

export type UserSettingsState = {
    errors?: {
        name?: string[];
        smtpHost?: string[];
        smtpPort?: string[];
        smtpUser?: string[];
        smtpPassword?: string[];
        smtpFrom?: string[];
        priceKW?: string[];
        priceKWCurrency?: string[];
        inverterCostPercentage?: string[];
        commissioningLegalizationPercentage?: string[];
        warrantySupportPercentage?: string[];
        monitoringToolPercentage?: string[];
        installationServicesPercentage?: string[];
        structureCostPercentage?: string[];
        general?: string[];
    };
    message?: string | null;
    success?: boolean;
};

export async function updateUserSettings(
    prevState: UserSettingsState | undefined,
    formData: FormData
): Promise<UserSettingsState> {
    const user = await getUser();
    if (!user) {
        return {
            errors: { general: ["Usuario no autenticado"] },
            message: "Error de autenticación.",
            success: false,
        };
    }

    const rawFormData = {
        name: formData.get("name") || undefined,
        smtpHost: formData.get("smtpHost") || null,
        smtpPort: formData.get("smtpPort") ? Number(formData.get("smtpPort")) : null,
        smtpUser: formData.get("smtpUser") || null,
        smtpPassword: formData.get("smtpPassword") || undefined,
        smtpFrom: formData.get("smtpFrom") || null,
        priceKW: formData.get("priceKW") ? Number(formData.get("priceKW")) : null,
        priceKWCurrency: formData.get("priceKWCurrency") || undefined,
        inverterCostPercentage: formData.get("inverterCostPercentage") ? Number(formData.get("inverterCostPercentage")) : undefined,
        commissioningLegalizationPercentage: formData.get("commissioningLegalizationPercentage") ? Number(formData.get("commissioningLegalizationPercentage")) : undefined,
        warrantySupportPercentage: formData.get("warrantySupportPercentage") ? Number(formData.get("warrantySupportPercentage")) : undefined,
        monitoringToolPercentage: formData.get("monitoringToolPercentage") ? Number(formData.get("monitoringToolPercentage")) : undefined,
        installationServicesPercentage: formData.get("installationServicesPercentage") ? Number(formData.get("installationServicesPercentage")) : undefined,
        structureCostPercentage: formData.get("structureCostPercentage") ? Number(formData.get("structureCostPercentage")) : undefined,
    };

    // Special handling for password: if it's '******' or empty, don't update it.
    // A real app would require current password to change password, or have a separate flow.
    let passwordToUpdate: string | undefined = undefined;
    const newPassword = formData.get("smtpPassword");
    if (newPassword && typeof newPassword === 'string' && newPassword !== '******' && newPassword.trim() !== '') {
        // In a real app, you'd hash this newPassword if it's for the user's main password.
        // Here it's smtpPassword, so direct assignment is fine if that's the intent.
        passwordToUpdate = newPassword;
    } else {
        // If password field is not touched or explicitly cleared for removal (if allowed)
        // we remove it from rawFormData to avoid sending undefined to Zod or null to DB if not desired
        delete rawFormData.smtpPassword;
    }

    const validatedFields = UserSettingsSchema.safeParse(rawFormData);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Campos inválidos. Por favor revisa los errores.",
            success: false,
        };
    }

    const dataToUpdate = { ...validatedFields.data };
    if (passwordToUpdate !== undefined) {
        dataToUpdate.smtpPassword = passwordToUpdate;
    }
    // Remove fields that were not provided or are undefined to avoid overwriting with nulls if not intended
    Object.keys(dataToUpdate).forEach(key => {
        const K = key as keyof typeof dataToUpdate;
        if (dataToUpdate[K] === undefined) {
            delete dataToUpdate[K];
        }
    });

    try {
        await prisma.user.update({
            where: { id: user.id },
            data: dataToUpdate,
        });

        revalidatePath("/dashboard/settings");
        return {
            message: "Configuración actualizada exitosamente.",
            success: true,
        };
    } catch (error) {
        console.error("Error updating user settings:", error);
        return {
            errors: { general: ["Error al actualizar la configuración."] },
            message: "Error del servidor. Por favor intenta nuevamente.",
            success: false,
        };
    }
}

const SmtpConfigSchema = z.object({
    smtpHost: z.string().min(1, "El servidor SMTP es requerido"),
    smtpPort: z.number().positive("El puerto debe ser un número positivo"),
    smtpUser: z.string().min(1, "El usuario SMTP es requerido"),
    smtpPassword: z.string().min(1, "La contraseña SMTP es requerida"),
    smtpFrom: z.string().email("Email de remitente inválido"),
})

export async function saveSmtpConfig(input: {
    smtpHost: string
    smtpPort: number
    smtpUser: string
    smtpPassword: string
    smtpFrom: string
}): Promise<{ error?: string } | void> {
    const user = await getUser()
    if (!user) return { error: "No autenticado" }
    const parsed = SmtpConfigSchema.safeParse(input)
    if (!parsed.success) {
        return { error: parsed.error.errors[0]?.message || "Datos inválidos" }
    }
    try {
        // Get user details for the notification
        const fullUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { name: true, email: true }
        })

        await prisma.user.update({
            where: { id: user.id },
            data: {
                smtpHost: input.smtpHost,
                smtpPort: input.smtpPort,
                smtpUser: input.smtpUser,
                smtpPassword: input.smtpPassword,
                smtpFrom: input.smtpFrom,
            },
        })

        // Send notification to admin (don't await to avoid blocking user experience)
        if (fullUser) {
            sendAdminNotification(
                `El usuario ${fullUser.name || fullUser.email || 'Desconocido'} ha completado su configuración de correo SMTP en su calculadora solar`,
                'Nueva configuración SMTP completada'
            ).catch(error => {
                console.error('Failed to send SMTP config notification:', error)
            })
        }

        return
    } catch (e) {
        return { error: "Error al guardar la configuración SMTP" }
    }
} 