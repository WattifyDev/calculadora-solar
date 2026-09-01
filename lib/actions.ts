"use server"

import type { AddressFormData, UserInfoFormData } from "./types"

// Mock server action to submit address
export async function submitAddress(data: AddressFormData): Promise<string> {
  // Validate the data
  if (!data.address || data.address.length < 5) {
    throw new Error("La dirección debe tener al menos 5 caracteres")
  }

  if (!data.city || data.city.length < 2) {
    throw new Error("La ciudad debe tener al menos 2 caracteres")
  }

  if (!data.postalCode || data.postalCode.length < 3) {
    throw new Error("El código postal debe tener al menos 3 caracteres")
  }

  if (!data.country || !["colombia", "spain"].includes(data.country)) {
    throw new Error("Por favor selecciona Colombia o España")
  }

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // In a real app, this would:
  // 1. Validate the address
  // 2. Call the Google Maps API to get coordinates
  // 3. Call the Google Solar API to get solar potential
  // 4. Save the results to the database

  // For now, just return a mock submission ID
  return `sub_${Date.now()}`
}

// Mock server action to send results by email
export async function sendResultsByEmail(submissionId: string, userInfo: UserInfoFormData): Promise<boolean> {
  // Validate the data
  if (!userInfo.name || userInfo.name.length < 2) {
    throw new Error("El nombre debe tener al menos 2 caracteres")
  }

  if (!userInfo.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userInfo.email)) {
    throw new Error("Por favor ingresa una dirección de correo electrónico válida")
  }

  if (!userInfo.consent) {
    throw new Error("Debes aceptar recibir información sobre soluciones solares")
  }

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // In a real app, this would:
  // 1. Get the solar results from the database
  // 2. Save the user info to the database
  // 3. Send an email with the results

  console.log(`Sending results for submission ${submissionId} to ${userInfo.email}`)

  // Always return success for the mock
  return true
}
