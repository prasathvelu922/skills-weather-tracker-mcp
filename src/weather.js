const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const CURRENT_FIELDS = "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code";

export class UnknownCityError extends Error {}

export class WeatherServiceError extends Error {}

const weatherConditions = new Map([
  [0, "Clear sky"],
  [1, "Mainly clear"],
  [2, "Partly cloudy"],
  [3, "Overcast"],
  [45, "Fog"],
  [48, "Freezing fog"],
  [51, "Light drizzle"],
  [53, "Moderate drizzle"],
  [55, "Dense drizzle"],
  [56, "Light freezing drizzle"],
  [57, "Dense freezing drizzle"],
  [61, "Light rain"],
  [63, "Moderate rain"],
  [65, "Heavy rain"],
  [66, "Light freezing rain"],
  [67, "Heavy freezing rain"],
  [71, "Light snow"],
  [73, "Moderate snow"],
  [75, "Heavy snow"],
  [77, "Snow grains"],
  [80, "Light rain showers"],
  [81, "Moderate rain showers"],
  [82, "Violent rain showers"],
  [85, "Light snow showers"],
  [86, "Heavy snow showers"],
  [95, "Thunderstorm"],
  [96, "Thunderstorm with light hail"],
  [99, "Thunderstorm with heavy hail"],
]);

// Fetch JSON from Open-Meteo and surface HTTP, network, and response errors clearly.
async function fetchJson(url, description) {
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  } catch (error) {
    throw new WeatherServiceError(
      `${description} request failed: ${error.message}`,
      { cause: error },
    );
  }

  if (!response.ok) {
    throw new WeatherServiceError(`${description} request failed with HTTP ${response.status}.`);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new WeatherServiceError(`${description} returned invalid JSON.`, { cause: error });
  }
}

// Fetch current conditions for a city, returning values ready for the database.
export async function fetchCurrentWeather(city) {
  const geocodingUrl = new URL(GEOCODING_URL);
  geocodingUrl.search = new URLSearchParams({ name: city, count: "1" });
  const geocoding = await fetchJson(geocodingUrl, "City lookup");
  const location = geocoding.results?.[0];

  if (!location) {
    throw new UnknownCityError(`No matching city found for "${city}".`);
  }

  if (
    typeof location.name !== "string" ||
    !Number.isFinite(location.latitude) ||
    !Number.isFinite(location.longitude)
  ) {
    throw new WeatherServiceError("City lookup returned incomplete location details.");
  }

  const forecastUrl = new URL(FORECAST_URL);
  forecastUrl.search = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: CURRENT_FIELDS,
  });
  const forecast = await fetchJson(forecastUrl, "Weather lookup");
  const current = forecast.current;

  if (
    !current ||
    !Number.isFinite(current.temperature_2m) ||
    !Number.isFinite(current.relative_humidity_2m) ||
    !Number.isFinite(current.wind_speed_10m) ||
    !Number.isInteger(current.weather_code) ||
    !Number.isFinite(forecast.latitude) ||
    !Number.isFinite(forecast.longitude)
  ) {
    throw new WeatherServiceError("Weather lookup returned incomplete current conditions.");
  }

  return {
    city: location.name,
    country: location.country ?? null,
    latitude: forecast.latitude,
    longitude: forecast.longitude,
    temperatureC: current.temperature_2m,
    humidity: current.relative_humidity_2m,
    windKmh: current.wind_speed_10m,
    condition:
      weatherConditions.get(current.weather_code) ??
      `Unknown (WMO code ${current.weather_code})`,
    weatherCode: current.weather_code,
  };
}
