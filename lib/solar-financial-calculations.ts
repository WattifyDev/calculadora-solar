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

// --- Models & Advanced Financial Tiering ---

/**
 * Tiered installation cost per kWp based on system peak power (Economy of Scale)
 * Rates in EUR base:
 * - <= 3 kWp: 1450 EUR/kWp
 * - > 3 and <= 7 kWp: 1200 EUR/kWp
 * - > 7 and <= 25 kWp: 980 EUR/kWp
 * - > 25 and <= 50 kWp: 850 EUR/kWp
 * - > 50 kWp: 750 EUR/kWp
 */
export function getBaseInstallationCostPerKwTier(systemSizeKW: number): number {
    if (systemSizeKW <= 3) return 1450;
    if (systemSizeKW <= 7) return 1200;
    if (systemSizeKW <= 25) return 980;
    if (systemSizeKW <= 50) return 850;
    return 750;
}

/**
 * Returns the effective price per kWp in local currency considering tiered economy of scale
 */
export async function getTieredInstallationPricePerKw(
    systemSizeKW: number,
    country: 'spain' | 'colombia' | 'guatemala'
): Promise<number> {
    const baseEurPerKw = getBaseInstallationCostPerKwTier(systemSizeKW);
    if (country === 'spain') {
        return baseEurPerKw;
    }
    if (country === 'colombia') {
        const { convertEurToCop } = await import('./currency');
        const cop = await convertEurToCop(baseEurPerKw);
        return Math.round(cop);
    }
    if (country === 'guatemala') {
        const { convertEurToGtq } = await import('./currency');
        const gtq = await convertEurToGtq(baseEurPerKw);
        return Math.round(gtq);
    }
    return baseEurPerKw;
}

export interface BatteryConfig {
    hasBattery: boolean;
    batteryCapacityKWh: number;
    batteryCost: number; // In local currency
    batteryTypeDescription: string;
    unitCount: number;
}

/**
 * Calculates battery specification and pricing based on:
 * - Systems <= 25 kWp: 5 kWh modules @ 2850 EUR each
 * - Systems > 25 kWp: 50 kWh cabinets @ 12000 EUR each
 */
export async function calculateBatteryRequirement(
    systemSizeKW: number,
    country: 'spain' | 'colombia' | 'guatemala',
    currency: 'EUR' | 'COP' | 'GTQ' = 'EUR'
): Promise<BatteryConfig> {
    let unitCount = 1;
    let batteryCapacityKWh = 5;
    let baseCostEur = 2850;
    let batteryTypeDescription = '';

    if (systemSizeKW <= 25) {
        // Modular 5 kWh packs @ 2850 EUR
        if (systemSizeKW <= 4) {
            unitCount = 1; // 5 kWh
        } else if (systemSizeKW <= 10) {
            unitCount = 2; // 10 kWh
        } else if (systemSizeKW <= 18) {
            unitCount = 3; // 15 kWh
        } else {
            unitCount = 4; // 20 kWh
        }
        batteryCapacityKWh = unitCount * 5;
        baseCostEur = unitCount * 2850;
        batteryTypeDescription = `${unitCount} x Batería modular Litio 5 kWh (${batteryCapacityKWh} kWh totales)`;
    } else {
        // Commercial / Industrial Cabinets of 50 kWh @ 12000 EUR
        unitCount = Math.max(1, Math.ceil(systemSizeKW / 50));
        batteryCapacityKWh = unitCount * 50;
        baseCostEur = unitCount * 12000;
        batteryTypeDescription = `${unitCount} x Cabinet Industrial 50 kWh (${batteryCapacityKWh} kWh totales)`;
    }

    let finalCost = baseCostEur;
    if (country === 'colombia' || currency === 'COP') {
        const { convertEurToCop } = await import('./currency');
        finalCost = Math.round(await convertEurToCop(baseCostEur));
    } else if (country === 'guatemala' || currency === 'GTQ') {
        const { convertEurToGtq } = await import('./currency');
        finalCost = Math.round(await convertEurToGtq(baseCostEur));
    }

    return {
        hasBattery: true,
        batteryCapacityKWh,
        batteryCost: finalCost,
        batteryTypeDescription,
        unitCount,
    };
}

/**
 * Advanced annual savings calculation accounting for direct self-consumption and surplus compensation
 * - Without battery: ~50% direct self-consumption, remaining surplus rewarded at 35% of retail price
 * - With battery: ~85% self-consumption, remaining surplus rewarded at 35% of retail price
 */
export function calculateAdvancedAnnualSavings(
    annualProductionKWh: number,
    annualConsumptionKWh: number,
    pricePerKWh: number,
    hasBattery: boolean = false
): {
    annualSavings: number;
    selfConsumptionKWh: number;
    surplusKWh: number;
    directSavings: number;
    surplusCompensation: number;
    selfConsumptionRatio: number;
} {
    const surplusPrice = pricePerKWh * 0.35; // Surplus compensated at 35% of retail rate
    const selfConsumptionRatio = hasBattery ? 0.85 : 0.50; // 85% with battery, 50% without

    // Maximum solar that can substitute consumption
    const theoreticalOffset = Math.min(annualProductionKWh, annualConsumptionKWh);
    const selfConsumptionKWh = theoreticalOffset * selfConsumptionRatio;
    const surplusKWh = Math.max(0, annualProductionKWh - selfConsumptionKWh);

    const directSavings = selfConsumptionKWh * pricePerKWh;
    const surplusCompensation = surplusKWh * surplusPrice;
    const annualSavings = Math.round(directSavings + surplusCompensation);

    return {
        annualSavings,
        selfConsumptionKWh: Math.round(selfConsumptionKWh),
        surplusKWh: Math.round(surplusKWh),
        directSavings: Math.round(directSavings),
        surplusCompensation: Math.round(surplusCompensation),
        selfConsumptionRatio,
    };
}

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