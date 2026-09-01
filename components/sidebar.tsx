"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Info, Send, LinkIcon, LayoutDashboard, LogIn, Menu, X, Package, LogOut, Settings, Plus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { logout } from "@/lib/user"
import { useRouter } from "next/navigation"
import Image from "next/image"

interface SidebarProps {
  className?: string
  userRole?: string
}

export function Sidebar({ className, userRole }: SidebarProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const routes = [
    {
      label: "Panel de Control",
      icon: LayoutDashboard,
      href: "/dashboard",
      active: pathname === "/dashboard",
    },
    {
      label: "Envíos",
      icon: Send,
      href: "/dashboard/submissions",
      active: pathname === "/dashboard/submissions",
    },
    {
      label: "Materiales",
      icon: Package,
      href: "/dashboard/materials",
      active: pathname === "/dashboard/materials",
    },
    {
      label: "Integraciones",
      icon: LinkIcon,
      href: "/dashboard/embed",
      active: pathname === "/dashboard/embed",
    },
    {
      label: "Configuración",
      icon: Settings,
      href: "/dashboard/settings",
      active: pathname === "/dashboard/settings",
    },
    ...(userRole === "ADMIN" ? [
      {
        label: "Usuarios",
        icon: Users,
        href: "/dashboard/users",
        active: pathname === "/dashboard/users",
      },

    ] : []),
    {
      label: "Manual de usuario",
      icon: Info,
      href: "/dashboard/about",
      active: pathname === "/dashboard/about",
    },
  ]

  const handleLogout = async () => {
    await logout() // Clean up session
    history.pushState(null, "", "login")
  }

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menú</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0" style={{
          backgroundColor: 'var(--sidebar)',
          color: 'var(--sidebar-foreground)'
        }}>
          <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
          <div className="flex flex-col h-full">
            <div className="flex items-center px-6 border-b" style={{ borderColor: 'var(--sidebar-border)' }}>
              <div className="flex items-center justify-center py-4">
                <Image
                  priority
                  src="/wattifylogo.png"
                  alt="Wattify"
                  width={150}
                  height={150}
                  style={{ maxHeight: '100%', width: 'auto' }}
                  className="object-contain"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Cerrar menú</span>
              </Button>
            </div>
            <div className="flex-1 overflow-auto py-6">
              <nav className="grid gap-2 px-6">
                {routes.map((route) => (
                  <Link
                    key={route.href}
                    href={route.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                      route.active
                        ? "bg-green-50 text-green-600"
                        : "text-gray-600 hover:bg-green-50 hover:text-green-600"
                    )}
                  >
                    <route.icon className="h-5 w-5" />
                    {route.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="mt-auto p-6 border-t" style={{ borderColor: 'var(--sidebar-border)' }}>
              <Link href="/login">
                <Button variant="outline" className="w-full gap-2 justify-start">
                  <LogIn className="h-4 w-4" />
                  Iniciar sesión
                </Button>
              </Link>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <div
        className={cn(
          "hidden border-r md:flex md:w-72 md:flex-col md:fixed md:inset-y-0",
          className
        )}
        style={{
          backgroundColor: 'var(--sidebar)',
          color: 'var(--sidebar-foreground)',
          borderColor: 'var(--sidebar-border)'
        }}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center border-b px-8" style={{ borderColor: 'var(--sidebar-border)' }}>
            <Link href="/" className="flex items-center w-full">
              <Image
                priority
                src="/wattifylogo.png"
                alt="Wattify"
                width={150}
                height={150}
                className="object-cover"
              />
            </Link>
          </div>
          <div className="flex-1 overflow-auto py-6">
            <nav className="grid gap-2 px-6">
              {routes.map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                    route.active
                      ? "bg-green-50 text-green-600"
                      : "text-gray-600 hover:bg-green-50 hover:text-green-600"
                  )}
                >
                  <route.icon className="h-5 w-5" />
                  {route.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="mt-auto p-6 border-t" style={{ borderColor: 'var(--sidebar-border)' }}>
            <div className="p-4 border-t border-border">
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 hover:bg-accent-foreground hover:text-primary-foreground"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
