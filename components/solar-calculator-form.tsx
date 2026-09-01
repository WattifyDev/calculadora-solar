"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { submitAddress } from "@/lib/actions"
import { useActionState } from "react"

// Define the form state type
type FormState = {
  error: string | null
  submissionId: string | null
}

// Initial state for the form
const initialState: FormState = {
  error: null,
  submissionId: null,
}

export default function SolarCalculatorForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Use React 19's useActionState for form handling
  const [state, formAction] = useActionState(async (prevState: FormState, formData: FormData): Promise<FormState> => {
    try {
      const address = formData.get("address") as string
      const city = formData.get("city") as string
      const postalCode = formData.get("postalCode") as string
      const country = formData.get("country") as string

      // Validate form data
      if (!address || address.length < 5) {
        return { error: "La dirección debe tener al menos 5 caracteres", submissionId: null }
      }

      if (!city || city.length < 2) {
        return { error: "La ciudad debe tener al menos 2 caracteres", submissionId: null }
      }

      if (!postalCode || postalCode.length < 3) {
        return { error: "El código postal debe tener al menos 3 caracteres", submissionId: null }
      }

      if (!country || !["colombia", "spain"].includes(country)) {
        return { error: "Por favor selecciona Colombia o España", submissionId: null }
      }

      // Submit the form data
      const submissionId = await submitAddress({
        address,
        city,
        postalCode,
        country,
      })

      return { error: null, submissionId }
    } catch (error) {
      return { error: "Error al enviar el formulario. Por favor intenta de nuevo.", submissionId: null }
    }
  }, initialState)

  // Navigate to results page when submission is successful
  if (state.submissionId) {
    startTransition(() => {
      router.push(`/results/${state.submissionId}`)
    })
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="country">País</Label>
        <Select name="country" defaultValue="colombia">
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un país" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="colombia">Colombia</SelectItem>
            <SelectItem value="spain">España</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-gray-500">Actualmente, solo admitimos propiedades en Colombia y España.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Dirección</Label>
        <Input id="address" name="address" placeholder="Calle 123" minLength={5} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="city">Ciudad</Label>
        <Input id="city" name="city" placeholder="Ciudad" minLength={2} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="postalCode">Código Postal</Label>
        <Input id="postalCode" name="postalCode" placeholder="Código Postal" minLength={3} required />
      </div>

      {state.error && <p className="text-sm text-red-500">{state.error}</p>}

      <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={isPending}>
        {isPending ? "Calculando..." : "Calcular Potencial Solar"}
      </Button>
    </form>
  )
}
