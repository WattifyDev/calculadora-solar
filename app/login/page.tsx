"use client"

import { useActionState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { login } from "@/lib/actions/auth"

const initialState = { errors: {}, data: {} }

function SubmitButton({ isPending }: { isPending: boolean }) {
  return (
    <Button
      type="submit"
      className="w-full h-11 text-lg"
      aria-disabled={isPending}
      disabled={isPending}
    >
      {isPending ? "Iniciando sesión..." : "Iniciar sesión"}
    </Button>
  )
}

export default function LoginPage() {
  const [state, dispatch, isPending] = useActionState(login, initialState)

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-green-100 p-4">
      <Card className="mx-auto w-full max-w-lg shadow-lg">
        <CardHeader className="space-y-4 px-8 pt-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <Image
              src="/wattifylogo.png"
              alt="Wattify Logo"
              width={200}
              height={100}
              className=""
            />
            <CardTitle className="text-3xl font-bold text-gray-800">Iniciar Sesión</CardTitle>
            <p className="text-gray-600">Accede a tu cuenta de Wattify</p>
          </div>
        </CardHeader>
        <form action={dispatch}>
          <CardContent className="space-y-6 px-8">
            {state?.error && (
              <p className="text-sm text-destructive text-center bg-destructive/10 p-3 rounded-md">
                {state.error}
              </p>
            )}
            <div className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="email" className="text-gray-700">Correo electrónico</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={state?.data?.email}
                  className={state?.errors?.email ? "border-destructive" : ""}
                  aria-describedby={state?.errors?.email ? "email-error" : undefined}
                  placeholder="tu@email.com"
                  required
                />
                {state?.errors?.email && (
                  <p id="email-error" className="text-sm text-destructive">
                    {state.errors.email[0]}
                  </p>
                )}
              </div>
              <div className="space-y-3">

                <Input
                  id="password"
                  name="password"
                  type="password"
                  defaultValue={state?.data?.password}
                  className={state?.errors?.password ? "border-destructive" : ""}
                  aria-describedby={state?.errors?.password ? "password-error" : undefined}
                  required
                />
                {state?.errors?.password && (
                  <p id="password-error" className="text-sm text-destructive">
                    {state.errors.password[0]}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col px-8 pb-8 gap-4">
            <SubmitButton isPending={isPending} />

          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

