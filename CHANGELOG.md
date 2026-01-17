# Changelog

All notable changes to this project will be documented in this file.

This project follows the Keep a Changelog format and aims to use Semantic Versioning.

## [0.0.5] - 2026-01-17

Small release with heuristics improvements, new initializer suggestions and better WSMETHOD handling.

### Added

- Config `lint-advpl.hungarianSuggestInitializers` (default: true) to enable/disable prefix-based initializer suggestions.
- Initializer suggestions for common Hungarian prefixes (`a`,`c`,`s`,`n`,`l`,`o`,`j`,`u`,`x`,`b`) when a variable is declared without initializer.

### Changed

- `WSMETHOD`/`WSRESTFUL` parsing improved so method names are correctly extracted (e.g. `reImprime` instead of `GET`).
- `advpl/suggest-default-for-params` now skips suggestions inside `WSMETHOD`/`WSREST` implementations to reduce false positives on endpoints.
- `Local <name> As <Type>` parsing fixed so type names (ex.: `Array`) are not treated as identifiers by rules.
- Diagnostic messages normalized to single-line format for better Problems panel rendering.

### Fixed

- Reduced multiple false positives on declaration lines (now a single, focused initializer suggestion when appropriate).

## [Unreleased]

Work in progress: further tuning and documentation updates.

## [0.0.2] - 2026-01-16

### Added

- Sidebar implemented as a `TreeDataProvider` with grouping by rule and quick actions (open file at line, export TXT).
- Language contribution for ADVPL with extensions `.prw`, `.prx`, `.tlpp` and `language-configuration.json`.
- Commands to open issues in editor and export sidebar items to TXT for offline review.

### Changed

- `advpl/hungarian-notation`: relaxed heuristics — skip name checks when a declaration is initialized from another identifier or from a function call; improved handling for prefix `b` (accepts `Nil` or code-block initializers like `{|| ... }`).
- `advpl/no-unused-local`: improved masking to only mask the declaration line and fixed line/column calculation so diagnostics point to the declared identifier position.
- Diagnostics publication is configurable via `lint-advpl.showInProblems` and `lint-advpl.editorUnderline` (control Problems panel and editor squiggles).
- README rewritten and reorganized with clearer usage, configuration and Marketplace-ready content.
- Icons updated (activity bar/sidebar SVG and marketplace PNG). See `media/` for assets.

### Fixed

- Fixed off-by-one / incorrect column for `no-unused-local` diagnostic positions.
- Reduced false-positives for unused-local when usage occurs inside initializer strings; declaration-line masking applied.

### Notes

- `package.json` now includes an `icon` pointing to `media/market-icon.png` (used by packaged VSIX / Marketplace). If the installed VSIX does not show the icon, uninstall the previous extension and reinstall the new package, or publish to the Marketplace to have it displayed online.
- Recommended: replace the current `LICENSE` stub with the full GPL-3.0 text before publishing.

---

For guidance on writing changelog entries see: http://keepachangelog.com/

## [0.0.4] - 2026-01-16

### Added

- New rule `advpl/require-explicit-private`: detects uses of `SetPrvt("A,B,C")` and suggests explicit `Private` declarations with heuristic initializers; suggestions are grouped per `SetPrvt` call.
- New configuration `lint-advpl.ignoredNames` to allow per-project exceptions for `no-unused-local`.

### Changed

- `advpl/no-unused-local`: when a variable is declared as `Private`, search the whole document (masking the declaration line) so usages in other functions are recognized; default project exceptions include `aRotina`, `cCadastro`.
- `advpl/hungarian-notation`: added minimal-length validation and refined heuristics for initializers.
- README updated and simplified for Marketplace readiness.

### Fixed

- Grouped SetPrvt suggestions into a single diagnostic per call (was one per variable).
- Reduced false-positives for unused-local and adjusted positional diagnostics.
