export interface SolarFinancialParams {
    monthlyKWhEnergyConsumption: number;
    yearlyEnergyDcKwh: number; // From SolarPanelConfig
    panelsCount: number; // From SolarPanelConfig
    panelCapacityWatts: number; // From SolarPotential, e.g., 250W
}

export interface FinancialConstants {
    costIncreaseFactor: number; // e.g., 1.022 (2.2% annual increase)
    dcToAcDerate: number; // e.g., 0.85 (85% efficiency)
    discountRate: number; // e.g., 1.04 (4% discount rate)
    efficiencyDepreciationFactor: number; // e.g., 0.995 (0.5% annual decrease)
    installationLifeSpan: number; // e.g., 20 years
    incentives: number; // Monetary amount
    averagePricePerKWh: number; // e.g., 0.20 EUR for Spain
    installationCostPerKw: number; // e.g., 1600 EUR per kWp for Spain
}

// Default constants for Spain (can be adjusted)
export const DEFAULT_FINANCIAL_CONSTANTS_ES: FinancialConstants = {
    costIncreaseFactor: 1.022,
    dcToAcDerate: 0.95,
    discountRate: 1.04,
    efficiencyDepreciationFactor: 0.995,
    installationLifeSpan: 20,
    incentives: 0, // Assuming no specific incentives for now
    averagePricePerKWh: 0.20, // Average electricity price in Spain (EUR/kWh) - updated for 2024
    installationCostPerKw: 1200, // Average installation cost in Spain (EUR/kWp) - updated for 2024 market
};

// Default constants for Colombia (base EUR values for conversion)
const DEFAULT_FINANCIAL_CONSTANTS_CO_EUR: Omit<FinancialConstants, 'averagePricePerKWh' | 'installationCostPerKw'> = {
    costIncreaseFactor: 1.022, // 2.2% annual increase
    dcToAcDerate: 0.95, // 95% efficiency
    discountRate: 1.04, // 4% discount rate
    efficiencyDepreciationFactor: 0.995, // 0.5% annual decrease
    installationLifeSpan: 20, // 20 years
    incentives: 0, // No direct incentives modeled for now
};

// Static fallback constants for Colombia (COP values)
export const DEFAULT_FINANCIAL_CONSTANTS_CO: FinancialConstants = {
    ...DEFAULT_FINANCIAL_CONSTANTS_CO_EUR,
    averagePricePerKWh: 986, // Fallback: Average electricity price in Colombia (COP/kWh, equivalent to ~0.21 EUR)
    installationCostPerKw: 6500000, // Fallback: Average installation cost in Colombia (COP/kWp)
};

// Static fallback constants for Guatemala (GTQ values)
export const DEFAULT_FINANCIAL_CONSTANTS_GT: FinancialConstants = {
    costIncreaseFactor: 1.022, // 2.2% annual increase
    dcToAcDerate: 0.95, // 95% efficiency
    discountRate: 1.04, // 4% discount rate
    efficiencyDepreciationFactor: 0.995, // 0.5% annual decrease
    installationLifeSpan: 20, // 20 years
    incentives: 0,
    averagePricePerKWh: 1.60, // Average electricity price in Guatemala (GTQ/kWh)
    installationCostPerKw: 11000, // Average installation cost in Guatemala (GTQ/kWp)
};

/**
 * Creates dynamic financial constants for Colombia using current EUR to COP exchange rate
 * Falls back to static values if exchange rate fetch fails
 */
export async function getColombianFinancialConstants(): Promise<FinancialConstants> {
    try {
        const { convertEurToCop } = await import('./currency');

        // Convert EUR base values to COP
        const averagePricePerKWh = await convertEurToCop(0.21); // 0.21 EUR/kWh
        const installationCostPerKw = await convertEurToCop(1400); // 1400 EUR/kWp

        return {
            ...DEFAULT_FINANCIAL_CONSTANTS_CO_EUR,
            averagePricePerKWh: Math.round(averagePricePerKWh),
            installationCostPerKw: Math.round(installationCostPerKw),
        };
    } catch (error) {
        console.error('[FINANCIAL] Error getting dynamic Colombian constants, using fallback:', error);
        return DEFAULT_FINANCIAL_CONSTANTS_CO;
    }
}

/**
 * Creates dynamic financial constants for Guatemala using current EUR to GTQ exchange rate
 */
