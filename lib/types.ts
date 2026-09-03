export interface AddressFormData {
  address: string
  city: string
  postalCode: string
  country: string
}

export interface UserInfoFormData {
  name: string
  email: string
  phone?: string
  consent: boolean
}

export interface SolarPotential {
  annualProduction: string
  dailyAverage: string
  efficiency: number
  sunHoursPerDay: number
  averageKwhConsumptionFormatted?: string | null;
}

export interface InstallationCost {
  total: string
  perWatt: string
  systemSize: number
  panelCount: number
}

export interface RoofArea {
  total: number
  suitable: number
  percentage: number
}

export interface PaybackPeriod {
  years: number
  roi: number
}

export interface AnnualSavings {
  firstYear: string
  lifetime: string
}

export interface EnvironmentalImpact {
  co2Reduction: number
  treesPlanted: number
}

export interface SolarResults {
  id: string
  address: string
  city: string
  country: string
  solarPotential: SolarPotential
  installationCost: InstallationCost
  roofArea: RoofArea
  paybackPeriod: PaybackPeriod
  annualSavings: AnnualSavings
  environmentalImpact: EnvironmentalImpact
  googleSolarData?: GoogleSolarData | null;
  currencyCode?: string | null;
  monthlyElectricityBillAmountFormatted?: string | null;
  averageKwhConsumptionFormatted?: string | null;
}

export interface UserInfo {
  name: string
  email: string
  phone?: string
  consentGiven: boolean
}

export interface UserSubmission {
  id: string
  createdAt: Date
  address: string
  city: string
  country: string
  hasUserInfo: boolean
  userName: string | null
  userEmail: string | null
  userPhone: string | null
  origin: string | null
  pathname: string | null
  googleSolarData?: GoogleSolarData | null
}

export interface Material {
  id: string
  name: string
  type: MaterialType
  panelType: PanelType | null
  panelApplication: PanelApplication | null
  /**
   * Potencia pico: para PANEL (en W) y para INVERSOR (en kW)
   */
  peakPower: number | null
  hasBattery: boolean | null
  area: number
  image: string | null
  datasheetPdf: string | null
  createdAt: string
  updatedAt: string
}

export interface MaterialFormData {
  name: string
  type: MaterialType
  panelType: PanelType | null
  panelApplication: PanelApplication | null
  /**
   * Potencia pico: para PANEL (en W) y para INVERSOR (en kW)
   */
  peakPower: number | null
  hasBattery: boolean | null
  area: number
  image: string | null
  datasheetPdf: string | null
}

export interface RoofSegmentDetails {
  segmentIndex: number;
  pitchDegrees: number;
  azimuthDegrees: number;
  orientationLabel: string;
  areaMeters2: number;
  sunshineHoursPerYear: number;
  panelsCount: number;
  performanceGrade: 'A' | 'B' | 'C' | 'D';
  performanceLabel: string;
  efficiencyPercentage: number;
  isSelected: boolean;
  isRecommended?: boolean;
}

// New interface for googleSolarData content, including Google Solar fields
export interface GoogleSolarData {
  initialConsumption: number;
  maxSunshineHoursPerYear: number | null;
  maxArrayAreaMeters2: number | null;
  maxArrayPanelsCount: number | null;
  panelsCount: number | null;
  yearlyEnergyDcKwh: number | null;
  // New financial fields
  estimatedAnnualSavingsAmount?: number | null;
  estimatedTotalLifetimeSavingsAmount?: number | null;
  estimatedInstallationCostAmount?: number | null;
  paybackYears?: number | null;
  currencyCode?: string | null;
  monthlyElectricityBillAmount?: number | null;
  averageKwhConsumption?: number | null;
  installationSizeKW?: number | null;
  orthophotoUrl?: string | null;
  roofSegments?: RoofSegmentDetails[];
  solarPanels?: import('./google-solar-types').SolarPanel[];
  panelHeightMeters?: number | null;
  panelWidthMeters?: number | null;
  boundingBox?: import('./google-solar-types').LatLngBox | null;
}

export interface ExpectedPvgisData {
  initialConsumption?: number;
}

// Enums based on Prisma schema
export enum MaterialType {
  PANEL = 'PANEL',
  INVERSOR = 'INVERSOR',
  OTHER = 'OTHER',
}

export enum PanelType {
  NORMAL = 'NORMAL',
  BLACK = 'BLACK',
}

export enum PanelApplication {
  RESIDENCIAL = 'RESIDENCIAL',
  INDUSTRIAL = 'INDUSTRIAL',
}
