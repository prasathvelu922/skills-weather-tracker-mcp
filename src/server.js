import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  getCitySummaries,
  insertWeatherLog,
  listWeatherLogs,
} from "./db.js";
import {
  fetchCurrentWeather,
  UnknownCityError,
  WeatherServiceError,
} from "./weather.js";

const PORT = 3000;
const dashboardPath = fileURLToPath(new URL("../public/index.html", import.meta.url));

// Send a JSON response with consistent headers.
function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(payload));
}

// Route dashboard requests to the existing weather and database modules.
async function handleRequest(request, response) {
  const url = new URL(request.url, "http://localhost");

  if (url.pathname === "/api/logs" && request.method === "GET") {
    sendJson(response, 200, listWeatherLogs(50));
    return;
  }

  if (url.pathname === "/api/summary" && request.method === "GET") {
    sendJson(response, 200, getCitySummaries());
    return;
  }

  if (url.pathname === "/api/refresh" && request.method === "POST") {
    const city = url.searchParams.get("city")?.trim();
    if (!city || city.length > 120) {
      sendJson(response, 400, { error: "Enter a city name (up to 120 characters)." });
      return;
    }

    const weather = await fetchCurrentWeather(city);
    const id = insertWeatherLog(weather);
    sendJson(response, 201, { id, weather });
    return;
  }

  if (request.method !== "GET") {
    response.writeHead(405, { Allow: "GET, POST" });
    response.end("Method not allowed.");
    return;
  }

  if (url.pathname === "/" || url.pathname === "/index.html") {
    const html = await readFile(dashboardPath);
    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(html);
    return;
  }

  sendJson(response, 404, { error: "Not found." });
}

// Convert request failures into explicit, stack-free HTTP errors.
async function handleRequestSafely(request, response) {
  try {
    await handleRequest(request, response);
  } catch (error) {
    if (response.headersSent) {
      response.destroy(error);
      return;
    }

    if (error instanceof UnknownCityError) {
      sendJson(response, 404, { error: error.message });
      return;
    }

    if (error instanceof WeatherServiceError) {
      sendJson(response, 502, { error: error.message });
      return;
    }

    console.error("Dashboard request failed:", error);
    sendJson(response, 500, { error: "The dashboard could not complete that request." });
  }
}

const server = createServer(handleRequestSafely);

server.listen(PORT, () => {
  console.log(`Weather dashboard is available at http://localhost:${PORT}`);
});
