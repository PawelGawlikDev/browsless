# Connect external AI applications to Browsless

The local MCP companion lives in `packages/mcp/`. It lets installed users build
general automation workflows from an external AI application. Provider selection
and credentials remain in that application.

See [the companion README](../packages/mcp/README.md) for setup, Claude/Codex
configuration, pairing, tool examples, and GitHub Release distribution.

Tag pushes matching `mcp-v<package version>` are published by
`.github/workflows/release-mcp.yml` after validation and archive-install checks.
Manual workflow runs are dry runs. See the companion README for release steps.

## Development

```sh
bun install
bun run build:mcp
bun run check:mcp
bun run typecheck:mcp
bun run typecheck
bun run lint
bun run build
```

`check:mcp` requires the companion build. It exercises validation, compilation,
bridge authentication and request handling, and a real Node stdio MCP session
with a simulated extension. It does not claim to be a Chrome UI/E2E test.
To repeat the packaged-install check, set `BROWSLESS_MCP_ARCHIVE` to a locally
packed archive's absolute path when running `bun run check:mcp`.

No new extension permissions or manifest endpoints are introduced. The dashboard
uses existing site access to make requests to `http://127.0.0.1:<port>`.

## Boundaries

```text
AI client → MCP stdio → companion → authenticated loopback HTTP → open dashboard
                                                               ↓
                                                disabled workflow draft in storage
```

- The HTTP bridge is private and is **not** an HTTP MCP transport.
- Exact loopback Host validation and Chrome-extension Origin checks protect
  against browser-origin and DNS-rebinding requests. Pairing additionally requires
  a 128-bit one-time code, then a 256-bit bearer token bound to that extension
  origin. Origin alone is not authentication.
- Pairing expires in ten minutes and is rate-limited. Sessions and tokens stay in
  memory. Closing/suspending the dashboard window expires the session, and disconnect
  revokes it. There is no automatic reconnect to an unapproved companion.
- The user grants block discovery, validation, and **new disabled draft creation**
  only. There is no execution tool, workflow read/update/delete tool, page access,
  credentials access, or automatic trigger registration.
- The extension revalidates requests, applies graph and payload limits, rejects
  unsafe JSON keys, and rate-limits draft creation.
- Creation is not retried on ambiguous timeouts. Revoking while a storage write is
  already in progress cannot undo that write; the saved workflow remains disabled.
- Bridge version 1 is checked during pairing. The extension's live registry is the
  source of block metadata, so companion catalog snapshots cannot silently drift.

## Workflow contract

`src/mcp/protocol.ts` defines transport messages and the public graph shape.
`src/mcp/workflows.ts` validates and compiles graphs to native nodes/edges and
copies defaults from the existing registry.

The MCP contract supports ordinary native blocks, branches, loops, JavaScript,
tables, and templates, subject to manual review. There is no separate test-file
format or file-based AI authoring CLI.
Block packages, embedded groups, and editor-only notes are excluded for now.
Block schemas are explicitly **default-derived**, not exhaustive descriptions of
all nested configuration semantics. Unknown data fields are warned about, not
silently claimed valid.

Use the existing Element exists and Conditions blocks with their action/fallback
connections for checks and branching.

## Manual Chrome check

1. Load the production build and configure your AI client's local companion path.
2. Call `get_connection_info`; pair in Settings → External AI.
3. Confirm the dashboard status notice stays connected across route changes.
4. Call `list_blocks`, then get schemas for trigger, new-tab, and get-text.
5. Validate and create the example in the companion README.
6. Open the returned draft, check its graph and disabled state; it must not run or
   register any automatic trigger.
7. Disconnect. Further tools requiring extension access should fail.
8. Confirm an invalid pairing code and ordinary website Origin are rejected.
