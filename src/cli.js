import {
  getCityStats,
  insertWeatherLog,
  listWeatherLogs,
} from "./db.js";
import {
  fetchCurrentWeather,
  UnknownCityError,
  WeatherServiceError,
} from "./weather.js";

// Render headers and rows as a readable, dynamically sized terminal table.
function formatTable(headers, rows) {
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => String(row[index] ?? "").length)),
  );
  const separator = `+${widths.map((width) => "-".repeat(width + 2)).join("+")}+`;
  const formatRow = (row) =>
    `| ${row.map((cell, index) => String(cell ?? "").padEnd(widths[index])).join(" | ")} |`;

  return [
    separator,
    formatRow(headers),
    separator,
    ...rows.map(formatRow),
    separator,
  ].join("\n");
}

// Add one current weather reading for a geocoded city.
async function addCity(city) {
  const weather = await fetchCurrentWeather(city);
  const id = insertWeatherLog(weather);
  console.log(
    `Saved weather for ${weather.city}, ${weather.country}: ` +
    `${weather.temperatureC}°C, ${weather.condition} (log #${id}).`,
  );
}

// List recent weather readings, defaulting to the newest ten rows.
function showWeatherLogs(args) {
  let limit = 10;
  if (args.length > 0) {
    if (args.length !== 2 || args[0] !== "--limit") {
      throw new Error('Usage: node src/cli.js list [--limit N]');
    }

    limit = Number(args[1]);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000) {
      throw new Error("The list limit must be an integer between 1 and 1000.");
    }
  }

  const logs = listWeatherLogs(limit);
  if (logs.length === 0) {
    console.log("No weather logs found.");
    return;
  }

  const rows = logs.map((log) => [
    log.id,
    `${log.city}${log.country ? `, ${log.country}` : ""}`,
    `${log.temperature_c}°C`,
    `${log.humidity}%`,
    `${log.wind_kmh} km/h`,
    log.condition,
    log.created_at,
  ]);
  console.log(formatTable(
    ["ID", "City", "Temperature", "Humidity", "Wind", "Condition", "Logged at"],
    rows,
  ));
}

// Show temperature aggregates for all logs matching a city name.
function showCityStats(city) {
  const stats = getCityStats(city);
  if (stats.count === 0) {
    console.log(`No weather logs found for "${city}".`);
    return;
  }

  const temperature = (value) =>
    Number.isFinite(value) ? `${value.toFixed(1)}°C` : "N/A";

  console.log(`Weather statistics for ${city}:`);
  console.log(`  Logs: ${stats.count}`);
  console.log(`  Minimum: ${temperature(stats.minimum)}`);
  console.log(`  Maximum: ${temperature(stats.maximum)}`);
  console.log(`  Average: ${temperature(stats.average)}`);
}

// Dispatch the CLI command and turn failures into friendly, stack-free messages.
async function main(args) {
  const [command, ...commandArgs] = args;

  if (command === "add" && commandArgs.length === 1 && commandArgs[0].trim()) {
    await addCity(commandArgs[0].trim());
    return;
  }

  if (command === "list") {
    showWeatherLogs(commandArgs);
    return;
  }

  if (command === "stats" && commandArgs.length === 1 && commandArgs[0].trim()) {
    showCityStats(commandArgs[0].trim());
    return;
  }

  throw new Error(
    'Usage: node src/cli.js add "<city>" | list [--limit N] | stats "<city>"',
  );
}

main(process.argv.slice(2)).catch((error) => {
  if (error instanceof UnknownCityError || error instanceof WeatherServiceError) {
    console.error(error.message);
  } else {
    console.error(`Error: ${error.message}`);
  }
  process.exitCode = 1;
});
