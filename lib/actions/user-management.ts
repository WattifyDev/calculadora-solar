"use server"

import { prisma } from "@/lib/db"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { getUser } from "@/lib/user"
import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"

// Zod schema for validating user update
const UserUpdateSchema = z.object({
    id: z.string().min(1, "ID de usuario requerido"),
    name: z.string().min(1, "El nombre es requerido").optional(),
    email: z.string().email("Email inválido").optional(),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").optional(),
    role: z.enum(["ADMIN", "USER"]).optional(),
    domain: z.string().optional().nullable(),
    priceKW: z.coerce.number().positive("El precio por kW debe ser positivo").optional().nullable(),
    priceKWCurrency: z.enum(["EUR", "COP", "GTQ"]).optional(),

    // SMTP settings
    smtpHost: z.string().optional().nullable(),
    smtpPort: z.coerce.number().positive("El puerto debe ser un número positivo").optional().nullable(),
    smtpUser: z.string().optional().nullable(),
    smtpPassword: z.string().optional().nullable(),
    smtpFrom: z.string().email("Email de remitente inválido").optional().nullable(),

    // Percentage fields
    inverterCostPercentage: z.coerce.number().min(0, "El porcentaje debe ser no negativo").max(1, "El porcentaje no puede exceder 1 (100%)").optional(),
    installationServicesPercentage: z.coerce.number().min(0, "El porcentaje debe ser no negativo").max(1, "El porcentaje no puede exceder 1 (100%)").optional(),
    commissioningLegalizationPercentage: z.coerce.number().min(0, "El porcentaje debe ser no negativo").max(1, "El porcentaje no puede exceder 1 (100%)").optional(),
    warrantySupportPercentage: z.coerce.number().min(0, "El porcentaje debe ser no negativo").max(1, "El porcentaje no puede exceder 1 (100%)").optional(),
    monitoringToolPercentage: z.coerce.number().min(0, "El porcentaje debe ser no negativo").max(1, "El porcentaje no puede exceder 1 (100%)").optional(),
    structureCostPercentage: z.coerce.number().min(0, "El porcentaje debe ser no negativo").max(1, "El porcentaje no puede exceder 1 (100%)").optional(),
});

const UserCreateSchema = z.object({
    name: z.string().min(1, "El nombre es requerido"),
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
    role: z.enum(["ADMIN", "USER"]).default("USER"),
    domain: z.string().optional().nullable(),
    priceKW: z.coerce.number().positive("El precio por kW debe ser positivo").optional().nullable(),
    priceKWCurrency: z.enum(["EUR", "COP", "GTQ"]).default("EUR"),
});

export type UserManagementState = {
    errors?: {
        [key: string]: string[];
    };
    message?: string | null;
    success?: boolean;
};

// Check if user is admin before performing actions
async function requireAdmin() {
    const user = await getUser();
    if (!user || user.role !== "ADMIN") {
        throw new Error("Unauthorized: Admin access required");
    }
    return user;
}

