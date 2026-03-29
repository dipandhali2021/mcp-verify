# rate-limit-check

Example mcp-verify plugin that checks whether the MCP server enforces rate limiting
by inspecting HTTP response headers for well-known rate-limit indicators.

## Usage

Create `mcp-verify.config.js` in your project root:

```js
export default {
  plugins: ['./node_modules/mcp-verify-rate-limit-check/index.js'],
  rules: {
    'rate-limit-check': {
      // Override the default severity (optional)
      severity: 'medium',
      // Override the default CVSS score (optional)
      cvssScore: 5.3,
      // Skip the check entirely (optional)
      skipRateLimitCheck: false,
    },
  },
};
```

Then run:

```sh
mcp-verify https://your-mcp-server.example.com
```

## Configuration

| Key                  | Type    | Default  | Description                                              |
|----------------------|---------|----------|----------------------------------------------------------|
| `severity`           | string  | `'low'`  | Severity of the finding: critical/high/medium/low/info   |
| `cvssScore`          | number  | `3.1`    | CVSS base score for the finding                          |
| `skipRateLimitCheck` | boolean | `false`  | Set to `true` to skip this check entirely                |

## Detection Logic

The plugin inspects all available error-probe response objects for the presence of
standard rate-limit response headers including:

- `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`
- `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- `X-Rate-Limit-Limit`, `X-Rate-Limit-Remaining`, `X-Rate-Limit-Reset`
- `Retry-After`

It also looks for HTTP 429 status codes and JSON-RPC error code `-32029`.

This is a **heuristic** check. A negative result does not guarantee that the
server has no rate limiting; the enforcement may be applied at a load balancer
or API gateway that is not directly visible at the MCP protocol layer.
