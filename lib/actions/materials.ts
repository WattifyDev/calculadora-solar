'use server'

import { prisma } from '@/lib/db'
import type { Material, MaterialFormData, MaterialType, PanelType, PanelApplication } from '@/lib/types'
import { getUser } from '@/lib/user'

export async function getMaterials(): Promise<Material[]> {
    try {
        // Get all materials
        const materials = await prisma.material.findMany({
            orderBy: { createdAt: 'desc' }
        })
        return materials.map(m => ({
            ...m,
            createdAt: m.createdAt.toISOString(),
            updatedAt: m.updatedAt.toISOString(),
            panelType: m.panelType as PanelType | null,
            panelApplication: m.panelApplication as PanelApplication | null,
            type: m.type as MaterialType,
        }))
    } catch (error) {
        console.error("Database connection issue in getMaterials:", error);
        return [];
    }
}

export async function createMaterial(data: MaterialFormData): Promise<Material> {
    const { image, ...restOfMaterialData } = data

    const materialToCreate = {
        ...restOfMaterialData,
        image: image, // image is already a base64 string or null from the form
    }

    // Explicitly cast enum values if direct assignment is problematic,
    // though Prisma should handle string values for enum fields correctly.
    const createdMaterial = await prisma.material.create({
        data: {
            ...materialToCreate,
            type: materialToCreate.type, // Prisma expects the enum string value
            panelType: materialToCreate.panelType, // Prisma expects the enum string value or null
            panelApplication: materialToCreate.panelApplication, // Prisma expects the enum string value or null
        }
    })

    return {
        ...createdMaterial,
        createdAt: createdMaterial.createdAt.toISOString(),
        updatedAt: createdMaterial.updatedAt.toISOString(),
        panelType: createdMaterial.panelType as PanelType | null,
        panelApplication: createdMaterial.panelApplication as PanelApplication | null,
        type: createdMaterial.type as MaterialType,
    }
}

export async function updateMaterial(id: string, data: Partial<MaterialFormData>): Promise<Material> {
    const user = await getUser()
    if (!user || user.role !== 'ADMIN') {
        throw new Error('Solo el administrador puede editar los materiales globales')
    }
    const { image, ...updateData } = data

    const materialToUpdate = {
        ...updateData,
        // If image is provided in data, use it; otherwise, it won't be updated
        ...(image !== undefined && { image }),
    }

    const updatedMaterial = await prisma.material.update({
        where: { id },
        data: {
            ...materialToUpdate,
            // Prisma expects string values for enums if provided
            ...(materialToUpdate.type && { type: materialToUpdate.type as any }), // Use 'any' if direct type causes issues, or ensure correct enum string
            ...(materialToUpdate.panelType !== undefined && { panelType: materialToUpdate.panelType as any }),
            ...(materialToUpdate.panelApplication !== undefined && { panelApplication: materialToUpdate.panelApplication as any }),
        }
    })
    return {
        ...updatedMaterial,
        createdAt: updatedMaterial.createdAt.toISOString(),
        updatedAt: updatedMaterial.updatedAt.toISOString(),
        panelType: updatedMaterial.panelType as PanelType | null,
        panelApplication: updatedMaterial.panelApplication as PanelApplication | null,
        type: updatedMaterial.type as MaterialType,
    }
}

export async function deleteMaterial(id: string): Promise<void> {
    await prisma.material.delete({
        where: { id }
    })
}