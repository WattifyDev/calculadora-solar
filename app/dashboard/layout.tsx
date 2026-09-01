import { DashboardShell } from "@/components/dashboard-shell"
import type { ReactNode } from "react"
import { getUser } from "@/lib/user"
import { redirect } from "next/navigation"

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const user = await getUser()
  if (!user) {
    redirect("/login")
  }
  return <DashboardShell>{children}</DashboardShell>
}
