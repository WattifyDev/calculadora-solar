import type { BuildingInsightsResponse, RequestError } from './google-solar-types';

interface LocationCoords {
  latitude: number;
  longitude: number;
}

/**
 * Fetches building insights from the Google Solar API.
 * https://developers.google.com/maps/documentation/solar/building-insights
 *
 * @param location Point of interest as latitude and longitude.
 * @param apiKey Google Cloud API key for Solar API.
 * @returns Promise<BuildingInsightsResponse | null> Building Insights response or null if an error occurs.
 */
export async function fetchBuildingInsights(
  location: LocationCoords,
  apiKey: string,
): Promise<BuildingInsightsResponse | null> {
  if (!apiKey) {
    console.error('Google Solar API key is not configured.');
    return null;
  }

  if (isNaN(location.latitude) || isNaN(location.longitude)) {
    console.error('[SOLAR] Invalid coordinates provided to fetchBuildingInsights:', location);
    return null;
  }

  const params = new URLSearchParams({
    'location.latitude': location.latitude.toFixed(7),
    'location.longitude': location.longitude.toFixed(7),
    key: apiKey,
  });

  const url = `https://solar.googleapis.com/v1/buildingInsights:findClosest?${params}`;

  try {
    console.log('Fetching Google Solar API buildingInsights for:', location);
    const response = await fetch(url);

    let content: any;
    try {
      content = await response.json();
    } catch (e) {
      console.error('[SOLAR] Failed to parse response as JSON:', e);
      return null;
    }

    if (!response.ok) {
      console.error(
        'Google Solar API error:',
        (content as RequestError).error || content,
      );
      return null;
    }

    // Check if the response is actually a BuildingInsightsResponse and not a RequestError that somehow passed response.ok
    if ('error' in content && typeof (content as any).error === 'object') {
      console.error('Google Solar API returned an error structure despite a 2xx status:', content);
      return null;
    }

    console.log('Successfully fetched buildingInsights from Google Solar API.');
    return content as BuildingInsightsResponse;
  } catch (error) {
    console.error('Error calling Google Solar API:', error);
    return null;
  }
}

export async function fetchDataLayers(
  location: { latitude: number; longitude: number },
  apiKey: string,
  radiusMeters: number = 50,
  requiredQuality: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH',
): Promise<string | null> {
  if (!apiKey) {
    console.error('Google Solar API key is not configured.');
    return null;
  }

  try {
    const params = new URLSearchParams({
      'location.latitude': location.latitude.toString(),
      'location.longitude': location.longitude.toString(),
      radiusMeters: radiusMeters.toString(),
      requiredQuality,
      key: apiKey,
    });

    const url = `https://solar.googleapis.com/v1/dataLayers:get?${params}`;
    console.log('[SOLAR] Fetching Google Solar API dataLayers for orthophoto:', url);
    const response = await fetch(url);

    if (!response.ok) {
      console.error('[SOLAR] Failed to fetch dataLayers:', response.status, response.statusText);
      try {
        const errorText = await response.text();
        console.error('[SOLAR] Error response body:', errorText);
      } catch (e) {
        console.error('[SOLAR] Could not read error body');
      }
      return null;
    }

    let data: any;
    try {
      data = await response.json();
    } catch (e) {
      console.error('[SOLAR] Failed to parse dataLayers response as JSON:', e);
      return null;
    }
    console.log('[SOLAR] dataLayers API response:', data);

    // Return the RGB URL for the orthophoto with API key appended
    if (data.rgbUrl) {
      // Return URL without key to keep it secure in the backend
      return data.rgbUrl;
    }

    console.warn('[SOLAR] No rgbUrl found in dataLayers response');
    return null;
  } catch (error) {
    console.error('[SOLAR] Error fetching dataLayers from Google Solar API:', error);
    return null;
  }
}

// Re-export types for convenience if needed elsewhere
export * from './google-solar-types';

