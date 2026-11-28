import { WeatherData, WeatherHazardLevel, WeatherHazardType, HourlyWeatherPoint } from '../types';

// WMO Weather Interpretation Codes (WW)
export const WMO_CODE_MAP: Record<number, { condition: string; icon: string; isPrecipitation: boolean; isSnow: boolean; isStorm: boolean }> = {
  0: { condition: 'Clear Sky', icon: '☀️', isPrecipitation: false, isSnow: false, isStorm: false },
  1: { condition: 'Mainly Clear', icon: '🌤️', isPrecipitation: false, isSnow: false, isStorm: false },
  2: { condition: 'Partly Cloudy', icon: '⛅', isPrecipitation: false, isSnow: false, isStorm: false },
  3: { condition: 'Overcast', icon: '☁️', isPrecipitation: false, isSnow: false, isStorm: false },
  45: { condition: 'Fog', icon: '🌫️', isPrecipitation: false, isSnow: false, isStorm: false },
  48: { condition: 'Depositing Rime Fog', icon: '🌫️', isPrecipitation: false, isSnow: false, isStorm: false },
  51: { condition: 'Light Drizzle', icon: '🌦️', isPrecipitation: true, isSnow: false, isStorm: false },
  53: { condition: 'Moderate Drizzle', icon: '🌦️', isPrecipitation: true, isSnow: false, isStorm: false },
  55: { condition: 'Dense Drizzle', icon: '🌧️', isPrecipitation: true, isSnow: false, isStorm: false },
  56: { condition: 'Light Freezing Drizzle', icon: '🌨️', isPrecipitation: true, isSnow: true, isStorm: false },
  57: { condition: 'Dense Freezing Drizzle', icon: '🌨️', isPrecipitation: true, isSnow: true, isStorm: false },
  61: { condition: 'Slight Rain', icon: '🌦️', isPrecipitation: true, isSnow: false, isStorm: false },
  63: { condition: 'Moderate Rain', icon: '🌧️', isPrecipitation: true, isSnow: false, isStorm: false },
  65: { condition: 'Heavy Rain', icon: '🌧️', isPrecipitation: true, isSnow: false, isStorm: false },
  66: { condition: 'Light Freezing Rain', icon: '🌨️', isPrecipitation: true, isSnow: true, isStorm: false },
  67: { condition: 'Heavy Freezing Rain', icon: '🌨️', isPrecipitation: true, isSnow: true, isStorm: false },
  71: { condition: 'Slight Snow Fall', icon: '🌨️', isPrecipitation: true, isSnow: true, isStorm: false },
  73: { condition: 'Moderate Snow Fall', icon: '❄️', isPrecipitation: true, isSnow: true, isStorm: false },
  75: { condition: 'Heavy Snow Fall', icon: '❄️', isPrecipitation: true, isSnow: true, isStorm: false },
  77: { condition: 'Snow Grains', icon: '❄️', isPrecipitation: true, isSnow: true, isStorm: false },
  80: { condition: 'Slight Rain Showers', icon: '🌦️', isPrecipitation: true, isSnow: false, isStorm: false },
  81: { condition: 'Moderate Rain Showers', icon: '🌧️', isPrecipitation: true, isSnow: false, isStorm: false },
  82: { condition: 'Violent Rain Showers', icon: '⛈️', isPrecipitation: true, isSnow: false, isStorm: true },
  85: { condition: 'Slight Snow Showers', icon: '🌨️', isPrecipitation: true, isSnow: true, isStorm: false },
  86: { condition: 'Heavy Snow Showers', icon: '❄️', isPrecipitation: true, isSnow: true, isStorm: false },
  95: { condition: 'Thunderstorm', icon: '⚡', isPrecipitation: true, isSnow: false, isStorm: true },
  96: { condition: 'Thunderstorm with Slight Hail', icon: '⛈️', isPrecipitation: true, isSnow: false, isStorm: true },
  99: { condition: 'Thunderstorm with Heavy Hail', icon: '⛈️', isPrecipitation: true, isSnow: false, isStorm: true },
};

