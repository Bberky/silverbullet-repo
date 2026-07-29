# Repository Guidelines

## Project Structure & Module Organization

This repository collects libraries for the SilverBullet note-taking app. `REPO.md` is the remote-library catalog; keep its name, author, description, and GitHub URI synchronized with each published library. Implementations live under `libs/<library-name>/` as self-contained Markdown files, for example `libs/navigator/Navigator.md`. Each file combines YAML front matter, user documentation, and fenced `space-lua` source. `plugins/` is reserved for future plugins and is currently empty. Keep general repository context in `README.md`.

## Build, Test, and Development Commands

There is no package manager, build script, or automated test runner in this repository. Useful repository checks are:

- `git diff --check` — detect trailing whitespace and malformed patches.
- `rg -n '^```space-lua' libs` — locate executable library blocks.
- `git status --short` — confirm that only intended files changed.

For functional validation, load the changed library in a compatible SilverBullet space and exercise its documented commands. When changing `REPO.md`, verify that every URI resolves to the corresponding file on the default branch.

## Coding Style & Naming Conventions

Use descriptive Markdown headings and concise, task-oriented documentation. Preserve YAML front matter at the top of each library file. In Space Lua, use two-space indentation, camelCase for functions and variables, and a library-specific table namespace such as `navigator` or `indexShortcuts`. Use human-readable command names (`Navigate: Parent Page`) and kebab-case slash commands (`index-nested`). Directory names should be lowercase kebab-case; library filenames and catalog names should remain consistent with existing entries.

## Testing Guidelines

No coverage threshold or test framework is configured. Manually test the normal path, cancellation, missing-page or empty-result cases, and any configuration defaults affected by the change. Confirm that commands, widgets, and action buttons shown in the documentation match their registered names. Note the SilverBullet version used and the scenarios tested in the pull request.

## Commit & Pull Request Guidelines

Recent descriptive commits use short Conventional Commit subjects such as `feat: implement navigator` and `fix: HelloWorld lib uri`. Follow that imperative `<type>: <summary>` pattern; avoid generic messages such as `Commit`. Pull requests should explain user-visible behavior, list manual verification steps, link relevant issues, and include screenshots or a short recording for UI changes. Keep unrelated libraries out of the same change.

## Security & Configuration

Never commit space contents, credentials, tokens, or machine-specific paths. Shell-backed libraries must pass arguments as arrays, check exit codes, and document potentially destructive or remote operations clearly.
