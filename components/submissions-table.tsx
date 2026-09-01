"use client"

import { useState } from "react"
import { Eye, MoreHorizontal, Download, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Submission as PrismaSubmissionType } from "@/generated/prisma";
import Link from "next/link"
import { useRouter, useSearchParams } from 'next/navigation';
import PdfDownloadButton from "./pdf-download-button";

// Renamed and potentially expanded type for googleSolarData relevant to table and PDF
interface SubmissionGoogleSolarDataForTable {
  initialConsumption?: number | null; // Monthly consumption from form
  maxSunshineHoursPerYear?: number | null;
  maxArrayAreaMeters2?: number | null;
  maxArrayPanelsCount?: number | null;
  panelsCount?: number | null;
  yearlyEnergyDcKwh?: number | null;
  estimatedAnnualSavingsAmount?: number | null;
  estimatedTotalLifetimeSavingsAmount?: number | null;
  estimatedInstallationCostAmount?: number | null;
  paybackYears?: number | null;
  currencyCode?: string | null;
  monthlyElectricityBillAmount?: number | null;
  averageKwhConsumption?: number | null; // This is the same as initialConsumption
}

// Expanded type to include more fields for the PDF
export interface SubmissionForTableDisplay extends Pick<PrismaSubmissionType,
  'id' |
  'createdAt' |
  'address' |
  'city' |
  'country' |
  'userName' |
  'userEmail' |
  'userPhone' |
  'origin' |
  'pathname' |
  'latitude' |
  'longitude' |
  // Scalar financial and solar fields from Submission model
  'annualProduction' |
  'totalCost' |
  'firstYearSavings' |
  'lifetimeSavings' |
  'paybackYears' |
  'currencyCode' |
  'monthlyElectricityBillAmount' |
  'averageKwhConsumption' |
  'systemSize' |
  'panelCount'
> {
  orthophotoUrl?: string | null;
  orthophotoBase64?: string | null;
  googleSolarData?: SubmissionGoogleSolarDataForTable | null;
  // Add formatted fields
  monthlyElectricityBillAmountFormatted?: string | null;
  averageKwhConsumptionFormatted?: string | null;
  totalCostFormatted?: string | null;
  firstYearSavingsFormatted?: string | null;
  lifetimeSavingsFormatted?: string | null;
  // New fields for detailed PDF
  priceKWUsed?: number | null;
  baseInstallationCost?: number | null;
  selectedPanelName?: string | null;
  selectedInverterName?: string | null;
  selectedInverterPeakPower?: number | null;
  costBreakdown?: Record<string, number | null>;
  ivaAmount?: number | null;
  totalCostWithIva?: number | null;
}

interface SubmissionsTableProps {
  submissions: SubmissionForTableDisplay[]
  currentPage: number
  totalPages: number
  pageSize: number
  total: number
}

// Mapped props removed as we now generate on server

export default function SubmissionsTable({ submissions, currentPage, totalPages, pageSize, total }: SubmissionsTableProps) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // For optimistic delete, keep a set of deleted IDs
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const displayedSubmissions = submissions.filter(s => !deletedIds.has(s.id));

  const deleteSubmission = (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este envío?")) {
      setDeletedIds(prev => new Set(prev).add(id));
      // TODO: Implement actual deletion via API call
      console.log("Simulated deletion of submission with ID:", id);
    }
  }

  function handlePageChange(page: number) {
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (page > 1) {
      params.set("page", String(page));
    } else {
      params.delete("page");
    }
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="rounded-md border p-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha de Envío</TableHead>
            <TableHead>Dirección</TableHead>
            <TableHead>Nombre Cliente</TableHead>
            <TableHead>Email Cliente</TableHead>
            <TableHead>Teléfono Cliente</TableHead>
            <TableHead>Consumo (kWh/mes)</TableHead>
            <TableHead>Dominio Origen</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayedSubmissions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                No se encontraron envíos.
              </TableCell>
            </TableRow>
          ) : (
            displayedSubmissions.map((submission) => (
              <TableRow key={submission.id}>
                <TableCell className="font-medium">
                  {new Date(submission.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>{submission.address}</TableCell>
                <TableCell>{submission.userName || "N/A"}</TableCell>
                <TableCell>{submission.userEmail || "N/A"}</TableCell>
                <TableCell>{submission.userPhone || "N/A"}</TableCell>
                <TableCell>
                  {/* Prefer direct field from submission, fallback to googleSolarData if necessary */}
                  {submission.averageKwhConsumption?.toString() ?? submission.googleSolarData?.averageKwhConsumption?.toString() ?? "N/A"}
                </TableCell>
                <TableCell>{submission.origin || "N/A"}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menú</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <Link href={`/results/${submission.id}`}>
                        <DropdownMenuItem asChild>
                          <div>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Resultados
                          </div>
                        </DropdownMenuItem>
                      </Link>
                      <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
                        <div className="flex w-full items-center">
                          <PdfDownloadButton
                            id={submission.id}
                            fileName={`resultado-solar-${submission.id.substring(0, 8)}.pdf`}
                          />
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => deleteSubmission(submission.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-4 py-3 border-t bg-muted">
        <div className="text-sm text-muted-foreground">
          Mostrando {displayedSubmissions.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
          -{(currentPage - 1) * pageSize + displayedSubmissions.length} de {total} envíos
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label="Página anterior"
          >
            Anterior
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
            <Button
              key={pageNum}
              variant={pageNum === currentPage ? "default" : "outline"}
              size="sm"
              onClick={() => handlePageChange(pageNum)}
              aria-current={pageNum === currentPage ? "page" : undefined}
            >
              {pageNum}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            aria-label="Página siguiente"
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  )
}