export async function getGuatemalanFinancialConstants(): Promise<FinancialConstants> {
    try {
        const { convertEurToGtq } = await import('./currency');

        const averagePricePerKWh = await convertEurToGtq(0.18); // ~0.18 EUR/kWh equivalent
        const installationCostPerKw = await convertEurToGtq(1250); // ~1250 EUR/kWp equivalent

        return {
            ...DEFAULT_FINANCIAL_CONSTANTS_CO_EUR,
            averagePricePerKWh: +averagePricePerKWh.toFixed(2),
            installationCostPerKw: Math.round(installationCostPerKw),
        };
    } catch (error) {
        console.error('[FINANCIAL] Error getting dynamic Guatemalan constants, using fallback:', error);
        return DEFAULT_FINANCIAL_CONSTANTS_GT;
    }
}

// --- Models ---

/**
 * Calculates the cost of electricity for a given amount of kWh.
 * @param kWh - Kilowatt-hours consumed.
 * @param constants - Financial constants including averagePricePerKWh.
 * @returns Cost in local currency.
 */
function billCostModel(kWh: number, constants: FinancialConstants): number {
    return kWh * constants.averagePricePerKWh;
}

/**
 * Estimates the installation cost for a given installation size.
 * @param installationSizeKW - Installation size in kilowatts.
 * @param constants - Financial constants including installationCostPerKw.
 * @returns Cost in local currency.
 */
function installationCostModel(installationSizeKW: number, constants: FinancialConstants): number {
    return installationSizeKW * constants.installationCostPerKw;
}

// --- Core Calculation Steps ---

/**
 * 1. Calculate annual kWh energy consumption.
 */
export function calculateAnnualKWhEnergyConsumption(monthlyKWhEnergyConsumption: number): number {
    return monthlyKWhEnergyConsumption * 12;
}

/**
 * 2. Calculate annual AC energy production from solar.
 * initialAcKwhPerYear = yearlyEnergyDcKwh × dcToAcDerate
 */
export function calculateInitialAcKwhPerYear(yearlyEnergyDcKwh: number, constants: FinancialConstants): number {
    return yearlyEnergyDcKwh * constants.dcToAcDerate;
}

/**
 * Helper to calculate annual production for a specific year, considering efficiency depreciation.
 */
function calculateAnnualProduction(initialAcKwhPerYear: number, yearIndex: number, constants: FinancialConstants): number {
    if (yearIndex === 0) { // First year (index 0)
        return initialAcKwhPerYear;
    }
    return initialAcKwhPerYear * Math.pow(constants.efficiencyDepreciationFactor, yearIndex);
}


/**
 * 3. Calculate lifetime AC energy production from solar.
 * LifetimeProductionAcKwh = (initialAcKwhPerYear * (1 - pow(efficiencyDepreciationFactor, installationLifeSpan)) / (1 - efficiencyDepreciationFactor))
 * Note: The formula from docs had dcToAcDerate * yearlyEnergyDcKwh which is initialAcKwhPerYear.
 */
export function calculateLifetimeProductionAcKwh(initialAcKwhPerYear: number, constants: FinancialConstants): number {
    if (constants.efficiencyDepreciationFactor === 1) { // Avoid division by zero if no depreciation
        return initialAcKwhPerYear * constants.installationLifeSpan;
    }
    return (
        initialAcKwhPerYear *
        (1 - Math.pow(constants.efficiencyDepreciationFactor, constants.installationLifeSpan)) /
        (1 - constants.efficiencyDepreciationFactor)
    );
}

/**
 * 4. Calculate remaining lifetime utility bill with solar.
 */
export function calculateRemainingLifetimeUtilityBill(
    annualKWhEnergyConsumption: number,
    initialAcKwhPerYear: number,
    constants: FinancialConstants
): number {
    let totalBill = 0;
    for (let year = 0; year < constants.installationLifeSpan; year++) {
        const solarProductionThisYear = calculateAnnualProduction(initialAcKwhPerYear, year, constants);
        const kwhFromGrid = Math.max(0, annualKWhEnergyConsumption - solarProductionThisYear);
        const billThisYear = billCostModel(kwhFromGrid, constants);
        totalBill += billThisYear * Math.pow(constants.costIncreaseFactor, year) / Math.pow(constants.discountRate, year);
    }
    return totalBill;
}

/**
 * 5. Calculate lifetime utility bill without solar.
 */
export function calculateCostOfElectricityWithoutSolar(
    annualKWhEnergyConsumption: number,
    constants: FinancialConstants
): number {
    const annualBillWithoutSolar = billCostModel(annualKWhEnergyConsumption, constants);
    if (constants.costIncreaseFactor / constants.discountRate === 1) { // Avoid division by zero
        return annualBillWithoutSolar * constants.installationLifeSpan;
    }
    return (
        annualBillWithoutSolar *
        (1 - Math.pow(constants.costIncreaseFactor / constants.discountRate, constants.installationLifeSpan)) /
        (1 - (constants.costIncreaseFactor / constants.discountRate))
    );
}

