import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Client, Language, AddressType } from "@googlemaps/google-maps-services-js"

// Initialize Google Maps client
const googleMapsClient = new Client({});

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const lat = searchParams.get('lat')
    const lon = searchParams.get('lon')
    // Get peakpower, default to '1' if not provided
    const peakpower = searchParams.get('peakpower') ?? '1'
    // Get loss, default to '14' (14%) if not provided
    const loss = searchParams.get('loss') ?? '14'

    if (!lat || !lon) {
        return NextResponse.json({ error: 'Missing lat or lon parameter' }, { status: 400 })
    }

    try {
        // First, get the address from coordinates using Google Maps Geocoding API
        const geocodeResponse = await googleMapsClient.reverseGeocode({
            params: {
                latlng: { lat: parseFloat(lat), lng: parseFloat(lon) },
                key: process.env.GOOGLE_MAPS_API_KEY || '',
                language: 'es' as Language, // Spanish results
            },
        });

        let address = "Location Unknown";
        let city = "";
        let country = "spain";

        if (geocodeResponse.data.results.length > 0) {
            const result = geocodeResponse.data.results[0];
            address = result.formatted_address;

            // Extract city and country from address components
            for (const component of result.address_components) {
                if (component.types.includes(AddressType.locality)) {
                    city = component.long_name;
                }
                if (component.types.includes(AddressType.country)) {
                    country = component.long_name.toLowerCase();
                }
            }
        }

        // Construct the external API URL, including peakpower and loss
        const pvgisUrl = `https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?lat=${lat}&lon=${lon}&peakpower=${peakpower}&loss=${loss}&outputformat=json`

        console.log(`Fetching PVGIS data from server: ${pvgisUrl}`)
        const response = await fetch(pvgisUrl, {
            method: 'GET',
            headers: {
                // Add any necessary headers here, though PVGIS usually doesn't require specific ones
                'Accept': 'application/json',
            },
            // Optional: Add cache control if needed, e.g., revalidate every hour
            // next: { revalidate: 3600 }
        });

        console.log(`PVGIS response status: ${response.status}`)

        if (!response.ok) {
            // Forward the error status and potentially the body from PVGIS
            const errorText = await response.text();
            console.error(`PVGIS API error: ${response.status} - ${errorText}`);
            return NextResponse.json({ error: `PVGIS API Error: ${response.status}`, details: errorText }, { status: response.status })
        }

        const pvgisData = await response.json();
        console.log("PVGIS data fetched successfully on server.")

        // Calculate annual production from monthly data
        const annualProduction = pvgisData.outputs.monthly.fixed.map((m: any) => m.E_m).reduce((a: number, b: number) => a + b, 0);
        const dailyAverage = annualProduction / 365;

        // Store the data in the database
        const submission = await prisma.submission.create({
            data: {
                address,
                city,
                country,
                latitude: parseFloat(lat),
                longitude: parseFloat(lon),
                annualProduction: annualProduction,
                dailyAverage: dailyAverage,
                efficiency: 100 - parseFloat(loss), // Convert loss to efficiency
                systemSize: parseFloat(peakpower),
                // Calculate estimated costs (example values)
                totalCost: parseFloat(peakpower) * 100000, // $1000 per kW in cents
                costPerWatt: 100, // $1 per watt in cents
                // Environmental impact (rough estimates)
                co2Reduction: annualProduction * 0.0005, // 0.5kg CO2 per kWh
                treesPlanted: Math.round(annualProduction * 0.02), // 1 tree = 50kWh/year (rough estimate)
            }
        });

        // Return both the PVGIS data and our submission ID
        return NextResponse.json({
            ...pvgisData,
            submissionId: submission.id,
            address,
            city,
            country
        });

    } catch (error) {
        console.error('Error fetching PVGIS data:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ error: 'Failed to fetch data from PVGIS API', details: errorMessage }, { status: 500 })
    }
}

//sample response

