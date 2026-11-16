import assert from 'node:assert/strict';
import { getMcpReleaseMetadata } from './mcp-release.mjs';

const pkg = { name: 'browsless-mcp', version: '0.1.0' };
const push = { eventName: 'push', refType: 'tag', refName: 'mcp-v0.1.0' };
assert.deepEqual(getMcpReleaseMetadata(pkg, push), {
  tag: 'mcp-v0.1.0',
  version: '0.1.0',
  filename: 'browsless-mcp-0.1.0.tgz',
  prerelease: false,
});
for (const version of ['1.0.0-rc.1', '0.1.0-alpha', '2.0.0-1', '1.0.0-rc.1+build.7']) {
  assert.equal(
    getMcpReleaseMetadata(
      { ...pkg, version },
      {
        ...push,
        refName: `mcp-v${version}`,
      }
    ).prerelease,
    true
  );
}
assert.equal(
  getMcpReleaseMetadata(
    { ...pkg, version: '1.0.0+build-7' },
    {
      ...push,
      refName: 'mcp-v1.0.0+build-7',
    }
  ).prerelease,
  false
);
assert.equal(
  getMcpReleaseMetadata(pkg, {
    eventName: 'workflow_dispatch',
    refType: 'branch',
    refName: 'master',
  }).version,
  '0.1.0'
);
for (const version of [
  '01.0.0',
  '0.1',
  '1.0.0-01',
  '1.0.0-a..b',
  '1.0.0+.',
  '1.0.0\nbad',
  '1.0.0\n',
  '1.0.0\r\n',
  '1.0.0;echo bad',
  '../bad',
  null,
]) {
  assert.throws(() => getMcpReleaseMetadata({ ...pkg, version }, push));
}
assert.throws(() => getMcpReleaseMetadata({ ...pkg, name: 'another-package' }, push));
assert.throws(() => getMcpReleaseMetadata(pkg, { ...push, refName: 'mcp-v0.2.0' }));
assert.throws(() => getMcpReleaseMetadata(pkg, { ...push, refType: 'branch' }));
assert.throws(() => getMcpReleaseMetadata(pkg, { ...push, eventName: 'pull_request' }));
console.log('MCP release metadata checks passed.');
