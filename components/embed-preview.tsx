"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useActionState } from "react"

// Initial state for the form
const initialState = {
  success: false,
  error: null,
}

// Mock form action for preview
const previewAction = async (prevState: typeof initialState, formData: FormData) => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Always return success for preview
  return { success: true, error: null }
}

export function EmbedPreview() {
  const [isPending, startTransition] = useTransition()
  const [state, formAction] = useActionState(previewAction, initialState)

  return (
    <Card className="border-2 border-dashed border-gray-200">
      <CardHeader className="bg-green-50">
        <CardTitle className="text-center text-green-600">Solar Potential Calculator</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Select name="country" defaultValue="colombia">
              <SelectTrigger>
                <SelectValue placeholder="Select a country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="colombia">Colombia</SelectItem>
                <SelectItem value="spain">Spain</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Street Address</Label>
            <Input id="address" name="address" placeholder="123 Main St" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" placeholder="City" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input id="postalCode" name="postalCode" placeholder="Postal Code" required />
            </div>
          </div>

          <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={isPending}>
            {isPending ? "Calculating..." : "Calculate Solar Potential"}
          </Button>

          {state.success && (
            <div className="text-center text-sm text-gray-500 mt-2">
              This is a preview. In the actual embed, this would calculate solar potential.
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