/**
 * Calculates Accessibility Impact & Delay caused by Rain, Snow, Wind, and Temperature
 */
export function analyzeAccessibilityWeather(params: {
  tempC: number;
  apparentTempC?: number;
  precipitationMm: number;
  snowfallCm: number;
  windSpeedKmh: number;
  windGustsKmh?: number;
  weatherCode: number;
  rainProbability?: number;
  surfaceType?: string;
}): {
  hazardLevel: WeatherHazardLevel;
  hazardType: WeatherHazardType;
  hazardTitle: string;
  hazardDescription: string;
  delayMinutes: number;
  surfaceTractionScore: number;
  outdoorExposureRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  accessibilityImpact: string;
  recommendedMitigation: string;
} {
  const {
    tempC,
    precipitationMm = 0,
    snowfallCm = 0,
    windSpeedKmh = 0,
    windGustsKmh = 0,
    weatherCode = 0,
    surfaceType = 'Standard Paving',
  } = params;

  const wmo = WMO_CODE_MAP[weatherCode] || { condition: 'Variable', icon: '🌤️', isPrecipitation: false, isSnow: false, isStorm: false };

  // 1. Check Severe Thunderstorm / Extreme Rain
  if (wmo.isStorm || weatherCode >= 95 || precipitationMm >= 8.0) {
    return {
      hazardLevel: 'CRITICAL',
      hazardType: 'THUNDERSTORM',
      hazardTitle: '⚡ Severe Storm & Heavy Rain Obstacle Warning',
      hazardDescription:
        'Intense downpours and lightning. Exterior ramps risk pooling water and tactile paving slickness. Electronic wheelchair motors vulnerable to water exposure.',
      delayMinutes: 25,
      surfaceTractionScore: 25,
      outdoorExposureRisk: 'EXTREME',
      accessibilityImpact: 'Critical rain flooding hazard on outdoor slopes. Step-free detours through covered concourses required.',
      recommendedMitigation:
        'Remain inside sheltered PRM transit hubs. Use designated covered arcades and avoid open outdoor flagstone paths.',
    };
  }

  // 2. Check Snow & Freezing Ice Conditions
  if (wmo.isSnow || snowfallCm > 0 || weatherCode in [56, 57, 66, 67, 71, 73, 75, 77, 85, 86] || (tempC <= 0.5 && precipitationMm > 0)) {
    const isHeavySnow = snowfallCm > 2.0 || weatherCode === 75 || weatherCode === 86;
    return {
      hazardLevel: isHeavySnow ? 'CRITICAL' : 'WARNING',
      hazardType: 'SNOW_ICE',
      hazardTitle: isHeavySnow ? '❄️ Heavy Snow & Ice Blockage Warning' : '🌨️ Snowfall & Slippery Ramp Advisory',
      hazardDescription:
        'Snow and sub-zero frost on exterior walkways. Wheelchair tires risk loss of traction; crutch and cane rubber ferrules may slip on frozen curb transitions.',
      delayMinutes: isHeavySnow ? 20 : 12,
      surfaceTractionScore: isHeavySnow ? 15 : 35,
      outdoorExposureRisk: isHeavySnow ? 'EXTREME' : 'HIGH',
      accessibilityImpact: 'Low traction on ramps due to snow accumulation. Handrail heating and cleared indoor passages recommended.',
      recommendedMitigation:
        'Use indoor elevators and cleared central pathways. Request facility snow-escort or utilize facility heated transit vans.',
    };
  }

  // 3. Check High Wind Gusts (Wheelchair push-over & balance risk)
  if (windSpeedKmh >= 40 || windGustsKmh >= 55) {
    return {
      hazardLevel: 'WARNING',
      hazardType: 'HIGH_WIND',
      hazardTitle: '💨 Severe Wind Gust Obstacle Warning (>40 km/h)',
      hazardDescription:
        'Strong crosswinds impacting manual wheelchair propulsion, lightweight mobility scooters, and walker stability along elevated ramps and open plazas.',
      delayMinutes: 12,
      surfaceTractionScore: 60,
      outdoorExposureRisk: 'HIGH',
      accessibilityImpact: 'Strong wind resistance along unshielded ramps. High risk for unassisted travelers with limited upper body strength.',
      recommendedMitigation:
        'Navigate via wind-buffered sheltered corridors. Avoid high-altitude observation terraces or elevated uncovered footbridges.',
    };
  } else if (windSpeedKmh >= 28 || windGustsKmh >= 40) {
    return {
      hazardLevel: 'ADVISORY',
      hazardType: 'HIGH_WIND',
      hazardTitle: '💨 Moderate Wind Advisory (28-40 km/h)',
      hazardDescription: 'Moderate crosswinds on open paths. Travelers with crutches or umbrellas should exercise extra balance precautions.',
      delayMinutes: 6,
      surfaceTractionScore: 75,
      outdoorExposureRisk: 'MEDIUM',
      accessibilityImpact: 'Minor wind resistance on outdoor paths. Level low-lying walkways recommended.',
      recommendedMitigation: 'Keep both hands on mobility device steering controls; lower umbrella profile.',
    };
  }

  // 4. Check Moderate to Light Rain
  if (wmo.isPrecipitation || precipitationMm > 0.3 || (params.rainProbability && params.rainProbability > 65)) {
    const isModerate = precipitationMm >= 1.5 || weatherCode in [63, 65, 81];
    return {
      hazardLevel: isModerate ? 'WARNING' : 'ADVISORY',
      hazardType: 'RAIN_SLIP',
      hazardTitle: isModerate ? '🌧️ Wet Pavement & Slippery Ramp Warning' : '🌦️ Light Rain & Reduced Traction Advisory',
      hazardDescription: `Precipitation is dampening surfaces (${surfaceType}). Wet smooth tiles, sandstone, and metal threshold plates lose up to 40% surface friction.`,
      delayMinutes: isModerate ? 10 : 5,
      surfaceTractionScore: isModerate ? 45 : 65,
      outdoorExposureRisk: isModerate ? 'HIGH' : 'MEDIUM',
      accessibilityImpact: 'Wet slippery ramps and tactile indicators. Wheelchair push-rims may be slick.',
      recommendedMitigation:
        'Engage low-speed wheelchair mode. Wear grip-assisted gloves and prioritize routes with textured rubber or covered canopies.',
    };
  }

  // 5. Extreme Heat (>36°C)
  if (tempC >= 36 || (params.apparentTempC && params.apparentTempC >= 39)) {
    return {
      hazardLevel: 'ADVISORY',
      hazardType: 'EXTREME_HEAT',
      hazardTitle: '☀️ High Thermal Index Advisory (>36°C)',
      hazardDescription:
        'Intense sunlight heating outdoor stone pavement. Hot surfaces can burn assistance animal paws; prolonged exposure causes rapid fatigue.',
      delayMinutes: 6,
      surfaceTractionScore: 90,
      outdoorExposureRisk: 'HIGH',
      accessibilityImpact: 'High heat on unshaded heritage walkways. Regular hydration stops at accessible rest pavilions required.',
      recommendedMitigation: 'Stay along misted or shaded colonnades; plan visits during morning quiet hours (06:00 AM - 08:30 AM).',
    };
  }

  // 6. Optimal Conditions
  return {
    hazardLevel: 'OPTIMAL',
    hazardType: 'NONE',
    hazardTitle: '✨ Optimal Step-Free Travel Conditions',
    hazardDescription: 'Dry, mild weather with full pathway visibility and maximum traction across all ramps and curb cuts.',
    delayMinutes: 0,
    surfaceTractionScore: 98,
    outdoorExposureRisk: 'LOW',
    accessibilityImpact: 'Dry level pathways with 98% traction score. Ideal for manual wheelchairs, strollers, and visual sensory tours.',
    recommendedMitigation: 'Standard accessibility guidelines apply. No weather-induced detour required.',
  };
}

