# Open-Meteo API Notes

## Geocoding

Request: `GET https://geocoding-api.open-meteo.com/v1/search?name={city}&count=1`

Fields used from the first item in `results`: `name` (city), `country`, `latitude`, and `longitude`.

Trimmed example from the Pune geocoding response:

```json
{
  "results": [
    {
      "name": "Pune",
      "latitude": 18.51957,
      "longitude": 73.85535,
      "country": "India"
    }
  ]
}
```

## Current Weather

Request: `GET https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`

Fields used: top-level `latitude` and `longitude`, plus `current.temperature_2m` (degrees C), `current.relative_humidity_2m` (percent), `current.wind_speed_10m` (km/h), and `current.weather_code` (WMO code). The corresponding labels are in `current_units`. Weather code `0` maps to `Clear sky` for the stored `condition`.

Trimmed example of the forecast response supplied in this session:

```json
{
  "latitude": 18.523726,
  "longitude": 73.86876,
  "current_units": {
    "temperature_2m": "°C",
    "relative_humidity_2m": "%",
    "wind_speed_10m": "km/h",
    "weather_code": "wmo code"
  },
  "current": {
    "temperature_2m": 25.5,
    "relative_humidity_2m": 72,
    "wind_speed_10m": 5.9,
    "weather_code": 0
  }
}
```

The fetch MCP tool blocked the forecast request under the host's `robots.txt` policy, so this example came from the response pasted by the user. The forecast response coordinates above differ slightly from the geocoding coordinates; the database row stores the forecast response coordinates associated with the reading.