/**
 * 6. Calculate installation cost.
 * installationSize = panelsCount * panelCapacityWatts / 1000 kW
 * installationCost = localInstallationCostModel(installationSize)
 */
export function calculateInstallationSizeKW(panelsCount: number, panelCapacityWatts: number): number {
    return (panelsCount * panelCapacityWatts) / 1000;
}

export function calculateInstallationCost(installationSizeKW: number, constants: FinancialConstants): number {
    return installationCostModel(installationSizeKW, constants);
}

/**
 * 7. Calculate total cost with solar.
 * totalCostWithSolar = installationCost + remainingLifetimeUtilityBill - incentives
 */
export function calculateTotalCostWithSolar(
    installationCost: number,
    remainingLifetimeUtilityBill: number,
    constants: FinancialConstants
): number {
    return installationCost + remainingLifetimeUtilityBill - constants.incentives;
}

/**
 * 8. Calculate total savings with solar.
 * savings = costOfElectricityWithoutSolar - totalCostWithSolar
 */
export function calculateTotalSavings(
    costOfElectricityWithoutSolar: number,
    totalCostWithSolar: number
): number {
    return costOfElectricityWithoutSolar - totalCostWithSolar;
}

/**
 * Calculate Payback Years.
 * PaybackYears = InstallationCost / AnnualNetSavingsInFirstYear
 * AnnualNetSavingsInFirstYear = (BillWithoutSolarFirstYear - BillWithSolarFirstYear) - (AnnualizedIncentives if any)
 * BillWithoutSolarFirstYear = billCostModel(annualKWhEnergyConsumption, constants)
 * BillWithSolarFirstYear = billCostModel(annualKWhEnergyConsumption - initialAcKwhPerYear, constants)
 */
export function calculatePaybackYears(
    installationCost: number,
    annualKWhEnergyConsumption: number,
    initialAcKwhPerYear: number,
    constants: FinancialConstants
): number | null {
    const effectiveInstallationCost = installationCost - constants.incentives;
    let cumulativeSavings = 0;
    for (let year = 0; year < constants.installationLifeSpan; year++) {
        // Calculate production for this year
        const solarProductionThisYear = calculateAnnualProduction(initialAcKwhPerYear, year, constants);
        const kwhFromGrid = Math.max(0, annualKWhEnergyConsumption - solarProductionThisYear);
        const billWithoutSolar = billCostModel(annualKWhEnergyConsumption, constants) * Math.pow(constants.costIncreaseFactor, year) / Math.pow(constants.discountRate, year);
        const billWithSolar = billCostModel(kwhFromGrid, constants) * Math.pow(constants.costIncreaseFactor, year) / Math.pow(constants.discountRate, year);
        const netSavings = billWithoutSolar - billWithSolar;
        cumulativeSavings += netSavings;
        if (cumulativeSavings >= effectiveInstallationCost) {
            // Guard against division by zero
            if (netSavings <= 0) return year + 1;

            // Interpolate for more precise year fraction
            const prevCumulative = cumulativeSavings - netSavings;
            const fraction = (effectiveInstallationCost - prevCumulative) / netSavings;
            return +(year + fraction + 1).toFixed(1); // +1 because year is zero-based
        }
    }
    return null; // Never paid back within lifespan
}

export interface DetailedFinancialAnalysis {
    panelsCount: number;
    yearlyEnergyDcKwh: number;
    initialAcKwhPerYear: number;
    installationSizeKW: number;
    installationCost: number;
    lifetimeProductionAcKwh: number;
    remainingLifetimeUtilityBill: number;
    totalCostWithSolar: number;
    costOfElectricityWithoutSolar: number; // For reference, calculated once
    totalLifetimeSavings: number;
    annualSavings?: number; // totalLifetimeSavings / lifespan
    paybackYears?: number | null;
}

/**
 * Calculates the Spanish solar incentive as per IRPF and additional deduction rules.
 * IRPF allows a 40% deduction on the tax base, but this translates to approximately
 * 20% effective savings considering typical tax rates, caps, and actual implementation.
 *
 * @param projectPrice The total price of the project (installation cost before incentives).
 * @returns The total incentive amount to be subtracted from the project price.
 */
export function calculateSpanishIncentive(projectPrice: number): number {
    if (!projectPrice || projectPrice <= 0) return 0;

    // Conservative incentive: 20% of project price (considering IRPF effective rates, caps, and real-world limitations)
    const effectiveIncentivePercentage = 0.20;
    return projectPrice * effectiveIncentivePercentage;
}

export { calculateAnnualProduction, billCostModel }; 