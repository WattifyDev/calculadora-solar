'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ImageIcon, Loader2, FileText, Upload, Zap, Sun, Settings, Info } from 'lucide-react'
import type { MaterialFormData } from '@/lib/types'
import { MaterialType, PanelType, PanelApplication } from '@/lib/types'
import { createMaterial } from '@/lib/actions/materials'

export function MaterialForm() {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [preview, setPreview] = useState<string>('')
    const [area, setArea] = useState('')
    const [imageError, setImageError] = useState<string | null>(null)
    const [currentMaterialType, setCurrentMaterialType] = useState<MaterialType | ''>('')
    const [datasheetPdfName, setDatasheetPdfName] = useState<string>('')
    const [datasheetPdfError, setDatasheetPdfError] = useState<string | null>(null)
    const [hasBattery, setHasBattery] = useState<boolean>(false)

    function handleReset() {
        setPreview('')
        setArea('')
        setImageError(null)
        setCurrentMaterialType('')
        setDatasheetPdfName('')
        setDatasheetPdfError(null)
        setHasBattery(false)
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true)
        setImageError(null)
        setDatasheetPdfError(null)

        try {
            const form = e.currentTarget
            const formData = new FormData(form)
            const imageFile = formData.get('imageFile') as File
            const datasheetPdfFile = formData.get('datasheetPdfFile') as File

            const areaValue = parseFloat(formData.get('area') as string)
            if (isNaN(areaValue) || areaValue <= 0) {
                setImageError('El área debe ser un número mayor a 0')
                setIsSubmitting(false)
                return
            }

            const peakPowerValue = formData.get('peakPower') ? parseFloat(formData.get('peakPower') as string) : null
            if (
                (currentMaterialType === MaterialType.INVERSOR && (peakPowerValue === null || isNaN(peakPowerValue) || peakPowerValue <= 0)) ||
                (currentMaterialType === MaterialType.PANEL && (peakPowerValue === null || isNaN(peakPowerValue) || peakPowerValue <= 0))
            ) {
                setImageError('La potencia pico debe ser un número mayor a 0 para paneles e inversores.')
                setIsSubmitting(false)
                return;
            }

            const materialData: MaterialFormData = {
                name: formData.get('name') as string,
                area: areaValue,
                type: formData.get('type') as MaterialType,
                panelType: formData.get('type') === MaterialType.PANEL ? formData.get('panelType') as PanelType : null,
                panelApplication: formData.get('type') === MaterialType.PANEL ? formData.get('panelApplication') as PanelApplication : null,
                peakPower: peakPowerValue,
                hasBattery: formData.get('type') === MaterialType.INVERSOR ? formData.get('hasBattery') === 'on' : null,
                image: null,
                datasheetPdf: null
            }

            if (imageFile?.size > 0) {
                const base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader()
                    reader.onloadend = () => resolve(reader.result as string)
                    reader.onerror = () => reject('Error al leer la imagen')
                    reader.readAsDataURL(imageFile)
                })
                materialData.image = base64
            }

            if (datasheetPdfFile && datasheetPdfFile.size > 0) {
                if (datasheetPdfFile.type !== 'application/pdf') {
                    setDatasheetPdfError('Solo se permiten archivos PDF')
                    setIsSubmitting(false)
                    return
                }
                if (datasheetPdfFile.size > 10 * 1024 * 1024) {
                    setDatasheetPdfError('El PDF no debe superar los 10MB')
                    setIsSubmitting(false)
                    return
                }
                const base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader()
                    reader.onloadend = () => resolve(reader.result as string)
                    reader.onerror = () => reject('Error al leer el PDF')
                    reader.readAsDataURL(datasheetPdfFile)
                })
                materialData.datasheetPdf = base64
            }

            await createMaterial(materialData)
            form.reset()
            handleReset()
            // Refresh the page to update the materials table
            router.refresh()
        } catch (error) {
            setImageError('Error creando el material')
            console.error('Error creating material:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (!file.type.startsWith('image/')) {
                setImageError('Solo se permiten archivos de imagen')
                setPreview('')
                return
            }
            if (file.size > 5 * 1024 * 1024) {
                setImageError('La imagen no debe superar los 5MB')
                setPreview('')
                return
            }
            setImageError(null)
            const reader = new FileReader()
            reader.onloadend = () => setPreview(reader.result as string)
            reader.readAsDataURL(file)
        } else {
            setPreview('')
        }
    }

    const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.type !== 'application/pdf') {
                setDatasheetPdfError('Solo se permiten archivos PDF')
                setDatasheetPdfName('')
                return
            }
            if (file.size > 10 * 1024 * 1024) {
                setDatasheetPdfError('El PDF no debe superar los 10MB')
                setDatasheetPdfName('')
                return
            }
            setDatasheetPdfError(null)
            setDatasheetPdfName(file.name)
        } else {
            setDatasheetPdfName('')
        }
    }

    const getMaterialIcon = (type: MaterialType) => {
        switch (type) {
            case MaterialType.PANEL:
                return <Sun className="w-4 h-4" />
            case MaterialType.INVERSOR:
                return <Zap className="w-4 h-4" />
            default:
                return <Settings className="w-4 h-4" />
        }
    }

    return (
        <div className="mx-auto">
            <Card className="border-0 shadow-2xl bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-xl">
                <CardHeader className="pb-6">
                    <div className="flex items-center gap-3">

                        <div>
                            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                                Agregar Nuevo Material
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                Complete la información del material solar
                            </p>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-8">
                    <form onSubmit={handleSubmit} onReset={handleReset} className="space-y-8">
                        {/* Basic Information Section */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                                <Info className="w-5 h-5 text-primary" />
                                Información Básica
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <Label htmlFor="name" className="text-sm font-medium text-foreground flex items-center gap-2">
                                        Nombre del Material
                                        <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        required
                                        placeholder="Ej: Panel Solar Canadian CS6K-300MS"
                                        className="h-11 bg-background/50 border-border/50 focus:border-primary/60 focus:ring-primary/20 transition-all duration-200"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <Label htmlFor="type" className="text-sm font-medium text-foreground flex items-center gap-2">
                                        Tipo de Material
                                        <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        name="type"
                                        required
                                        onValueChange={(value) => setCurrentMaterialType(value as MaterialType | '')}
                                        value={currentMaterialType}
                                    >
                                        <SelectTrigger className="h-11 bg-background/50 border-border/50 focus:border-primary/60 focus:ring-primary/20">
                                            <SelectValue placeholder="Seleccione un tipo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={MaterialType.PANEL} className="flex items-center gap-2">
                                                <div className="flex items-center gap-2">
                                                    <Sun className="w-4 h-4" />
                                                    Panel Solar
                                                </div>
                                            </SelectItem>
                                            <SelectItem value={MaterialType.INVERSOR} className="flex items-center gap-2">
                                                <div className="flex items-center gap-2">
                                                    <Zap className="w-4 h-4" />
                                                    Inversor
                                                </div>
                                            </SelectItem>
                                            <SelectItem value={MaterialType.OTHER} className="flex items-center gap-2">
                                                <div className="flex items-center gap-2">
                                                    <Settings className="w-4 h-4" />
                                                    Otro
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Specifications Section */}
                        {currentMaterialType && (
                            <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
                                <div className="border-t border-border/50"></div>
                                <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                                    {getMaterialIcon(currentMaterialType as MaterialType)}
                                    Especificaciones
                                    <Badge variant="secondary" className="ml-2">
                                        {currentMaterialType === MaterialType.PANEL ? 'Panel Solar' :
                                            currentMaterialType === MaterialType.INVERSOR ? 'Inversor' : 'Otro'}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {/* Area field - always shown */}
                                    <div className="space-y-3">
                                        <Label htmlFor="area" className="text-sm font-medium text-foreground flex items-center gap-2">
                                            Área por Unidad (m²)
                                            <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            id="area"
                                            name="area"
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            required
                                            placeholder="Ej: 2.1"
                                            value={area}
                                            onChange={e => setArea(e.target.value)}
                                            className="h-11 bg-background/50 border-border/50 focus:border-primary/60 focus:ring-primary/20 font-mono transition-all duration-200"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Superficie cubierta por una unidad del material
                                        </p>
                                    </div>

                                    {/* Panel-specific fields */}
                                    {currentMaterialType === MaterialType.PANEL && (
                                        <>
                                            <div className="space-y-3">
                                                <Label htmlFor="panelType" className="text-sm font-medium text-foreground flex items-center gap-2">
                                                    Tipo de Panel
                                                    <span className="text-destructive">*</span>
                                                </Label>
                                                <Select name="panelType" required>
                                                    <SelectTrigger className="h-11 bg-background/50 border-border/50 focus:border-primary/60 focus:ring-primary/20">
                                                        <SelectValue placeholder="Seleccione tipo" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value={PanelType.NORMAL}>Normal</SelectItem>
                                                        <SelectItem value={PanelType.BLACK}>Negro (Black)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-3">
                                                <Label htmlFor="panelApplication" className="text-sm font-medium text-foreground flex items-center gap-2">
                                                    Aplicación
                                                    <span className="text-destructive">*</span>
                                                </Label>
                                                <Select name="panelApplication" required>
                                                    <SelectTrigger className="h-11 bg-background/50 border-border/50 focus:border-primary/60 focus:ring-primary/20">
                                                        <SelectValue placeholder="Seleccione aplicación" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value={PanelApplication.RESIDENCIAL}>Residencial</SelectItem>
                                                        <SelectItem value={PanelApplication.INDUSTRIAL}>Industrial</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-3 md:col-span-2 lg:col-span-1">
                                                <Label htmlFor="peakPowerPanel" className="text-sm font-medium text-foreground flex items-center gap-2">
                                                    Potencia Pico (W)
                                                    <span className="text-destructive">*</span>
                                                </Label>
                                                <Input
                                                    id="peakPowerPanel"
                                                    name="peakPower"
                                                    type="number"
                                                    step="1"
                                                    min="1"
                                                    required
                                                    placeholder="Ej: 410"
                                                    className="h-11 bg-background/50 border-border/50 focus:border-primary/60 focus:ring-primary/20 font-mono transition-all duration-200"
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    Potencia máxima del panel en vatios
                                                </p>
                                            </div>
                                        </>
                                    )}

                                    {/* Inverter-specific fields */}
                                    {currentMaterialType === MaterialType.INVERSOR && (
                                        <div className="space-y-3">
                                            <Label htmlFor="peakPowerInverter" className="text-sm font-medium text-foreground flex items-center gap-2">
                                                Potencia Pico (kW)
                                                <span className="text-destructive">*</span>
                                            </Label>
                                            <Input
                                                id="peakPowerInverter"
                                                name="peakPower"
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                required
                                                placeholder="Ej: 5.0"
                                                className="h-11 bg-background/50 border-border/50 focus:border-primary/60 focus:ring-primary/20 font-mono transition-all duration-200"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Potencia máxima del inversor en kilovatios
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Files Section */}
                        <div className="space-y-6">
                            <div className="border-t border-border/50"></div>
                            <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                                <FileText className="w-5 h-5 text-primary" />
                                Archivos
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Image Upload */}
                                <div className="space-y-4">
                                    <Label className="text-sm font-medium text-foreground">
                                        Imagen del Material
                                    </Label>
                                    <div className="relative group">
                                        <label htmlFor="imageFile" className="cursor-pointer block">
                                            <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-border/50 hover:border-primary/50 transition-all duration-300 bg-background/30 hover:bg-background/50">
                                                {preview ? (
                                                    <div className="relative aspect-video w-full">
                                                        <Image
                                                            src={preview}
                                                            alt="Preview"
                                                            fill
                                                            className="object-cover rounded-xl"
                                                        />
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-xl">
                                                            <div className="text-white text-sm font-medium">Cambiar imagen</div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="aspect-video w-full flex flex-col items-center justify-center gap-3 p-8">
                                                        <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors duration-200">
                                                            <ImageIcon className="w-8 h-8 text-primary" />
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="text-sm font-medium text-foreground">Subir imagen</p>
                                                            <p className="text-xs text-muted-foreground mt-1">PNG, JPG hasta 5MB</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </label>
                                        <Input
                                            id="imageFile"
                                            name="imageFile"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleImageChange}
                                        />
                                    </div>
                                    {imageError && (
                                        <p className="text-xs text-destructive font-medium">{imageError}</p>
                                    )}
                                </div>

                                {/* PDF Upload */}
                                <div className="space-y-4">
                                    <Label className="text-sm font-medium text-foreground">
                                        Ficha Técnica (PDF)
                                    </Label>
                                    <div className="relative group">
                                        <label htmlFor="datasheetPdfFile" className="cursor-pointer block">
                                            <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-border/50 hover:border-primary/50 transition-all duration-300 bg-background/30 hover:bg-background/50">
                                                <div className="aspect-video w-full flex flex-col items-center justify-center gap-3 p-8">
                                                    <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors duration-200">
                                                        <FileText className="w-8 h-8 text-primary" />
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-sm font-medium text-foreground">
                                                            {datasheetPdfName ? datasheetPdfName : 'Subir PDF'}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {datasheetPdfName ? 'Archivo seleccionado' : 'Solo PDF hasta 10MB'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </label>
                                        <Input
                                            id="datasheetPdfFile"
                                            name="datasheetPdfFile"
                                            type="file"
                                            accept="application/pdf"
                                            className="hidden"
                                            onChange={handlePdfChange}
                                        />
                                    </div>
                                    {datasheetPdfError && (
                                        <p className="text-xs text-destructive font-medium">{datasheetPdfError}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-end pt-6">
                            <Button
                                type="reset"
                                variant="outline"
                                className="w-full sm:w-auto h-11 border-border/50 hover:bg-muted/50 transition-all duration-200"
                                disabled={isSubmitting}
                            >
                                Limpiar Formulario
                            </Button>
                            <Button
                                type="submit"
                                className="w-full sm:w-auto h-11 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        <span>Guardando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="mr-2 h-4 w-4" />
                                        <span>Guardar Material</span>
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}