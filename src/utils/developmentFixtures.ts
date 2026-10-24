// Saved JSON is the source of truth. Never generate or rewrite workflow graphs here.
import type { DeepPartial, SavedPackage, Workflow } from '../types/models';
import playground from '../../test-page/workflows/all-playground.browsless.json';
import packageTests from '../../test-page/workflows/all-packages.browsless.json';
import profile from '../../test-page/packages/profile.browsless-pkg.json';
import inputs from '../../test-page/packages/inputs.browsless-pkg.json';
import catalog from '../../test-page/packages/catalog.browsless-pkg.json';
import dialog from '../../test-page/packages/dialog.browsless-pkg.json';
import waiting from '../../test-page/packages/waiting.browsless-pkg.json';
import iframe from '../../test-page/packages/iframe.browsless-pkg.json';

const { includedWorkflows: playgroundWorkflows, ...playgroundSuite } = playground;
const { includedWorkflows: packageWorkflows, ...packageSuite } = packageTests;

export const developmentWorkflows: DeepPartial<Workflow>[] = [
  ...Object.values(playgroundWorkflows),
  playgroundSuite,
  ...Object.values(packageWorkflows),
  packageSuite,
];

export const developmentPackages: SavedPackage[] = [
  profile,
  inputs,
  catalog,
  dialog,
  waiting,
  iframe,
];
