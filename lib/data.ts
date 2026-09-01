import { prisma } from "@/lib/db"
import { getUser } from "@/lib/user"
import type { SolarResults, UserSubmission, GoogleSolarData } from "./types"

// Mock data for solar results
export async function getSolarResults(id: string): Promise<any> {
  const submission = await prisma.submission.findUnique({
    where: { id },
  })

  if (!submission) {
    return null
  }

  // Helper to format currency, assuming amounts are in cents if not specified otherwise by currencyCode
  // For now, we'll assume the googleSolarData fields are direct amounts (not in cents)
  const formatCurrency = (amount: number | null | undefined, currency: string | null | undefined) => {
    if (amount == null || currency == null) return "N/A";
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency }).format(amount);
  };

  const currency = submission.currencyCode;

  // Parse costBreakdownJson if present
  let costBreakdown = undefined;
  if (submission.costBreakdownJson) {
    if (typeof submission.costBreakdownJson === 'string') {
      try {
        costBreakdown = JSON.parse(submission.costBreakdownJson);
      } catch {
        costBreakdown = undefined;
      }
    } else {
      costBreakdown = submission.costBreakdownJson;
    }
  }

  return {
    id: submission.id,
    createdAt: submission.createdAt,
    address: submission.address,
    city: submission.city || "",
    country: submission.country,
    userName: submission.userName || '',
    userEmail: submission.userEmail || '',
    userPhone: submission.userPhone || '',
    // Installation details
    averageKwhConsumption: submission.averageKwhConsumption ?? null,
    monthlyElectricityBillAmount: submission.monthlyElectricityBillAmount ?? null,
    panelCount: submission.panelCount ?? null,
    yearlyEnergyDcKwh: (submission.googleSolarData as any)?.yearlyEnergyDcKwh ?? null,
    installationSizeKW: submission.systemSize ?? null,
    priceKWUsed: submission.priceKWUsed ?? null,
    precioFinal: submission.totalCost ?? null,
    selectedPanelName: submission.selectedPanelName ?? null,
    selectedInverterName: submission.selectedInverterName ?? null,
    selectedInverterPeakPower: submission.selectedInverterPeakPower ?? null,
    // Cost breakdown
    costBreakdown: costBreakdown ?? {},
    ivaAmount: submission.ivaAmount ?? null,
    totalCostWithIva: submission.totalCostWithIva ?? null,
    // Financial analysis
    totalCost: submission.totalCost ?? null,
    firstYearSavings: submission.firstYearSavings ?? null,
    lifetimeSavings: submission.lifetimeSavings ?? null,
    paybackYears: submission.paybackYears ?? null,
    currencyCode: currency,
    // Constants
    constants: {
      'Precio medio electricidad (€/kWh)': 0.2,
      'Coste instalación por kWp': 1200,
      'Años de vida útil': 20,
    },
    // Incentive note
    incentiveNote: 'En esta propuesta se ha incluido la bonificación derivada de la instalación de paneles solares del IRPF y que consiste en un 40% del precio del proyecto que se reducirá de la base imponible del cliente. Hemos tenido en cuenta un 30%.',
    // Orthophoto fields
    orthophotoUrl: submission.orthophotoUrl ?? null,
    orthophotoBase64: submission.orthophotoBase64 ?? null,
    // Footer
    // id and createdAt already included
  }
}

