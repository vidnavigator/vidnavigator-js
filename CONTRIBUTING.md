# Contributing to VidNavigator JS SDK

This guide covers the development workflow: building, testing, and publishing a new version.

## Prerequisites

- Node.js 16+
- npm
- A VidNavigator API key (for integration tests)

## Setup

```bash
# Install SDK dependencies
cd vidnavigator
npm install
cd ..

# Install root dev dependencies (dotenv for tests)
npm install

# Create your .env file
echo "VIDNAVIGATOR_API_KEY=your_key_here" > .env
```

## Building

The SDK source is TypeScript in `vidnavigator/src/`. Build to JavaScript with:

```bash
cd vidnavigator
npm run build        # compiles to vidnavigator/dist/
```

Build runs automatically before `npm publish` via the `prepublishOnly` hook.

## Testing

Tests live in `tests/` and are plain Node.js scripts (no test framework required).

| Command | Scope | Network? | Duration |
|---|---|---|---|
| `npm run test:unit` | Models, errors, exports, method existence | No | ~1s |
| `npm run test:integration` | Every live API endpoint (health, usage, transcripts, transcribe, analyze, namespaces, extract, search, errors) | Yes | ~60-90s |
| `npm run test:files` | Full file lifecycle: upload `tests/media/video-test.mp4`, poll, get, analyze, extract, delete | Yes | ~3-5 min |
| `npm test` | Unit + integration | Yes | ~60-90s |
| `npm run test:all` | Unit + integration + files | Yes | ~5 min |

### Test media files

Test fixtures (e.g. `video-test.mp4`) go in `tests/media/`. This directory is git-ignored because we don't version large binary files. To run the file lifecycle tests, place a video or audio file at `tests/media/video-test.mp4`.

### Shared helpers

`tests/helpers.js` provides:
- SDK import logic (local vs packed distribution via `VIDNAVIGATOR_TEST_PACK`)
- `makeClient()` — creates a `VidNavigatorClient` from `.env`
- `withTimeout()` — wraps promises with a deadline
- `assert()` / `pass()` / `fail()` / `summary()` — lightweight test assertions

## Publishing a New Version

### 1. Update the version

Bump the version in **two places** (keep them in sync):

- `vidnavigator/package.json` — the `"version"` field
- `vidnavigator/src/index.ts` — the `SDK_VERSION` constant

### 2. Run all tests

```bash
npm run test:all
```

Make sure unit and integration tests pass. File tests may skip gracefully if the upload API is temporarily unavailable.

### 3. Verify the distribution

This is the critical step. It simulates what a real consumer gets when they `npm install vidnavigator`:

```bash
npm run verify-dist
```

What it does:
1. Builds the SDK (`tsc`)
2. Runs `npm pack` to create `vidnavigator-X.Y.Z.tgz`
3. Creates a temporary `dist-verify/` consumer project
4. Installs the `.tgz` tarball into it (exactly like `npm install`)
5. Runs a smoke test against the installed package (version, exports, health check)
6. Runs the full unit and integration test suites against the packed artifact

If this passes, the tarball is safe to publish.

### 4. Publish

```bash
cd vidnavigator
npm publish
```

Or for a dry run first:

```bash
cd vidnavigator
npm publish --dry-run
```

### 5. Tag and push

```bash
git add -A
git commit -m "release: vX.Y.Z"
git tag vX.Y.Z
git push && git push --tags
```

## Project Structure

```
vidnavigator-js/
├── vidnavigator/              # The npm package
│   ├── src/                   # TypeScript source
│   │   ├── index.ts           # Client class and all public API methods
│   │   ├── errors.ts          # Error classes (one per HTTP status)
│   │   └── models/            # Typed response models
│   ├── dist/                  # Compiled JS (git-ignored in SDK, included in tarball)
│   ├── package.json           # Package metadata (version lives here)
│   └── README.md              # Public-facing SDK documentation (shown on npm)
├── tests/
│   ├── helpers.js             # Shared setup and assertions
│   ├── unit.test.js           # Offline tests (no API key needed)
│   ├── integration.test.js    # Live endpoint tests
│   ├── files.test.js          # File upload lifecycle tests
│   └── media/                 # Test fixtures (git-ignored)
├── scripts/
│   └── verify-distribution.js # Distribution verification script
├── openapi.json               # OpenAPI spec (source of truth for the API contract)
├── .env                       # API key (git-ignored)
├── .gitignore
├── CONTRIBUTING.md            # This file
├── LICENSE
└── README.md                  # Repo overview
```

## API Spec

The `openapi.json` at the repo root is the source of truth. When the API changes:

1. Update `openapi.json`
2. Update the relevant models in `vidnavigator/src/models/`
3. Update the client methods in `vidnavigator/src/index.ts`
4. Update tests to cover the new fields/endpoints
5. Follow the publishing steps above
