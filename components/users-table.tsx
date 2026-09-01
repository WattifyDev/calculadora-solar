"use client"

import { useState, useEffect } from "react"
import { User, Role, Currency } from "@/generated/prisma"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit, Eye, EyeOff, Plus } from "lucide-react"
import { deleteUser, updateUser, type UserManagementState } from "@/lib/actions/user-management"
import { useActionState } from "react"
import { useRouter } from "next/navigation"

type SanitizedUser = Omit<User, "password">

interface UserTableProps {
    users: SanitizedUser[]
    currentPage: number
    totalPages: number
}

export default function UsersTable({ users, currentPage, totalPages }: UserTableProps) {
    const [editingUser, setEditingUser] = useState<string | null>(null)
    const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
    const router = useRouter()

    const [updateState, updateUserAction] = useActionState<UserManagementState, FormData>(updateUser, {})

    // Close edit form when update is successful
    useEffect(() => {
        if (updateState?.success) {
            setEditingUser(null)
        }
    }, [updateState?.success])

    const handleDelete = async (userId: string, userName: string) => {
        if (confirm(`¿Estás seguro de que quieres eliminar al usuario "${userName}"? Esta acción no se puede deshacer.`)) {
            await deleteUser(userId)
        }
    }

    const togglePassword = (userId: string) => {
        setShowPasswords(prev => ({
            ...prev,
            [userId]: !prev[userId]
        }))
    }

    const getRoleBadgeVariant = (role: Role) => {
        return role === "ADMIN" ? "default" : "secondary"
    }

    const formatCurrency = (amount: number | null, currency: Currency | null) => {
        if (!amount) return "No configurado"
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: currency || 'EUR'
        }).format(amount)
    }

    const handleCreateUser = () => {
        router.push('/signup')
    }

    return (
        <div className="space-y-6 ">
            {/* Header with Create Button */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Gestión de Usuarios</h2>
                    <p className="text-gray-500">Administrar usuarios del sistema</p>
                </div>
                <Button onClick={handleCreateUser} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Crear Usuario
                </Button>
            </div>

            {/* Users Table */}
            <Card>
                <CardContent className="p-2">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Usuario</TableHead>
                                    <TableHead>Rol</TableHead>
                                    <TableHead>Dominio</TableHead>
                                    <TableHead>Precio kW</TableHead>
                                    <TableHead>SMTP</TableHead>
                                    <TableHead>Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id}>
                                        {editingUser === user.id ? (
                                            // Edit mode - entire row is wrapped in a form
                                            <>
                                                <TableCell colSpan={6}>
                                                    <form action={updateUserAction} className="space-y-4">
                                                        <input type="hidden" name="id" value={user.id} />

                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                            {/* Basic Info */}
                                                            <div className="space-y-2">
                                                                <Label>Información Básica</Label>
                                                                <Input name="name" defaultValue={user.name || ""} placeholder="Nombre" />
                                                                <Input name="email" defaultValue={user.email} placeholder="Email" type="email" />
                                                                <div className="relative">
                                                                    <Input
                                                                        name="password"
                                                                        type={showPasswords[user.id] ? "text" : "password"}
                                                                        defaultValue=""
                                                                        placeholder="Nueva contraseña (opcional)"
                                                                    />
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="absolute right-0 top-0 h-full px-3"
                                                                        onClick={() => togglePassword(user.id)}
                                                                    >
                                                                        {showPasswords[user.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                                    </Button>
                                                                </div>
                                                                <Select name="role" defaultValue={user.role}>
                                                                    <SelectTrigger>
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="USER">Usuario</SelectItem>
                                                                        <SelectItem value="ADMIN">Admin</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>

                                                            {/* Business Config */}
                                                            <div className="space-y-2">
                                                                <Label>Configuración de Negocio</Label>
                                                                <Input name="domain" defaultValue={user.domain || ""} placeholder="ejemplo.com" />
                                                                <Input name="priceKW" defaultValue={user.priceKW?.toString() || ""} placeholder="Precio por kW" type="number" step="0.01" />
                                                                <Select name="priceKWCurrency" defaultValue={user.priceKWCurrency || "EUR"}>
                                                                    <SelectTrigger>
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="EUR">🇪🇸 EUR (€)</SelectItem>
                                                                        <SelectItem value="COP">🇨🇴 COP ($)</SelectItem>
                                                                        <SelectItem value="GTQ">🇬🇹 GTQ (Q)</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>

                                                            {/* SMTP Config */}
                                                            <div className="space-y-2">
                                                                <Label>Configuración SMTP</Label>
                                                                <Input name="smtpHost" defaultValue={user.smtpHost || ""} placeholder="SMTP Host" />
                                                                <Input name="smtpPort" defaultValue={user.smtpPort?.toString() || ""} placeholder="Puerto" type="number" />
                                                                <Input name="smtpUser" defaultValue={user.smtpUser || ""} placeholder="Usuario SMTP" />
                                                                <Input
                                                                    name="smtpPassword"
                                                                    type="password"
                                                                    defaultValue=""
                                                                    placeholder="Contraseña SMTP (opcional)"
                                                                />
                                                                <Input name="smtpFrom" defaultValue={user.smtpFrom || ""} placeholder="Email desde" type="email" />
                                                            </div>
                                                        </div>

                                                        <div className="flex gap-2 pt-4">
                                                            <Button type="submit" size="sm">Guardar Cambios</Button>
                                                            <Button type="button" size="sm" variant="outline" onClick={() => setEditingUser(null)}>
                                                                Cancelar
                                                            </Button>
                                                        </div>
                                                    </form>
                                                </TableCell>
                                            </>
                                        ) : (
                                            // View mode - normal table cells
                                            <>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">{user.name || "Sin nombre"}</div>
                                                        <div className="text-sm text-gray-500">{user.email}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={getRoleBadgeVariant(user.role)}>
                                                        {user.role === "ADMIN" ? "Admin" : "Usuario"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm">{user.domain || "No configurado"}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm">{formatCurrency(user.priceKW, user.priceKWCurrency)}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        {user.smtpHost ? (
                                                            <div>
                                                                <div>Host: {user.smtpHost}</div>
                                                                <div>Puerto: {user.smtpPort}</div>
                                                                <div>Usuario: {user.smtpUser}</div>
                                                            </div>
                                                        ) : (
                                                            "No configurado"
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setEditingUser(user.id)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(user.id, user.name || user.email)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2">
                    <Button
                        variant="outline"
                        disabled={currentPage <= 1}
                        onClick={() => {
                            const url = new URL(window.location.href)
                            url.searchParams.set('page', String(currentPage - 1))
                            window.location.href = url.toString()
                        }}
                    >
                        Anterior
                    </Button>
                    <span className="text-sm">
                        Página {currentPage} de {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        disabled={currentPage >= totalPages}
                        onClick={() => {
                            const url = new URL(window.location.href)
                            url.searchParams.set('page', String(currentPage + 1))
                            window.location.href = url.toString()
                        }}
                    >
                        Siguiente
                    </Button>
                </div>
            )}

            {/* Success/Error Messages */}
            {updateState?.message && (
                <div className={`p-4 rounded-md ${updateState.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {updateState.message}
                </div>
            )}
        </div>
    )
}
