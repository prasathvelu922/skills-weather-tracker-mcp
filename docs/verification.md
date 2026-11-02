# Weather database verification

Checked `weather.db` on 2026-11-02. The SQLite MCP tools were unavailable in
this session, so these read-only checks used the configured database file
directly.

| City | Rows | Average temperature |
|---|---:|---:|
| London | 2 | 11.35 °C |
| Pune | 1 | 25.50 °C |
| Tokyo | 1 | 12.30 °C |

## Findings

- **Web UI:** Confirmed. London row `id=4` (11.7 °C, logged at
  `2026-11-02 12:58:44`) was saved by the dashboard refresh.
- **CLI:** Rows `id=1`–`id=3` are present (Pune, Tokyo, London). The table has
  no source/provenance field, so their insertion through the CLI cannot be
  independently verified from the database.
- **Nulls:** No null values in any `weather_logs` column across the four rows.
- **Duplicate timestamps:** None for the same city. London and Tokyo share a
  timestamp, but they are different cities.
