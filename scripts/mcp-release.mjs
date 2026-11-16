import { appendFile, readFile } from 'node:fs/promises';

/** Validate metadata before it reaches shell commands, filenames, or job outputs. */
export function getMcpReleaseMetadata(pkg, { eventName, refType, refName }) {
  if (pkg.name !== 'browsless-mcp') throw new Error('Unexpected MCP package name');
  const version = pkg.version;
  if (typeof version !== 'string' || version.length > 100) {
    throw new Error('Invalid MCP package version');
  }
  const match = version.match(
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/
  );
  if (!match || match[0] !== version) {
    throw new Error('MCP package version must be valid SemVer');
  }
  for (const identifier of match[4]?.split('.') || []) {
    if (
      !identifier ||
      (/^\d+$/.test(identifier) && identifier.length > 1 && identifier.startsWith('0'))
    ) {
      throw new Error('Invalid SemVer prerelease identifier');
    }
  }
  if (match[5]?.split('.').some((identifier) => !identifier)) {
    throw new Error('Invalid SemVer build metadata');
  }
  const tag = `mcp-v${version}`;
  if (eventName === 'push') {
    if (refType !== 'tag' || refName !== tag) {
      throw new Error(`Release tag must exactly match packages/mcp/package.json: ${tag}`);
    }
  } else if (eventName !== 'workflow_dispatch') {
    throw new Error('Only tag pushes and manual validation runs are supported');
  }
  return {
    tag,
    version,
    filename: `browsless-mcp-${version}.tgz`,
    prerelease: Boolean(match[4]),
  };
}

if (import.meta.main) {
  const pkg = JSON.parse(
    await readFile(new URL('../packages/mcp/package.json', import.meta.url), 'utf8')
  );
  const metadata = getMcpReleaseMetadata(pkg, {
    eventName: process.env.GITHUB_EVENT_NAME,
    refType: process.env.GITHUB_REF_TYPE,
    refName: process.env.GITHUB_REF_NAME,
  });
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(
      process.env.GITHUB_OUTPUT,
      Object.entries(metadata)
        .map(([key, value]) => `${key}=${value}\n`)
        .join('')
    );
  }
  console.log(JSON.stringify(metadata, null, 2));
}
