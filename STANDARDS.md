# Standards & Conventions

This document defines the development standards for the Palladium browser project. All contributors must read and follow these conventions.

## Branch Workflow

1. **Create a feature branch from `origin/nightly`.** Every change starts on its own branch.
   ```bash
   git checkout -b my-feature origin/nightly
   ```
2. **Merge back into `origin/nightly` when done.** Open a pull request targeting the `nightly` branch.
3. **Never merge directly into `main`.** The `main` branch is protected and only updated through the release process. Direct merges to `main` are forbidden.

## Before Merging

Every pull request must pass the following checks before merge:

- **Tests pass:** `npm test` must complete with zero failures.
- **Linting passes:** `npm run lint` must report no errors.
- **Build succeeds:** `npm run build` must complete without errors.

Do not merge a branch that has failing tests or lint errors, even if the failures appear unrelated to your changes.

## Commit Messages

- Write clear, concise commit messages that describe _what_ changed and _why_.
- Use imperative mood (e.g., "Add tab grouping" not "Added tab grouping").
- Do not include co-author attributions or references to external tooling in commit messages.

## Pull Requests

- Keep PRs focused on a single concern. Avoid bundling unrelated changes.
- PR titles should be short (under 70 characters) and descriptive.
- PR descriptions should include a summary of changes and a test plan.
- Do not reference external tooling, automation systems, or co-authors in PR titles, descriptions, or comments.

## Code Quality

- Follow the patterns documented in `CLAUDE.md` for architecture, IPC, styling, and testing.
- TypeScript strict mode is enforced. Do not use `any` without justification.
- Prefer Tailwind CSS classes over custom CSS. Use the `cn()` utility for dynamic class composition.
- Co-locate tests in `__tests__/` directories next to the source files they cover.

## Changelog

Significant changes must be documented in `CHANGELOG.md`. Add entries under an `## [Unreleased]` section at the top of the file. Use the existing format with `### Added`, `### Changed`, `### Fixed`, and `### Tests & Tooling` subsections as appropriate.

Not every change needs a changelog entry. Use your judgment — bug fixes, new features, architectural changes, and breaking changes should be documented. Minor refactors, typo fixes, and internal-only changes can be skipped.

## Documentation

- Keep `CLAUDE.md` up to date when adding new patterns or changing architecture.
- Do not reference external tooling or automation systems in any project documentation.
- Code comments should explain _why_, not _what_. Let the code speak for itself.
