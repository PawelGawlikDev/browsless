# Multi-step playground packages

Development mode automatically seeds six packages into the **Library** when the package store loads. Open the dashboard/library after starting `bun run dev`. Existing packages and edits are preserved; deleted test packages are not recreated automatically.

| Package                                | Internal steps | Coverage                                                                                                         |
| -------------------------------------- | -------------: | ---------------------------------------------------------------------------------------------------------------- |
| Profile form                           |             14 | Fill fields, select country/plan/interests, agree to terms, submit, capture JSON, verify values                  |
| Native inputs and editable text        |             11 | Number/date/time/range/color/select/editable text, read back values, check disabled/read-only controls           |
| Extract and filter catalog             |              7 | Extract names/prices, filter, capture status, verify the matching row, clear filter, verify restoration          |
| Save and cancel dialog                 |              9 | Open, fill, save, capture/check result, reopen, cancel, capture/check result                                     |
| Clicks, visibility and delayed content |             11 | Click twice, double-click, capture counters, reveal content, load/wait for delayed content, verify, hide, verify |
| Iframe round trip                      |              7 | Switch into frame, type, click, extract, return to main document, read title, verify                             |

All packages use the test-tube icon and expose named **Start test** / **Test finished** connections. They are enabled as reusable blocks. They expect a fresh playground page, with the main document selected. They do not create tabs or add scrolling internally.

## Run the package tests

The saved main playground workflow JSON files (Profile form, Native inputs, Catalog, Dialog, Waiting, and Iframe) embed these packages directly. **Playground · Run all playground workflows** includes all six package-based tests plus the direct Shadow DOM and CSV cases. Its summary verifies package return connections as well as the internal checks. Existing development workflows are never overwritten; import the saved JSON if you want a new copy.

The workflow dashboard automatically adds:

- Six **Playground · Package · …** workflows. Each opens a fresh page, scrolls once to the appropriate section, runs the embedded package, and executes a block after its output.
- **Playground · Run all package tests**, which runs all six wrappers sequentially. Inspect `results` and `allPassed` in the execution log.

Individual wrappers expose `result.passed`, `result.checks`, `packageStepCount`, and `packageReturned`. `packageReturned: true` proves the package's output continued into the next workflow block, not that all internal checks passed. Inspect `result` too.

Packages embedded in workflows are **snapshots**, matching the extension's existing package behavior. Editing a Library package does not silently replace an already embedded copy. Edit the embedded package in the workflow or add the revised Library package to use your changes. The automatic loader preserves both kinds of local edits.

## Saved JSON fixtures

These files are maintained directly in the repository, with no generation step:

- `test-page/packages/*.browsless-pkg.json` — individual Library package imports.
- `test-page/workflows/package-*.browsless.json` — individual wrapper workflow imports.
- `test-page/workflows/all-packages.browsless.json` — the package suite and its six included wrappers. Embedded packages make these workflows independent of Library import order.

For a manual import, use **Import** in the Library for package files, and **Import workflow** for workflow files. No import is necessary for newly seeded development fixtures. Enable **Allow access to file URLs** in Chrome's extension details.

`src/utils/developmentFixtures.ts` loads the saved package JSON files directly, only in development. To change a test, edit the JSON, not TypeScript workflow-builder code. Remember that standalone Library packages and embedded workflow packages are separate saved snapshots: update the embedded copy too when changing its test sequence.
