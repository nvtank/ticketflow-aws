# API — Phase 1

Base: `http://localhost:4000/api/v1`. Swagger UI:
`http://localhost:4000/api/docs` (development/test only).

| Method | Path           | Actual behavior                                               |
| ------ | -------------- | ------------------------------------------------------------- |
| GET    | `/health/live` | 200 if process serves requests                                |
| GET    | `/health`      | 200 if PostgreSQL query and Redis PING succeed, otherwise 503 |
| GET    | `/metrics`     | Measured counters for the current process, 403 in production  |

Readiness 503 deliberately returns the same health shape as readiness 200 so the
frontend can show individual dependency failures. It is not the exception format.
No driver error, password or connection URL is returned.

```json
{
  "status": "degraded",
  "service": "tixflow-api",
  "timestamp": "2026-10-22T00:00:00.000Z",
  "uptimeSeconds": 10,
  "dependencies": { "postgres": "down", "redis": "down" }
}
```

The JSON above illustrates the **response schema**, not measured runtime data.
Metrics fields: `scope: current_api_process`, `uptimeSeconds`, `httpRequestsTotal`,
`httpErrorsTotal`, `requestsByStatus`. Counters record response completion, so a
metrics request is included in the next snapshot rather than its own response.
Restarting the API resets these counters. Healthchecks and rejected requests are
included. No booking/queue/socket metrics exist before their modules are built.

Exceptions use `statusCode`, `code`, `message`, `requestId`, `timestamp` and optional
validation `details`. All requests get a server-generated `X-Request-ID`.
Unexpected errors return a generic message. Global rate limit is 120 requests per
60 seconds per IP and controller handler in one process; production/distributed
rate limiting and stricter auth policies are later work.

`/events` and all authentication, order, payment, ticket, check-in, organizer and
admin APIs are **not implemented** in Phase 1 and return 404. The event catalog
handles that response explicitly. Do not infer working ticketing from a UI route.

The backend applies a configured CORS origin allowlist with credentials enabled.
CORS is a browser policy, not authentication. No endpoint currently authorizes a
business action or exposes private records. Swagger declares bearer auth for the
future auth module; it does not imply JWT verification has been implemented.
