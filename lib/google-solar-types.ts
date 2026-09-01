export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface LatLngBox {
  sw: LatLng;
  ne: LatLng;
}

export interface Date {
  year: number;
  month: number;
  day: number;
}

export interface SizeAndSunshineStats {
  areaMeters2: number;
  sunshineQuantiles: number[];
  groundAreaMeters2: number;
}

export interface RoofSegmentSizeAndSunshineStats {
  pitchDegrees: number;
  azimuthDegrees: number;
  stats: SizeAndSunshineStats;
  center: LatLng;
  boundingBox: LatLngBox;
  planeHeightAtCenterMeters: number;
}

export interface SolarPanel {
  center: LatLng;
  orientation: 'LANDSCAPE' | 'PORTRAIT';
  segmentIndex: number;
  yearlyEnergyDcKwh: number;
}

export interface RoofSegmentSummary {
  pitchDegrees: number;
  azimuthDegrees: number;
  panelsCount: number;
  yearlyEnergyDcKwh: number;
  segmentIndex: number;
}

export interface SolarPanelConfig {
  panelsCount: number;
  yearlyEnergyDcKwh: number;
  roofSegmentSummaries: RoofSegmentSummary[];
}

export interface SolarPotential {
  maxArrayPanelsCount: number;
  panelCapacityWatts: number;
  panelHeightMeters: number;
  panelWidthMeters: number;
  panelLifetimeYears: number;
  maxArrayAreaMeters2: number;
  maxSunshineHoursPerYear: number;
  carbonOffsetFactorKgPerMwh: number;
  wholeRoofStats: SizeAndSunshineStats;
  buildingStats: SizeAndSunshineStats;
  roofSegmentStats: RoofSegmentSizeAndSunshineStats[];
  solarPanels: SolarPanel[];
  solarPanelConfigs?: SolarPanelConfig[];
  financialAnalyses?: FinancialAnalysis[];
}

export interface Money {
  currencyCode?: string | null;
  units?: string | null; // Typically string, will be parsed to float
  nanos?: number | null;
}

export interface AverageKwhConsumptionDetails {
  kwh?: number | null;
}

export interface SavingsDetails {
  amount?: Money | null; // General savings amount
  savingsYear1?: Money | null;
  savingsYear20?: Money | null; // Specifically for 20 year savings
  // Add other specific savings fields if needed
}

export interface FinancialDetailsData {
  costOfElectricityWithoutSolar?: Money | null;
  installationCost?: Money | null;
  netMeteringAllowed?: boolean | null;
  remainingLifetimeUtilityBill?: Money | null;
  savings?: SavingsDetails | null; // Changed from Money to SavingsDetails
  // Other financial details
}

export interface FinancialAnalysis {
  monthlyBill?: Money | null;
  averageKwhConsumption?: AverageKwhConsumptionDetails | null; // Added averageKwhConsumption
  financialDetails?: FinancialDetailsData | null;
  paybackYears?: number | null; // Added paybackYears
  // Other top-level financial analysis fields
}

export interface BuildingInsightsResponse {
  name: string;
  center: LatLng;
  boundingBox: LatLngBox;
  imageryDate: Date;
  imageryProcessedDate: Date;
  postalCode: string;
  administrativeArea: string;
  statisticalArea: string;
  regionCode: string;
  solarPotential?: SolarPotential;
  financialAnalyses?: FinancialAnalysis[];
  imageryQuality: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface RequestError {
  error: {
    code: number;
    message: string;
    status: string;
  };
}

export interface DataLayersResponse {
  rgbUrl?: string;
  dsmUrl?: string;
  maskUrl?: string;
  annualFluxUrl?: string;
  monthlyFluxUrl?: string;
  hourlyShadeUrls?: string[];
  imageryDate?: Date;
  imageryProcessedDate?: Date;
  imageryQuality?: 'HIGH' | 'MEDIUM' | 'LOW';
} 