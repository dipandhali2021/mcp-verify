# custom-auth-check

Example mcp-verify plugin that checks whether the MCP server advertises an authentication mechanism in its `initialize` response.

## Usage

Create `mcp-verify.config.js` in your project root:

```js
export default {
  plugins: ['./node_modules/mcp-verify-custom-auth-check/index.js'],
  rules: {
    'custom-auth-check': {
      // Override the default severity (optional)
      severity: 'high',
      // Override the default CVSS score (optional)
      cvssScore: 7.5,
      // Skip the check entirely (optional)
      skipAuthCheck: false,
    },
  },
};
```

Then run:

```sh
mcp-verify https://your-mcp-server.example.com
```

## Configuration

| Key             | Type    | Default    | Description                                              |
|-----------------|---------|------------|----------------------------------------------------------|
| `severity`      | string  | `'medium'` | Severity of the finding: critical/high/medium/low/info   |
| `cvssScore`     | number  | `6.5`      | CVSS base score for the finding                          |
| `skipAuthCheck` | boolean | `false`    | Set to `true` to skip this check entirely                |

## Detection Logic

The plugin inspects the top-level keys of the `initialize` response object and
looks for any key matching common authentication-related names (auth,
authentication, authorization, security, oauth, token, apiKey, etc.).

This is a **heuristic** check. A negative result does not guarantee that the
server is unauthenticated; the authentication mechanism may be enforced at the
transport layer and not reflected in the MCP protocol metadata.
