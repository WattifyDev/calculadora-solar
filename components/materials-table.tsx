/* eslint-disable @next/next/no-img-element */
'use client'

import { useState } from "react"
import { Edit, MoreHorizontal, Plus, Save, Trash2, X, Download, Check, X as XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Material } from "@/lib/types"
import { MaterialType, PanelType, PanelApplication } from "@/lib/types"
import { updateMaterial, deleteMaterial } from "@/lib/actions/materials"

type Role = "ADMIN" | "USER"

interface MaterialsTableProps {
  initialMaterials: Material[]
  userRole: Role
}

export default function MaterialsTable({ initialMaterials, userRole }: MaterialsTableProps) {
  const [materials, setMaterials] = useState<Material[]>(initialMaterials)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Material> | null>(null)
  const [datasheetPdfName, setDatasheetPdfName] = useState<string>('')
  const [datasheetPdfError, setDatasheetPdfError] = useState<string | null>(null)

  const isAdmin = userRole === "ADMIN"

  const startEditing = (material: Material) => {
    setEditingId(material.id)
    setEditForm({ ...material })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditForm(null)
  }

  const saveEditing = async () => {
    if (editForm && editingId) {
      try {
        if (!isAdmin) {
          console.warn('User without admin role attempted to save material edits.')
          cancelEditing()
          return;
        }

        const updateData: Partial<Material> = {
          name: editForm.name,
          area: editForm.area,
          type: editForm.type,
          panelType: editForm.type === MaterialType.PANEL ? editForm.panelType : null,
          panelApplication: editForm.type === MaterialType.PANEL ? editForm.panelApplication : null,
          peakPower: editForm.type === MaterialType.INVERSOR ? editForm.peakPower : null,
          image: editForm.image,
          datasheetPdf: editForm.datasheetPdf,
        };

        const updated = await updateMaterial(editingId, updateData as any)
        setMaterials(materials.map((m) => (m.id === editingId ? updated : m)))
        setEditingId(null)
        setEditForm(null)
      } catch (error) {
        console.error('Error updating material:', error)
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (!isAdmin) return

    if (confirm("¿Estás seguro de que deseas eliminar este material?")) {
      try {
        await deleteMaterial(id)
        setMaterials(materials.filter((m) => m.id !== id))
      } catch (error) {
        console.error('Error deleting material:', error)
      }
    }
  }

  const handleEditChange = (field: keyof Material, value: any) => {
    if (editForm) {
      if (!isAdmin) return;

      let processedValue = value;
      if (field === 'area') {
        processedValue = parseFloat(value) || 0;
      }

      const newEditForm = { ...editForm, [field]: processedValue };

      if (field === 'type') {
        if (value !== MaterialType.PANEL) {
          newEditForm.panelType = null;
          newEditForm.panelApplication = null;
        }
        if (value !== MaterialType.INVERSOR) {
          newEditForm.peakPower = null;
        }
      }
      setEditForm(newEditForm);
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
      // Convert to base64 for update
      const reader = new FileReader()
      reader.onloadend = () => {
        handleEditChange('datasheetPdf', reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setDatasheetPdfName('')
      handleEditChange('datasheetPdf', null)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card/40 backdrop-blur-md shadow-lg p-6">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border hover:bg-transparent">
            <TableHead className="w-[80px] text-muted-foreground font-semibold">Imagen</TableHead>
            <TableHead className="text-muted-foreground font-semibold">Nombre</TableHead>
            <TableHead className="text-muted-foreground font-semibold">Especificaciones</TableHead>
            <TableHead className="text-muted-foreground font-semibold">Aplicación</TableHead>
            <TableHead className="text-muted-foreground font-semibold">Área (m²)</TableHead>
            <TableHead className="text-right text-muted-foreground font-semibold">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {materials.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                No se encontraron materiales.
              </TableCell>
            </TableRow>
          ) : (
            materials.map((material, idx) => (
              <TableRow
                key={material.id}
                className={
                  `border-b border-border/50 transition-colors duration-200 ${idx % 2 === 0 ? 'bg-muted/30' : 'bg-background/60'
                  } hover:bg-primary/5 focus-within:bg-primary/10`
                }
              >
                {/* Image Column */}
                <TableCell className="py-4">
                  {material.image ? (
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-border/50 shadow-sm">
                      <img
                        src={material.image}
                        alt={material.name}
                        className="w-full h-full object-cover transition-transform duration-200 hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center border border-border/50">
                      <span className="text-muted-foreground text-xs font-semibold">N/A</span>
                    </div>
                  )}
                </TableCell>

                {/* Name Column */}
                <TableCell className="font-semibold">
                  {editingId === material.id && isAdmin ? (
                    <Input
                      value={editForm?.name ?? ''}
                      onChange={(e) => handleEditChange("name", e.target.value)}
                      className="bg-background/50"
                    />
                  ) : (
                    <span className="text-foreground">{material.name}</span>
                  )}
                </TableCell>

                {/* Specifications Column (Type + Details) */}
                <TableCell>
                  {editingId === material.id && isAdmin ? (
                    <div className="space-y-2">
                      <Select
                        value={editForm?.type ?? ''}
                        onValueChange={(value) => handleEditChange("type", value as MaterialType)}
                      >
                        <SelectTrigger className="bg-background/50 h-9 text-xs">
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={MaterialType.PANEL}>Panel</SelectItem>
                          <SelectItem value={MaterialType.INVERSOR}>Inversor</SelectItem>
                          <SelectItem value={MaterialType.OTHER}>Otro</SelectItem>
                        </SelectContent>
                      </Select>

                      {editForm?.type === MaterialType.PANEL && (
                        <>
                          <Select
                            value={editForm?.panelType ?? ''}
                            onValueChange={(value) => handleEditChange("panelType", value as PanelType)}
                          >
                            <SelectTrigger className="bg-background/50 h-9 text-xs">
                              <SelectValue placeholder="Tipo de panel" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={PanelType.NORMAL}>Normal</SelectItem>
                              <SelectItem value={PanelType.BLACK}>Negro</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            value={editForm?.peakPower ?? ''}
                            onChange={(e) => handleEditChange("peakPower", e.target.value)}
                            placeholder="Potencia Pico (W)"
                            className="bg-background/50 h-9 text-xs mt-2"
                            min={1}
                            step={1}
                            aria-describedby="peakPowerPanel-help"
                          />
                          <span id="peakPowerPanel-help" className="text-xs text-muted-foreground">Potencia máxima del panel en vatios (W).</span>
                        </>
                      )}
                      {editForm?.type === MaterialType.INVERSOR && (
                        <>
                          <Input
                            type="number"
                            value={editForm?.peakPower ?? ''}
                            onChange={(e) => handleEditChange("peakPower", e.target.value)}
                            placeholder="Potencia Pico (kW)"
                            className="bg-background/50 h-9 text-xs"
                            min={0.01}
                            step={0.01}
                            aria-describedby="peakPowerInverter-help"
                          />
                          <span id="peakPowerInverter-help" className="text-xs text-muted-foreground">Potencia máxima del inversor en kilovatios (kW).</span>
                          <div className="flex items-center gap-2 mt-2">
                            <input
                              type="checkbox"
                              checked={!!editForm.hasBattery}
                              onChange={e => handleEditChange('hasBattery', e.target.checked)}
                              className="mr-2"
                            />
                            <span className="text-xs">Con batería</span>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="font-medium text-sm">
                        {material.type === MaterialType.PANEL ? `Panel${material.peakPower ? ` ${material.peakPower}W` : ''}` :
                          material.type === MaterialType.INVERSOR ?
                            `Inversor${material.peakPower ? ` ${material.peakPower}kW` : ''}` : 'Otro'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {material.type === MaterialType.PANEL && material.panelType && (
                          <span>{material.panelType === PanelType.NORMAL ? 'Normal' : 'Negro'}</span>
                        )}
                        {material.type === MaterialType.INVERSOR && (
                          <div className="flex items-center gap-1">
                            {material.hasBattery ? (
                              <><Check className="text-green-600 w-3 h-3" /> Con batería</>
                            ) : (
                              <><XIcon className="text-destructive w-3 h-3" /> Sin batería</>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </TableCell>

                {/* Application Column */}
                <TableCell>
                  {editingId === material.id && isAdmin ? (
                    <>
                      {editForm?.type === MaterialType.PANEL ? (
                        <Select
                          value={editForm?.panelApplication ?? ''}
                          onValueChange={(value) => handleEditChange("panelApplication", value as PanelApplication)}
                        >
                          <SelectTrigger className="bg-background/50 h-9 text-xs">
                            <SelectValue placeholder="Aplicación" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={PanelApplication.RESIDENCIAL}>Residencial</SelectItem>
                            <SelectItem value={PanelApplication.INDUSTRIAL}>Industrial</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-muted-foreground text-xs">N/A</span>
                      )}
                    </>
                  ) : (
                    <span className="font-mono text-sm">
                      {material.type === MaterialType.PANEL && material.panelApplication ? (
                        material.panelApplication === PanelApplication.RESIDENCIAL ? 'Residencial' : 'Industrial'
                      ) : (
                        'N/A'
                      )}
                    </span>
                  )}
                </TableCell>

                {/* Area Column */}
                <TableCell>
                  {editingId === material.id && isAdmin ? (
                    <Input
                      type="number"
                      value={editForm?.area ?? ''}
                      onChange={(e) => handleEditChange("area", e.target.value)}
                      className="bg-background/50"
                    />
                  ) : (
                    <span className="font-mono text-foreground">{material.area} m²</span>
                  )}
                </TableCell>

                {/* Actions Column (includes datasheet) */}
                <TableCell className="text-right">
                  {editingId === material.id ? (
                    <div className="space-y-2 min-w-[200px]">
                      {/* Compact datasheet upload */}
                      <div className="text-left">
                        <label className="text-xs text-muted-foreground block mb-1">
                          Ficha PDF
                        </label>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={handlePdfChange}
                          className="block w-full text-xs text-muted-foreground
                            file:mr-2 file:py-1 file:px-2
                            file:rounded file:border-0
                            file:text-xs file:font-medium
                            file:bg-primary file:text-primary-foreground
                            file:hover:bg-primary/90 file:transition-colors
                            border border-border rounded bg-background/50
                            hover:bg-background/80 transition-colors cursor-pointer"
                        />
                        {datasheetPdfName && (
                          <div className="text-xs text-foreground mt-1 truncate" title={datasheetPdfName}>
                            ✓ {datasheetPdfName}
                          </div>
                        )}
                        {datasheetPdfError && (
                          <div className="text-xs text-destructive mt-1">
                            {datasheetPdfError}
                          </div>
                        )}
                        {editForm?.datasheetPdf && !datasheetPdfName && (
                          <a
                            href={editForm.datasheetPdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary underline block mt-1 hover:text-primary/80"
                          >
                            Ver actual
                          </a>
                        )}
                      </div>

                      {/* Compact action buttons */}
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={saveEditing}
                          className="hover:text-primary hover:bg-primary/10 h-7 w-7 p-0"
                          aria-label="Guardar"
                          title="Guardar cambios"
                          disabled={!isAdmin}
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={cancelEditing}
                          className="hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                          aria-label="Cancelar"
                          title="Cancelar edición"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end space-y-2">
                      {/* Datasheet download - only show if exists */}
                      {material.datasheetPdf && (
                        <a
                          href={
                            material.datasheetPdf.startsWith('data:application/pdf;base64,')
                              ? material.datasheetPdf
                              : `data:application/pdf;base64,${material.datasheetPdf}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary underline flex items-center gap-1 hover:text-primary/80 transition-colors"
                          download={material.name ? `${material.name}.pdf` : 'ficha.pdf'}
                        >
                          <Download className="w-3 h-3" /> Ficha
                        </a>
                      )}

                      {/* Action menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
                            aria-label="Abrir menú de acciones"
                            title="Abrir menú de acciones"
                          >
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {isAdmin && (
                            <DropdownMenuItem
                              onClick={() => startEditing(material)}
                              className="hover:text-primary focus:text-primary"
                              aria-label="Editar material"
                              title="Editar material"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                          )}
                          {isAdmin && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(material.id)}
                              className="hover:text-destructive focus:text-destructive"
                              aria-label="Eliminar material"
                              title="Eliminar material"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          )}
                          {!isAdmin && (
                            <DropdownMenuItem disabled className="text-muted-foreground">
                              <Edit className="mr-2 h-4 w-4" />
                              Ver (Solo Admin puede editar)
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
