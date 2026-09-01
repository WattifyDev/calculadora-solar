import { redirect } from "next/navigation"
import { getUser } from "@/lib/user"
import { SignupForm } from "./signup-form"

export default async function SignupPage() {
    const user = await getUser()

    // If user is not an admin, redirect to dashboard
    if (!user || user.role !== "ADMIN") {
        redirect("/dashboard")
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-green-100 p-4">
            <SignupForm />
        </div>
    )
}