import type React from "react"
import { Inter } from "next/font/google"
import type { Metadata } from "next"
import { Providers } from "./providers"
import "./globals.css"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Wattify - Calculadora de Energía Solar",
  description: "Calcula el potencial solar de tu techo y ahorra en tu factura de energía",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  )
}