// Weather In-memory Cache (15 minutes TTL)
const weatherCache = new Map<string, { data: WeatherData; timestamp: number }>();
const WEATHER_CACHE_TTL = 15 * 60 * 1000;

/**
 * Fetch real-time weather from Open-Meteo public API (Free, Global, Real-Time)
 */
export async function fetchPublicWeather(
  latitude: number,
  longitude: number,
  destinationName: string = 'Destination',
  surfaceType: string = 'Smooth Paving'
): Promise<WeatherData> {
  const cacheKey = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < WEATHER_CACHE_TTL) {
    return cached.data;
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m,wind_gusts_10m&hourly=temperature_2m,precipitation_probability,precipitation,snowfall,weather_code,wind_speed_10m&forecast_days=1&timezone=auto`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Open-Meteo API response status ${response.status}`);
    }

    const data = await response.json();
    const current = data.current || {};
    const tempC = Math.round((current.temperature_2m ?? 24) * 10) / 10;
    const apparentTempC = Math.round((current.apparent_temperature ?? tempC) * 10) / 10;
    const precipitationMm = Math.round((current.precipitation ?? 0) * 10) / 10;
    const snowfallCm = Math.round((current.snowfall ?? 0) * 10) / 10;
    const windSpeedKmh = Math.round(current.wind_speed_10m ?? 8);
    const windGustsKmh = Math.round(current.wind_gusts_10m ?? windSpeedKmh * 1.3);
    const relativeHumidity = Math.round(current.relative_humidity_2m ?? 55);
    const weatherCode = current.weather_code ?? 0;

    const wmoInfo = WMO_CODE_MAP[weatherCode] || { condition: 'Clear', icon: '☀️', isPrecipitation: false, isSnow: false, isStorm: false };

    // Format hourly forecast (next 8 hours)
    const hourly: HourlyWeatherPoint[] = [];
    if (data.hourly && Array.isArray(data.hourly.time)) {
      const times: string[] = data.hourly.time;
      const temps: number[] = data.hourly.temperature_2m || [];
      const probs: number[] = data.hourly.precipitation_probability || [];
      const precips: number[] = data.hourly.precipitation || [];
      const snows: number[] = data.hourly.snowfall || [];
      const codes: number[] = data.hourly.weather_code || [];
      const winds: number[] = data.hourly.wind_speed_10m || [];

      // Find current hour index or start from 0
      const now = new Date();
      const currentHour = now.getHours();

      for (let i = 0; i < Math.min(times.length, 12); i++) {
        const timeStr = times[i];
        const dateObj = new Date(timeStr);
        const hourLabel = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const hCode = codes[i] ?? 0;
        const hWmo = WMO_CODE_MAP[hCode] || { condition: 'Clear', icon: '☀️', isPrecipitation: false, isSnow: false, isStorm: false };
        const hAnalysis = analyzeAccessibilityWeather({
          tempC: temps[i] ?? tempC,
          precipitationMm: precips[i] ?? 0,
          snowfallCm: snows[i] ?? 0,
          windSpeedKmh: winds[i] ?? 10,
          weatherCode: hCode,
          rainProbability: probs[i] ?? 0,
        });

        hourly.push({
          time: hourLabel,
          tempC: Math.round(temps[i] ?? tempC),
          precipitationProbability: probs[i] ?? 0,
          precipitationMm: precips[i] ?? 0,
          snowfallCm: snows[i] ?? 0,
          condition: hWmo.condition,
          windSpeedKmh: Math.round(winds[i] ?? 10),
          isRaining: hWmo.isPrecipitation,
          isSnowing: hWmo.isSnow,
          hazardLevel: hAnalysis.hazardLevel,
        });
      }
    }

    const analysis = analyzeAccessibilityWeather({
      tempC,
      apparentTempC,
      precipitationMm,
      snowfallCm,
      windSpeedKmh,
      windGustsKmh,
      weatherCode,
      surfaceType,
    });

    const weatherResult: WeatherData = {
      temperatureC: tempC,
      temperatureF: Math.round(((tempC * 9) / 5 + 32) * 10) / 10,
      apparentTemperatureC: apparentTempC,
      condition: wmoInfo.condition,
      weatherCode,
      rainProbability: precipitationMm > 0 ? 85 : 10,
      precipitationMm,
      snowfallCm,
      windSpeedKmh,
      windGustsKmh,
      relativeHumidity,
      visibilityKm: weatherCode >= 45 && weatherCode <= 48 ? 1.5 : 10,
      accessibilityImpact: analysis.accessibilityImpact,
      bestVisitWindow: tempC > 30 ? '06:00 AM - 08:30 AM (Cooler)' : '10:00 AM - 04:00 PM',
      warning: analysis.hazardLevel !== 'OPTIMAL' ? analysis.hazardTitle : undefined,
      hazardLevel: analysis.hazardLevel,
      hazardType: analysis.hazardType,
      hazardTitle: analysis.hazardTitle,
      hazardDescription: analysis.hazardDescription,
      delayMinutes: analysis.delayMinutes,
      surfaceTractionScore: analysis.surfaceTractionScore,
      outdoorExposureRisk: analysis.outdoorExposureRisk,
      recommendedMitigation: analysis.recommendedMitigation,
      isRealTime: true,
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      hourlyForecast: hourly.slice(0, 8),
    };

    weatherCache.set(cacheKey, { data: weatherResult, timestamp: Date.now() });
    return weatherResult;
  } catch (error) {
    console.warn(`[WeatherService] Open-Meteo fetch failed for (${latitude}, ${longitude}):`, error);
    // Return high-quality fallback with realistic default
    return getFallbackWeatherData(latitude, longitude, surfaceType);
  }
}

