"use client"

import { useTransition, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { sendResultsByEmail } from "@/lib/actions"
import { useFormStatus } from "react-dom"

// Initial state for the form
const initialState = {
  success: false,
  error: null as string | null,
}

interface EmailResultsFormProps {
  submissionId: string
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={pending}>
      {pending ? "Enviando..." : "Enviar Resultados a Mi Email"}
    </Button>
  )
}

export default function EmailResultsForm({ submissionId }: EmailResultsFormProps) {
  const [isPending, startTransition] = useTransition()
  const [state, setState] = useState(initialState)

  // Create a server action that includes the submissionId
  async function handleSubmit(formData: FormData) {
    setState({ success: false, error: null })

    try {
      const name = formData.get("name") as string
      const email = formData.get("email") as string
      const phone = (formData.get("phone") as string) || undefined
      const consent = formData.get("consent") === "on"

      // Validate form data
      if (!name || name.length < 2) {
        setState({ success: false, error: "El nombre debe tener al menos 2 caracteres" })
        return
      }

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setState({ success: false, error: "Por favor ingresa una dirección de correo electrónico válida" })
        return
      }

      if (!consent) {
        setState({ success: false, error: "Debes aceptar recibir información sobre soluciones solares" })
        return
      }

      // Submit the form data
      const success = await sendResultsByEmail(submissionId, {
        name,
        email,
        phone,
        consent,
      })

      if (success) {
        // Show success toast
        startTransition(() => {
          toast.success("Los resultados de tu potencial solar han sido enviados a tu correo electrónico.")
        })
        setState({ success: true, error: null })
      } else {
        setState({ success: false, error: "Hubo un error al enviar tus resultados. Por favor intenta de nuevo." })
      }
    } catch (error) {
      setState({ success: false, error: "Error al enviar el email. Por favor intenta de nuevo." })
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre Completo</Label>
        <Input
          id="name"
          name="name"
          placeholder="Juan Pérez"
          minLength={2}
          required
          disabled={isPending || state.success}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Correo Electrónico</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="juan@ejemplo.com"
          required
          disabled={isPending || state.success}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Teléfono (Opcional)</Label>
        <Input id="phone" name="phone" placeholder="+57 123 456 7890" disabled={isPending || state.success} />
      </div>

      <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
        <Checkbox id="consent" name="consent" required disabled={isPending || state.success} />
        <div className="space-y-1 leading-none">
          <Label htmlFor="consent">Acepto recibir información sobre soluciones solares</Label>
          <p className="text-sm text-gray-500">
            Al marcar esta casilla, aceptas permitirnos contactarte con información sobre instalaciones de paneles
            solares y servicios relacionados.
          </p>
        </div>
      </div>

      {state.error && <p className="text-sm text-red-500">{state.error}</p>}

      {state.success ? (
        <div className="rounded-md bg-green-50 p-4 text-green-700">
          <p className="font-medium">¡Email enviado correctamente!</p>
          <p className="text-sm">Revisa tu bandeja de entrada para ver los resultados.</p>
        </div>
      ) : (
        <SubmitButton />
      )}
    </form>
  )
}