// {
//     "inputs": {
//       "location": {
//         "latitude": 40.4165,
//         "longitude": -3.70256,
//         "elevation": 669
//       },
//       "meteo_data": {
//         "radiation_db": "PVGIS-SARAH3",
//         "meteo_db": "ERA5",
//         "year_min": 2005,
//         "year_max": 2023,
//         "use_horizon": true,
//         "horizon_db": "DEM-calculated"
//       },
//       "mounting_system": {
//         "fixed": {
//           "slope": {
//             "value": 0,
//             "optimal": false
//           },
//           "azimuth": {
//             "value": 0,
//             "optimal": false
//           },
//           "type": "free-standing"
//         }
//       },
//       "pv_module": {
//         "technology": "c-Si",
//         "peak_power": 300,
//         "system_loss": 1
//       },
//       "economic_data": {
//         "system_cost": null,
//         "interest": null,
//         "lifetime": null
//       }
//     },
//     "outputs": {
//       "monthly": {
//         "fixed": [
//           {
//             "month": 1,
//             "E_d": 631.66,
//             "E_m": 19581.33,
//             "H(i)_d": 2.31,
//             "H(i)_m": 71.54,
//             "SD_m": 2428.58
//           },
//           {
//             "month": 2,
//             "E_d": 902.72,
//             "E_m": 25276.23,
//             "H(i)_d": 3.24,
//             "H(i)_m": 90.74,
//             "SD_m": 2741.62
//           },
//           {
//             "month": 3,
//             "E_d": 1220.2,
//             "E_m": 37826.32,
//             "H(i)_d": 4.4,
//             "H(i)_m": 136.3,
//             "SD_m": 4721.93
//           },
//           {
//             "month": 4,
//             "E_d": 1523.5,
//             "E_m": 45704.88,
//             "H(i)_d": 5.61,
//             "H(i)_m": 168.41,
//             "SD_m": 3798.88
//           },
//           {
//             "month": 5,
//             "E_d": 1778.92,
//             "E_m": 55146.6,
//             "H(i)_d": 6.71,
//             "H(i)_m": 208.11,
//             "SD_m": 4641.84
//           },
//           {
//             "month": 6,
//             "E_d": 1947.67,
//             "E_m": 58429.99,
//             "H(i)_d": 7.56,
//             "H(i)_m": 226.79,
//             "SD_m": 2700.78
//           },
//           {
//             "month": 7,
//             "E_d": 2016.65,
//             "E_m": 62516.09,
//             "H(i)_d": 7.98,
//             "H(i)_m": 247.24,
//             "SD_m": 1492.53
//           },
//           {
//             "month": 8,
//             "E_d": 1781.73,
//             "E_m": 55233.49,
//             "H(i)_d": 7.01,
//             "H(i)_m": 217.3,
//             "SD_m": 1269.74
//           },
//           {
//             "month": 9,
//             "E_d": 1403.37,
//             "E_m": 42100.97,
//             "H(i)_d": 5.36,
//             "H(i)_m": 160.85,
//             "SD_m": 2038.16
//           },
//           {
//             "month": 10,
//             "E_d": 987.68,
//             "E_m": 30618.15,
//             "H(i)_d": 3.69,
//             "H(i)_m": 114.39,
//             "SD_m": 2393.07
//           },
//           {
//             "month": 11,
//             "E_d": 671.02,
//             "E_m": 20130.71,
//             "H(i)_d": 2.47,
//             "H(i)_m": 74.08,
//             "SD_m": 2104.1
//           },
//           {
//             "month": 12,
//             "E_d": 552.12,
//             "E_m": 17115.75,
//             "H(i)_d": 2.06,
//             "H(i)_m": 63.88,
//             "SD_m": 1501.35
//           }
//         ]
//       },
//       "totals": {
//         "fixed": {
//           "E_d": 1286.8,
//           "E_m": 39140.04,
//           "E_y": 469680.5,
//           "H(i)_d": 4.88,
//           "H(i)_m": 148.3,
//           "H(i)_y": 1779.64,
//           "SD_m": 897.02,
//           "SD_y": 10764.27,
//           "l_aoi": -3.79,
//           "l_spec": "0.30",
//           "l_tg": -7.92,
//           "l_total": -12.03
//         }
//       }
//     },
//     "meta": {
//       "inputs": {
//         "location": {
//           "description": "Selected location",
//           "variables": {
//             "latitude": {
//               "description": "Latitude",
//               "units": "decimal degree"
//             },
//             "longitude": {
//               "description": "Longitude",
//               "units": "decimal degree"
//             },
//             "elevation": {
//               "description": "Elevation",
//               "units": "m"
//             }
//           }
//         },
//         "meteo_data": {
//           "description": "Sources of meteorological data",
//           "variables": {
//             "radiation_db": {
//               "description": "Solar radiation database"
//             },
//             "meteo_db": {
//               "description": "Database used for meteorological variables other than solar radiation"
//             },
//             "year_min": {
//               "description": "First year of the calculations"
//             },
//             "year_max": {
//               "description": "Last year of the calculations"
//             },
//             "use_horizon": {
//               "description": "Include horizon shadows"
//             },
//             "horizon_db": {
//               "description": "Source of horizon data"
//             }
//           }
//         },
//         "mounting_system": {
//           "description": "Mounting system",
//           "choices": "fixed, vertical_axis, inclined_axis, two_axis",
//           "fields": {
//             "slope": {
//               "description": "Inclination angle from the horizontal plane",
//               "units": "degree"
//             },
//             "azimuth": {
//               "description": "Orientation (azimuth) angle of the (fixed) PV system (0 = S, 90 = W, -90 = E)",
//               "units": "degree"
//             }
//           }
//         },
//         "pv_module": {
//           "description": "PV module parameters",
//           "variables": {
//             "technology": {
//               "description": "PV technology"
//             },
//             "peak_power": {
//               "description": "Nominal (peak) power of the PV module",
//               "units": "kW"
//             },
//             "system_loss": {
//               "description": "Sum of system losses",
//               "units": "%"
//             }
//           }
//         },
//         "economic_data": {
//           "description": "Economic inputs",
//           "variables": {
//             "system_cost": {
//               "description": "Total cost of the PV system",
//               "units": "user-defined currency"
//             },
//             "interest": {
//               "description": "Annual interest",
//               "units": "%/y"
//             },
//             "lifetime": {
//               "description": "Expected lifetime of the PV system",
//               "units": "y"
//             }
//           }
//         }
//       },
//       "outputs": {
//         "monthly": {
//           "type": "time series",
//           "timestamp": "monthly averages",
//           "variables": {
//             "E_d": {
//               "description": "Average daily energy production from the given system",
//               "units": "kWh/d"
//             },
//             "E_m": {
//               "description": "Average monthly energy production from the given system",
//               "units": "kWh/mo"
//             },
//             "H(i)_d": {
//               "description": "Average daily sum of global irradiation per square meter received by the modules of the given system",
//               "units": "kWh/m2/d"
//             },
//             "H(i)_m": {
//               "description": "Average monthly sum of global irradiation per square meter received by the modules of the given system",
//               "units": "kWh/m2/mo"
//             },
//             "SD_m": {
//               "description": "Standard deviation of the monthly energy production due to year-to-year variation",
//               "units": "kWh"
//             }
//           }
//         },
//         "totals": {
//           "type": "time series totals",
//           "variables": {
//             "E_d": {
//               "description": "Average daily energy production from the given system",
//               "units": "kWh/d"
//             },
//             "E_m": {
//               "description": "Average monthly energy production from the given system",
//               "units": "kWh/mo"
//             },
//             "E_y": {
//               "description": "Average annual energy production from the given system",
//               "units": "kWh/y"
//             },
//             "H(i)_d": {
//               "description": "Average daily sum of global irradiation per square meter received by the modules of the given system",
//               "units": "kWh/m2/d"
//             },
//             "H(i)_m": {
//               "description": "Average monthly sum of global irradiation per square meter received by the modules of the given system",
//               "units": "kWh/m2/mo"
//             },
//             "H(i)_y": {
//               "description": "Average annual sum of global irradiation per square meter received by the modules of the given system",
//               "units": "kWh/m2/y"
//             },
//             "SD_m": {
//               "description": "Standard deviation of the monthly energy production due to year-to-year variation",
//               "units": "kWh"
//             },
//             "SD_y": {
//               "description": "Standard deviation of the annual energy production due to year-to-year variation",
//               "units": "kWh"
//             },
//             "l_aoi": {
//               "description": "Angle of incidence loss",
//               "units": "%"
//             },
//             "l_spec": {
//               "description": "Spectral loss",
//               "units": "%"
//             },
//             "l_tg": {
//               "description": "Temperature and irradiance loss",
//               "units": "%"
//             },
//             "l_total": {
//               "description": "Total loss",
//               "units": "%"
//             }
//           }
//         }
//       }
//     }
//   }
