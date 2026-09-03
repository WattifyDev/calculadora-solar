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
    selectedSegmentIndices?: number[],
    targetConsumptionKWh?: number,
    userPolygon?: { lat: number; lng: number }[]
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

    // Helper: Ray casting algorithm to check if a lat/lng point is inside a polygon
    function isPointInPolygon(point: { latitude: number; longitude: number }, vs: { lat: number; lng: number }[]) {
        const x = point.longitude, y = point.latitude;
        let inside = false;
        for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            const xi = vs[i].lng, yi = vs[i].lat;
            const xj = vs[j].lng, yj = vs[j].lat;
            const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    // First map all raw segments
    const allRawSegments = solarPotential.roofSegmentStats.map((stat, index) => {
        const pitch = Math.round(stat.pitchDegrees);
        const azimuth = Math.round(stat.azimuthDegrees);
        const orientationLabel = getOrientationLabel(azimuth);
        const perf = getPerformanceRating(azimuth, pitch);
        const areaMeters2 = Math.round(stat.stats?.areaMeters2 || 0);
        const sunshineHoursPerYear = Math.round(stat.stats?.sunshineQuantiles?.[5] || solarPotential.maxSunshineHoursPerYear || 1400);
        const panelsCount = panelsBySegment.get(index) || (areaMeters2 > 0 ? Math.max(1, Math.floor(areaMeters2 / 2.2)) : 0);

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
            center: stat.center ? { latitude: stat.center.latitude, longitude: stat.center.longitude } : undefined,
            boundingBox: stat.boundingBox,
            isRecommended: false,
            isSelected: false,
        };
    });

    // FILTER OUT SEGMENTS OUTSIDE USER-DRAWN ROOF POLYGON:
    // If the user specified a polygon, discard any segment whose center falls outside the polygon bounds
    let candidates = allRawSegments;
    if (userPolygon && Array.isArray(userPolygon) && userPolygon.length >= 3) {
        const polygonFiltered = candidates.filter(s => {
            if (s.center) {
                return isPointInPolygon(s.center, userPolygon);
            }
            return true;
        });
        // If polygon matching found at least one segment, use strictly those
        if (polygonFiltered.length > 0) {
            candidates = polygonFiltered;
        }
    }

    // FILTER OUT RESIDUAL MICRO-SEGMENTS:
    // Discard chimney caps, micro-eaves, and tiny surfaces (area < 20m² or panels < 6)
    // to present clean, realistic primary roof slopes to the user.
    let validSegments = candidates.filter(s => s.areaMeters2 >= 20 && s.panelsCount >= 6);
    if (validSegments.length === 0) {
        // Fallback if the building is very small: keep segments with at least 10m² and 4 panels
        validSegments = candidates.filter(s => s.areaMeters2 >= 10 && s.panelsCount >= 4);
    }
    if (validSegments.length === 0) {
        validSegments = candidates.filter(s => s.panelsCount > 0);
    }

    const allSegments = validSegments;

    // If user explicitly selected segments via UI checkbox, respect their exact manual choice
    if (selectedSegmentIndices && selectedSegmentIndices.length > 0) {
        return allSegments.map(seg => ({
            ...seg,
            isSelected: selectedSegmentIndices.includes(seg.segmentIndex),
            isRecommended: seg.performanceGrade === 'A' || seg.performanceGrade === 'B',
        }));
    }

    // Intelligent initial preselection:
    // Estimate target panels needed based on consumption (default ~400W panel, ~1300 kWh/kWp in Spain)
    const panelWattage = solarPotential.panelCapacityWatts || 400;
    const kwhPerPanelPerYear = (panelWattage / 1000) * 1300;
    const targetPanelsNeeded = targetConsumptionKWh && targetConsumptionKWh > 0
        ? Math.ceil(targetConsumptionKWh / kwhPerPanelPerYear)
        : 18;

    // Rank segments by efficiency: Grade A > B > C > D, then by panelsCount descending
    const gradeWeight: Record<string, number> = { 'A': 4, 'B': 3, 'C': 2, 'D': 1 };
    const sortedIndices = [...allSegments]
        .filter(s => s.panelsCount > 0)
        .sort((a, b) => {
            const weightA = gradeWeight[a.performanceGrade] || 0;
            const weightB = gradeWeight[b.performanceGrade] || 0;
            if (weightB !== weightA) return weightB - weightA;
            return b.panelsCount - a.panelsCount;
        })
        .map(s => s.segmentIndex);

    // Pick only the top primary segment for initial recommendation (e.g. Sur principal),
    // and only add a second one if targetPanelsNeeded strictly exceeds the primary slope capacity.
    const recommendedSet = new Set<number>();
    let accumulatedPanels = 0;

    for (const idx of sortedIndices) {
        const seg = allSegments.find(s => s.segmentIndex === idx);
        if (!seg) continue;

        // Skip Grade D in recommended initial selection
        if (seg.performanceGrade === 'D' && recommendedSet.size > 0) continue;

        recommendedSet.add(idx);
        accumulatedPanels += seg.panelsCount;

        // Stop as soon as we have covered or reached close to targetPanelsNeeded
        if (accumulatedPanels >= targetPanelsNeeded) {
            break;
        }
    }

    // If nothing was selected (rare), select at least the top segment
    if (recommendedSet.size === 0 && sortedIndices.length > 0) {
        recommendedSet.add(sortedIndices[0]);
    }

    return allSegments.map(seg => {
        const isRec = recommendedSet.has(seg.segmentIndex);
        return {
            ...seg,
            isRecommended: isRec,
            isSelected: isRec, // Preselected initially
        };
    });
} 