// Mock data for user submissions
export async function getUserSubmissions({ page = 1, pageSize = 10 }: { page?: number, pageSize?: number } = {}) {
  const user = await getUser();
  if (!user) return { submissions: [], total: 0 };

  // If admin, show all submissions
  const isAdmin = user.role === "ADMIN";

  const where = isAdmin ? undefined : {
    OR: user.domain ? [
      { origin: user.domain },
      { origin: `http://${user.domain}` },
      { origin: `https://${user.domain}` },
      { origin: `http://www.${user.domain}` },
      { origin: `https://www.${user.domain}` }
    ] : [
      { origin: null }
    ]
  };

  let total = 0;
  let submissions: any[] = [];

  try {
    total = await prisma.submission.count({ where });

    submissions = await prisma.submission.findMany({
      orderBy: { createdAt: 'desc' },
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        createdAt: true,
        address: true,
      city: true,
      country: true, // Add the missing country field
      userName: true,
      userEmail: true,
      userPhone: true,
      origin: true,
      pathname: true,
      googleSolarData: true,
      // Add all the fields we need for the PDF
      totalCost: true,
      systemSize: true,
      panelCount: true,
      firstYearSavings: true,
      lifetimeSavings: true,
      paybackYears: true,
      currencyCode: true,
      monthlyElectricityBillAmount: true,
      averageKwhConsumption: true,
      latitude: true,
      longitude: true,
      annualProduction: true,
      // New fields for detailed PDF
      priceKWUsed: true,
      baseInstallationCost: true,
      selectedPanelName: true,
      selectedInverterName: true,
      selectedInverterPeakPower: true,
      costBreakdownJson: true,
      ivaAmount: true,
      totalCostWithIva: true,
      // Orthophoto fields for PDF - only fetch URL, not the heavy Base64
      orthophotoUrl: true,
      // orthophotoBase64: true, // REMOVED for memory optimization
    }
  });
  } catch (err) {
    console.error("Database connection issue in getUserSubmissions:", err);
  }

  // Helper to format currency
  const formatCurrency = (amount: number | null | undefined, currency: string | null | undefined = 'EUR') => {
    if (amount == null) return null;
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency || 'EUR'
    }).format(amount);
  };

  // Helper to format number with kWh
  const formatKwh = (value: number | null | undefined) => {
    if (value == null) return null;
    return `${value.toLocaleString('es-ES')} kWh`;
  };

  const mapped = submissions.map(submission => {
    const googleSolarData = submission.googleSolarData as any;
    // Parse costBreakdownJson if present
    let costBreakdown = undefined;
    if (submission.costBreakdownJson) {
      if (typeof submission.costBreakdownJson === 'string') {
        try {
          costBreakdown = JSON.parse(submission.costBreakdownJson);
        } catch {
          costBreakdown = undefined;
        }
      } else {
        costBreakdown = submission.costBreakdownJson;
      }
    }
    return {
      ...submission,
      annualProduction: submission.annualProduction ?? null,
      googleSolarData: googleSolarData ? {
        maxSunshineHoursPerYear: googleSolarData.maxSunshineHoursPerYear,
        maxArrayAreaMeters2: googleSolarData.maxArrayAreaMeters2,
        maxArrayPanelsCount: googleSolarData.maxArrayPanelsCount,
        yearlyEnergyDcKwh: googleSolarData.yearlyEnergyDcKwh,
        panelsCount: googleSolarData.panelsCount,
        initialConsumption: googleSolarData.initialConsumption
      } : null,
      // Format the currency values
      monthlyElectricityBillAmountFormatted: formatCurrency(submission.monthlyElectricityBillAmount, submission.currencyCode),
      averageKwhConsumptionFormatted: formatKwh(submission.averageKwhConsumption),
      totalCostFormatted: formatCurrency(submission.totalCost, submission.currencyCode),
      firstYearSavingsFormatted: formatCurrency(submission.firstYearSavings, submission.currencyCode),
      lifetimeSavingsFormatted: formatCurrency(submission.lifetimeSavings, submission.currencyCode),
      // Domain info for display
      domain: submission.origin,
      // New fields for PDF
      priceKWUsed: submission.priceKWUsed ?? null,
      baseInstallationCost: submission.baseInstallationCost ?? null,
      selectedPanelName: submission.selectedPanelName ?? null,
      selectedInverterName: submission.selectedInverterName ?? null,
      selectedInverterPeakPower: submission.selectedInverterPeakPower ?? null,
      costBreakdown: costBreakdown ?? {},
      ivaAmount: submission.ivaAmount ?? null,
      totalCostWithIva: submission.totalCostWithIva ?? null,
      // Orthophoto fields for PDF
      orthophotoUrl: submission.orthophotoUrl ?? null,
      // orthophotoBase64: submission.orthophotoBase64 ?? null, // REMOVED for memory optimization
    };
  });

  return { submissions: mapped, total };
}

// Function to get all users (admin only)
export async function getAllUsers({ page = 1, pageSize = 10 }: { page?: number, pageSize?: number } = {}) {
  const currentUser = await getUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }

  try {
    // Get total count for pagination
    const total = await prisma.user.count();

    const users = await prisma.user.findMany({
      orderBy: { email: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        domain: true,
        priceKW: true,
        priceKWCurrency: true,
        inverterCostPercentage: true,
        installationServicesPercentage: true,
        commissioningLegalizationPercentage: true,
        warrantySupportPercentage: true,
        monitoringToolPercentage: true,
        structureCostPercentage: true,
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        smtpPassword: true, // Include for type compatibility but don't expose actual values
        smtpFrom: true,
        // Don't expose password even to admin
      }
    });

    // Strip out sensitive data for security
    const sanitizedUsers = users.map(user => ({
      ...user,
      smtpPassword: user.smtpPassword ? "******" : null
    }));

    return { users: sanitizedUsers, total };
  } catch (error) {
    console.error("Database connection issue in getAllUsers:", error);
    return { users: [], total: 0 };
  }
}