export async function updateUser(
    prevState: UserManagementState | undefined,
    formData: FormData
): Promise<UserManagementState> {
    try {
        await requireAdmin(); const rawFormData = {
            id: formData.get("id") as string,
            name: formData.get("name") || undefined,
            email: formData.get("email") || undefined,
            password: formData.get("password") || undefined,
            role: formData.get("role") || undefined,
            domain: formData.get("domain") || null,
            priceKW: formData.get("priceKW") ? Number(formData.get("priceKW")) : null,
            priceKWCurrency: formData.get("priceKWCurrency") || undefined,
            smtpHost: formData.get("smtpHost") || null,
            smtpPort: formData.get("smtpPort") ? Number(formData.get("smtpPort")) : null,
            smtpUser: formData.get("smtpUser") || null,
            smtpPassword: formData.get("smtpPassword") || undefined,
            smtpFrom: formData.get("smtpFrom") || null,
            inverterCostPercentage: formData.get("inverterCostPercentage") ? Number(formData.get("inverterCostPercentage")) : undefined,
            installationServicesPercentage: formData.get("installationServicesPercentage") ? Number(formData.get("installationServicesPercentage")) : undefined,
            commissioningLegalizationPercentage: formData.get("commissioningLegalizationPercentage") ? Number(formData.get("commissioningLegalizationPercentage")) : undefined,
            warrantySupportPercentage: formData.get("warrantySupportPercentage") ? Number(formData.get("warrantySupportPercentage")) : undefined,
            monitoringToolPercentage: formData.get("monitoringToolPercentage") ? Number(formData.get("monitoringToolPercentage")) : undefined,
            structureCostPercentage: formData.get("structureCostPercentage") ? Number(formData.get("structureCostPercentage")) : undefined,
        };

        // Special handling for main password: if it's '******' or empty, don't update it
        let mainPasswordToUpdate: string | undefined = undefined;
        const newMainPassword = formData.get("password");
        if (newMainPassword && typeof newMainPassword === 'string' && newMainPassword !== '******' && newMainPassword.trim() !== '') {
            mainPasswordToUpdate = await bcrypt.hash(newMainPassword, 12);
        } else {
            delete rawFormData.password;
        }

        // Special handling for SMTP password: if it's '******' or empty, don't update it
        let smtpPasswordToUpdate: string | undefined = undefined;
        const newSmtpPassword = formData.get("smtpPassword");
        if (newSmtpPassword && typeof newSmtpPassword === 'string' && newSmtpPassword !== '******' && newSmtpPassword.trim() !== '') {
            smtpPasswordToUpdate = newSmtpPassword;
        } else {
            delete rawFormData.smtpPassword;
        }

        const validatedFields = UserUpdateSchema.safeParse(rawFormData);

        if (!validatedFields.success) {
            return {
                errors: validatedFields.error.flatten().fieldErrors,
                message: "Campos inválidos. Por favor revisa los errores.",
                success: false,
            };
        } const { id, ...dataToUpdate } = validatedFields.data;

        // Add hashed password if provided
        if (mainPasswordToUpdate !== undefined) {
            (dataToUpdate as any).password = mainPasswordToUpdate;
        }

        // Add SMTP password if provided
        if (smtpPasswordToUpdate !== undefined) {
            (dataToUpdate as any).smtpPassword = smtpPasswordToUpdate;
        }

        // Remove undefined fields to avoid overwriting with nulls
        Object.keys(dataToUpdate).forEach(key => {
            const K = key as keyof typeof dataToUpdate;
            if (dataToUpdate[K] === undefined) {
                delete dataToUpdate[K];
            }
        });

        await prisma.user.update({
            where: { id },
            data: dataToUpdate,
        });

        revalidatePath("/dashboard/users");
        return {
            message: "Usuario actualizado exitosamente.",
            success: true,
        };
    } catch (error) {
        console.error("Error updating user:", error);
        return {
            errors: { general: ["Error al actualizar el usuario."] },
            message: "Error del servidor. Por favor intenta nuevamente.",
            success: false,
        };
    }
}

export async function deleteUser(userId: string): Promise<UserManagementState> {
    try {
        const currentUser = await requireAdmin();

        // Prevent admin from deleting themselves
        if (currentUser.id === userId) {
            return {
                errors: { general: ["No puedes eliminar tu propia cuenta."] },
                message: "No puedes eliminar tu propia cuenta.",
                success: false,
            };
        }

        await prisma.user.delete({
            where: { id: userId },
        });

        revalidatePath("/dashboard/users");
        return {
            message: "Usuario eliminado exitosamente.",
            success: true,
        };
    } catch (error) {
        console.error("Error deleting user:", error);
        return {
            errors: { general: ["Error al eliminar el usuario."] },
            message: "Error del servidor. Por favor intenta nuevamente.",
            success: false,
        };
    }
}

export async function createUser(
    prevState: UserManagementState | undefined,
    formData: FormData
): Promise<UserManagementState> {
    try {
        await requireAdmin();

        const rawFormData = {
            name: formData.get("name") as string,
            email: formData.get("email") as string,
            password: formData.get("password") as string,
            role: formData.get("role") as string || "USER",
            domain: formData.get("domain") || null,
            priceKW: formData.get("priceKW") ? Number(formData.get("priceKW")) : null,
            priceKWCurrency: formData.get("priceKWCurrency") as string || "EUR",
        };

        const validatedFields = UserCreateSchema.safeParse(rawFormData);

        if (!validatedFields.success) {
            return {
                errors: validatedFields.error.flatten().fieldErrors,
                message: "Campos inválidos. Por favor revisa los errores.",
                success: false,
            };
        }

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: validatedFields.data.email },
        });

        if (existingUser) {
            return {
                errors: { email: ["Este email ya está en uso."] },
                message: "El email ya está registrado.",
                success: false,
            };
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(validatedFields.data.password, 12);

        await prisma.user.create({
            data: {
                ...validatedFields.data,
                password: hashedPassword,
            },
        });

        revalidatePath("/dashboard/users");
        return {
            message: "Usuario creado exitosamente.",
            success: true,
        };
    } catch (error) {
        console.error("Error creating user:", error);
        return {
            errors: { general: ["Error al crear el usuario."] },
            message: "Error del servidor. Por favor intenta nuevamente.",
            success: false,
        };
    }
}
