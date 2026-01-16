# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Sidebar implemented as a `TreeDataProvider` with grouping by rule and quick actions (open file at line, export TXT).
- Language contribution for ADVPL with extensions `.prw`, `.prx`, `.tlpp` and `language-configuration.json`.

### Changed

- `advpl/hungarian-notation`: relaxed heuristics — skip name checks when a declaration is initialized from another identifier or from a function call; improved handling for prefix `b` (accepts `Nil` or code-block initializers like `{|| ... }`).
- `advpl/no-unused-local`: improved masking to only mask the declaration line and fixed line/column calculation so diagnostics point to the declared identifier position.
- Diagnostics publication is configurable via `lint-advpl.showInProblems` and `lint-advpl.editorUnderline` (control Problems panel and editor squiggles).
- README rewritten and reorganized with clearer usage, configuration and emojis for Marketplace presentation.
- Icons updated (activity bar/sidebar SVG and marketplace PNG). See `media/` for assets.

### Fixed

- Off-by-one / incorrect column for `no-unused-local` diagnostic positions.

### Notes

- If you plan to publish a new Marketplace release, bump the `version` in `package.json`, update the Release Notes/CHANGELOG entry with the version/date, then run `vsce package` / `vsce publish`.

---

If you want, I can (a) add a Git-style changelog entry with version and date, (b) generate release notes from this content, or (c) commit and tag the code for release.

# Change Log

All notable changes to the "lint-advpl-tlpp-by-filhoirineu" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

- Initial release
