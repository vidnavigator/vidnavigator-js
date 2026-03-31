# VidNavigator JavaScript SDK

This repository contains the official JavaScript/TypeScript SDK for the [VidNavigator Developer API](https://vidnavigator.com).

## Project Structure

```
vidnavigator-js/
├── vidnavigator/              # The npm package (published to npm)
│   ├── src/                   # TypeScript source
│   ├── dist/                  # Compiled output (after build)
│   ├── package.json
│   └── README.md              # SDK documentation (shown on npm)
├── tests/                     # Test suites
│   ├── helpers.js             # Shared setup and assertions
│   ├── unit.test.js           # Offline model / error / export tests
│   ├── integration.test.js    # Live API endpoint tests
│   ├── files.test.js          # File upload lifecycle tests
│   └── media/                 # Test fixtures (git-ignored)
├── scripts/
│   └── verify-distribution.js # Pack + install + test against tarball
├── openapi.json               # OpenAPI spec (API contract reference)
├── CONTRIBUTING.md            # Dev workflow, testing, and publishing guide
└── README.md                  # This file
```

## Quick Start

```bash
# 1. Build the SDK
cd vidnavigator && npm install && npm run build && cd ..

# 2. Set up your API key
echo "VIDNAVIGATOR_API_KEY=your_key_here" > .env

# 3. Install root dependencies and run tests
npm install
npm test
```

## Using the SDK

Install from npm:

```bash
npm install vidnavigator
```

```js
const { VidNavigatorClient } = require('vidnavigator');

const vn = new VidNavigatorClient({
  apiKey: process.env.VIDNAVIGATOR_API_KEY,
});

const { video_info, transcript } = await vn.getYouTubeTranscript({
  video_url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
});
```

For full SDK documentation, see [`vidnavigator/README.md`](./vidnavigator/README.md).

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the complete development workflow, including:

- How to build and test
- Test suite breakdown (unit, integration, file lifecycle)
- How to verify the distribution before publishing
- Step-by-step publishing and release process

## License

Apache-2.0