import type { RoofSegmentDetails } from './types';
import type { SolarPotential } from './google-solar-types';

export function getOrientationLabel(azimuthDegrees: number): string {
    const az = (azimuthDegrees + 360) % 360;
    if (az >= 337.5 || az < 22.5) return 'Norte';
    if (az >= 22.5 && az < 67.5) return 'Nordeste';
    if (az >= 67.5 && az < 112.5) return 'Este';
    if (az >= 112.5 && az < 157.5) return 'Sudeste';
    if (az >= 157.5 && az < 202.5) return 'Sur';
    if (az >= 202.5 && az < 247.5) return 'Sudoeste';
    if (az >= 247.5 && az < 292.5) return 'Oeste';
    if (az >= 292.5 && az < 337.5) return 'Noroeste';
    return 'Sur';
}

export function getPerformanceRating(azimuthDegrees: number, pitchDegrees: number): {
    grade: 'A' | 'B' | 'C' | 'D';
    label: string;
    description: string;
    efficiencyPercentage: number;
} {
    const az = (azimuthDegrees + 360) % 360;
    if (az >= 135 && az <= 225) {
        return { grade: 'A', label: 'Rendimiento Óptimo', description: 'Orientación Sur con máxima captación solar', efficiencyPercentage: 100 };
    }
    if ((az >= 105 && az < 135) || (az > 225 && az <= 255)) {
        return { grade: 'B', label: 'Rendimiento Bueno', description: 'Orientación Sudeste/Sudoeste con excelente radiación', efficiencyPercentage: 90 };
    }
    if ((az >= 65 && az < 105) || (az > 255 && az <= 295)) {
        return { grade: 'C', label: 'Rendimiento Medio', description: 'Orientación Este/Oeste (aprovechamiento mañana/tarde)', efficiencyPercentage: 75 };
    }
    return { grade: 'D', label: 'Rendimiento Bajo', description: 'Orientación Norte con menor radiación/sombras', efficiencyPercentage: 55 };
}

export function extractRoofSegments(
    solarPotential: SolarPotential,
    selectedSegmentIndices?: number[]
): RoofSegmentDetails[] {
    if (!solarPotential.roofSegmentStats || !Array.isArray(solarPotential.roofSegmentStats)) {
        return [];
    }

    const panelsBySegment = new Map<number, number>();
    if (solarPotential.solarPanels && Array.isArray(solarPotential.solarPanels)) {
        for (const panel of solarPotential.solarPanels) {
            if (typeof panel.segmentIndex === 'number') {
                panelsBySegment.set(panel.segmentIndex, (panelsBySegment.get(panel.segmentIndex) || 0) + 1);
            }
        }
    }

    return solarPotential.roofSegmentStats.map((stat, index) => {
        const pitch = Math.round(stat.pitchDegrees);
        const azimuth = Math.round(stat.azimuthDegrees);
        const orientationLabel = getOrientationLabel(azimuth);
        const perf = getPerformanceRating(azimuth, pitch);
        const areaMeters2 = Math.round(stat.stats?.areaMeters2 || 0);
        const sunshineHoursPerYear = Math.round(stat.stats?.sunshineQuantiles?.[5] || solarPotential.maxSunshineHoursPerYear || 1400);
        const panelsCount = panelsBySegment.get(index) || 0;
        
        const isSelected = selectedSegmentIndices && selectedSegmentIndices.length > 0
            ? selectedSegmentIndices.includes(index)
            : perf.grade !== 'D' && panelsCount > 0;

        return {
            segmentIndex: index,
            pitchDegrees: pitch,
            azimuthDegrees: azimuth,
            orientationLabel,
            areaMeters2,
            sunshineHoursPerYear,
            panelsCount,
            performanceGrade: perf.grade,
            performanceLabel: perf.label,
            efficiencyPercentage: perf.efficiencyPercentage,
            isSelected,
        };
    });
} 