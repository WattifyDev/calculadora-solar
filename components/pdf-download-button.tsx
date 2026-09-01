"use client";

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PdfDownloadButtonProps {
    id: string; // The submission ID
    fileName: string;
}

/**
 * [OPTIMIZACIÓN DE RENDIMIENTO]
 * Este componente ya no importa @react-pdf/renderer ni SubmissionPDF en el cliente.
 * Al mover la generación del PDF al servidor vía /api/pdf/[id], el bundle del frontend
 * se reduce en aproximadamente 1.2MB (sin comprimir).
 */
export default function PdfDownloadButton({ id }: PdfDownloadButtonProps) {
    const handleDownload = () => {
        // Redirigir a la ruta de la API para descargar el PDF generado en el servidor
        window.location.href = `/api/pdf/${id}`;
    };

    return (
        <Button variant="outline" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Descargar PDF
        </Button>
    );
}