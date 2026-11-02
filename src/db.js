import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";

const databasePath = fileURLToPath(new URL("../weather.db", import.meta.url));
const database = new Database(databasePath);

// Save a weather reading using the existing weather_logs schema.
export function insertWeatherLog(weather) {
  const result = database.prepare(`
    INSERT INTO weather_logs (
      city, country, latitude, longitude, temperature_c,
      humidity, wind_kmh, condition, weather_code
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    weather.city,
    weather.country,
    weather.latitude,
    weather.longitude,
    weather.temperatureC,
    weather.humidity,
    weather.windKmh,
    weather.condition,
    weather.weatherCode,
  );

  return result.lastInsertRowid;
}

// Return the newest weather readings, bounded by the validated CLI limit.
export function listWeatherLogs(limit) {
  return database.prepare(`
    SELECT id, city, country, temperature_c, humidity, wind_kmh, condition, created_at
    FROM weather_logs
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `).all(limit);
}

// Return the latest reading and temperature aggregates for every city.
export function getCitySummaries() {
  return database.prepare(`
    SELECT
      city_stats.city,
      city_stats.country,
      latest.temperature_c AS latest_temperature_c,
      city_stats.average_temperature_c,
      city_stats.log_count,
      latest.created_at AS latest_created_at
    FROM (
      SELECT
        city COLLATE NOCASE AS city,
        MAX(country) AS country,
        AVG(temperature_c) AS average_temperature_c,
        COUNT(*) AS log_count
      FROM weather_logs
      GROUP BY city COLLATE NOCASE
    ) AS city_stats
    JOIN weather_logs AS latest
      ON latest.id = (
        SELECT id
        FROM weather_logs
        WHERE city = city_stats.city COLLATE NOCASE
        ORDER BY created_at DESC, id DESC
        LIMIT 1
      )
    ORDER BY city_stats.city COLLATE NOCASE
  `).all();
}

// Aggregate temperature readings for a city without interpolating SQL values.
export function getCityStats(city) {
  return database.prepare(`
    SELECT
      MIN(temperature_c) AS minimum,
      MAX(temperature_c) AS maximum,
      AVG(temperature_c) AS average,
      COUNT(*) AS count
    FROM weather_logs
    WHERE city = ? COLLATE NOCASE
  `).get(city);
}