/**
 * High quality structured fallback weather when network or offline
 */
export function getFallbackWeatherData(lat: number, lng: number, surfaceType: string = 'Sandstone'): WeatherData {
  const analysis = analyzeAccessibilityWeather({
    tempC: 28,
    precipitationMm: 0,
    snowfallCm: 0,
    windSpeedKmh: 12,
    weatherCode: 1,
    surfaceType,
  });

  return {
    temperatureC: 28,
    temperatureF: 82.4,
    apparentTemperatureC: 29,
    condition: 'Mainly Clear',
    weatherCode: 1,
    rainProbability: 5,
    precipitationMm: 0,
    snowfallCm: 0,
    windSpeedKmh: 12,
    windGustsKmh: 18,
    relativeHumidity: 50,
    visibilityKm: 10,
    accessibilityImpact: analysis.accessibilityImpact,
    bestVisitWindow: '07:00 AM - 10:00 AM',
    hazardLevel: 'OPTIMAL',
    hazardType: 'NONE',
    hazardTitle: '✨ Optimal Step-Free Travel Conditions',
    hazardDescription: 'Dry pavement with full traction. No weather barriers reported.',
    delayMinutes: 0,
    surfaceTractionScore: 96,
    outdoorExposureRisk: 'LOW',
    recommendedMitigation: 'Standard accessibility guidelines apply.',
    isRealTime: false,
    lastUpdated: 'Cached',
    hourlyForecast: [
      { time: '10:00 AM', tempC: 27, precipitationProbability: 5, precipitationMm: 0, snowfallCm: 0, condition: 'Clear', windSpeedKmh: 10, isRaining: false, isSnowing: false, hazardLevel: 'OPTIMAL' },
      { time: '12:00 PM', tempC: 29, precipitationProbability: 10, precipitationMm: 0, snowfallCm: 0, condition: 'Mainly Clear', windSpeedKmh: 12, isRaining: false, isSnowing: false, hazardLevel: 'OPTIMAL' },
      { time: '02:00 PM', tempC: 30, precipitationProbability: 10, precipitationMm: 0, snowfallCm: 0, condition: 'Partly Cloudy', windSpeedKmh: 14, isRaining: false, isSnowing: false, hazardLevel: 'OPTIMAL' },
      { time: '04:00 PM', tempC: 28, precipitationProbability: 5, precipitationMm: 0, snowfallCm: 0, condition: 'Clear', windSpeedKmh: 11, isRaining: false, isSnowing: false, hazardLevel: 'OPTIMAL' },
    ],
  };
}

