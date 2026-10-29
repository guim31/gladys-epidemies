# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [semantic versioning](https://semver.org/).

Describe each change under `## [Unreleased]` as you make it. The Release
workflow moves that section under the version it ships, and the section becomes
the notes of the version's GitHub Release.

## [Unreleased]

## [1.0.0] - 2026-10-29

### Added

- One device per area followed (the 13 regions of metropolitan France, and metropolitan France
  as a whole), with the weekly rate per 100,000 inhabitants of acute respiratory infections,
  acute diarrhoea and chickenpox, their trend and the week of the data, from the Sentinelles
  network (Inserm, Sorbonne Université).
- Scene triggers: an epidemic rate rises above, or falls below, a chosen threshold.
- Scene action: the week of an area in one sentence, ready for a notification.
- Dashboard widget: the diseases of an area with their rate and trend.
- Feature names and texts in English, French, German and Spanish.

[Unreleased]: https://github.com/guim31/gladys-epidemies/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/guim31/gladys-epidemies/releases/tag/v1.0.0
