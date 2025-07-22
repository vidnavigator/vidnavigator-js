# VidNavigator JavaScript SDK

This repository contains the official JavaScript/TypeScript SDK for the VidNavigator Developer API.

## Project Structure

```
vidnavigator-js/
├── vidnavigator/           # 📦 The SDK package
│   ├── src/               # TypeScript source code
│   ├── dist/              # Compiled JavaScript (after build)
│   ├── package.json       # SDK package configuration
│   └── README.md          # SDK documentation
├── test.js                # 🧪 Local testing script
├── openapi.json           # 📋 API specification
└── README.md              # 📖 This file
```

## Quick Start

### 1. Build the SDK

```bash
cd vidnavigator
npm install
npm run build
cd ..
```

### 2. Test Locally

Create a `.env` file with your API key:
```bash
echo "VIDNAVIGATOR_API_KEY=your_api_key_here" > .env
```

Install test dependencies and run:
```bash
npm install dotenv
node test.js
```

### 3. Use in Your Project

#### Option A: Install from npm (when published)
```bash
npm install vidnavigator
```

#### Option B: Install locally for development
```bash
npm install ./vidnavigator
```

Then use in your code:
```js
const { VidNavigatorClient } = require('vidnavigator');

const sdk = new VidNavigatorClient({
  apiKey: process.env.VIDNAVIGATOR_API_KEY
});

// Get video transcript
const { video_info, transcript } = await sdk.getTranscript({
  video_url: 'https://youtube.com/watch?v=dQw4w9WgXcQ'
});
```

## Development

### Building
```bash
cd vidnavigator && npm run build
```

### Testing
```bash
node test.js
```

### Publishing to npm
```bash
cd vidnavigator
npm publish
```

## API Documentation

- Full API specification: `openapi.json`
- SDK documentation: `vidnavigator/README.md`
- Test examples: `test.js`

## License

Apache-2.0