/**
 * Generate simulated weather scenarios for interactive testing
 */
export function getSimulatedWeatherScenario(
  scenario: 'REAL' | 'RAIN' | 'SNOW' | 'WIND' | 'CLEAR',
  currentWeather: WeatherData,
  surfaceType: string = 'Sandstone'
): WeatherData {
  if (scenario === 'REAL') {
    return currentWeather;
  }

  if (scenario === 'RAIN') {
    const analysis = analyzeAccessibilityWeather({
      tempC: 21,
      apparentTempC: 20,
      precipitationMm: 4.8,
      snowfallCm: 0,
      windSpeedKmh: 18,
      windGustsKmh: 28,
      weatherCode: 63,
      rainProbability: 92,
      surfaceType,
    });

    return {
      ...currentWeather,
      temperatureC: 21,
      temperatureF: 69.8,
      apparentTemperatureC: 20,
      condition: 'Moderate Rain',
      weatherCode: 63,
      rainProbability: 92,
      precipitationMm: 4.8,
      snowfallCm: 0,
      windSpeedKmh: 18,
      windGustsKmh: 28,
      relativeHumidity: 88,
      visibilityKm: 6.0,
      ...analysis,
      warning: analysis.hazardTitle,
      isRealTime: true,
      lastUpdated: 'Live Simulation',
    };
  }

  if (scenario === 'SNOW') {
    const analysis = analyzeAccessibilityWeather({
      tempC: -2,
      apparentTempC: -6,
      precipitationMm: 2.2,
      snowfallCm: 3.5,
      windSpeedKmh: 24,
      windGustsKmh: 36,
      weatherCode: 73,
      rainProbability: 88,
      surfaceType,
    });

    return {
      ...currentWeather,
      temperatureC: -2,
      temperatureF: 28.4,
      apparentTemperatureC: -6,
      condition: 'Moderate Snow Fall',
      weatherCode: 73,
      rainProbability: 88,
      precipitationMm: 2.2,
      snowfallCm: 3.5,
      windSpeedKmh: 24,
      windGustsKmh: 36,
      relativeHumidity: 90,
      visibilityKm: 3.5,
      ...analysis,
      warning: analysis.hazardTitle,
      isRealTime: true,
      lastUpdated: 'Live Simulation',
    };
  }

  if (scenario === 'WIND') {
    const analysis = analyzeAccessibilityWeather({
      tempC: 18,
      apparentTempC: 15,
      precipitationMm: 0,
      snowfallCm: 0,
      windSpeedKmh: 46,
      windGustsKmh: 64,
      weatherCode: 2,
      rainProbability: 15,
      surfaceType,
    });

    return {
      ...currentWeather,
      temperatureC: 18,
      temperatureF: 64.4,
      apparentTemperatureC: 15,
      condition: 'High Wind / Gale Gusts',
      weatherCode: 2,
      rainProbability: 15,
      precipitationMm: 0,
      snowfallCm: 0,
      windSpeedKmh: 46,
      windGustsKmh: 64,
      relativeHumidity: 45,
      visibilityKm: 10,
      ...analysis,
      warning: analysis.hazardTitle,
      isRealTime: true,
      lastUpdated: 'Live Simulation',
    };
  }

  // CLEAR
  const analysis = analyzeAccessibilityWeather({
    tempC: 24,
    apparentTempC: 24,
    precipitationMm: 0,
    snowfallCm: 0,
    windSpeedKmh: 9,
    windGustsKmh: 14,
    weatherCode: 0,
    rainProbability: 0,
    surfaceType,
  });

  return {
    ...currentWeather,
    temperatureC: 24,
    temperatureF: 75.2,
    apparentTemperatureC: 24,
    condition: 'Clear Sky',
    weatherCode: 0,
    rainProbability: 0,
    precipitationMm: 0,
    snowfallCm: 0,
    windSpeedKmh: 9,
    windGustsKmh: 14,
    relativeHumidity: 45,
    visibilityKm: 10,
    ...analysis,
    warning: undefined,
    isRealTime: true,
    lastUpdated: 'Live Simulation',
  };
}
