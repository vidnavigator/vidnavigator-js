# VidNavigator JavaScript SDK

The official JavaScript SDK for the [VidNavigator Developer API](https://vidnavigator.com).

This SDK provides a convenient, fully-typed wrapper around the VidNavigator REST API, making it easy to integrate video transcription, analysis, and search into your Node.js applications.

## Features

-   **Modern TypeScript:** Fully written in TypeScript for a great developer experience with autocompletion and type-safety.
-   **Rich Object Models:** API responses are automatically converted into intuitive classes (`VideoInfo`, `FileInfo`, `AnalysisResult`, etc.).
-   **Promise-based:** All asynchronous operations return Promises for easy integration with `async/await`.
-   **Minimal Dependencies:** Lightweight and relies only on `axios` for HTTP requests and `form-data` for uploads.
-   **Node.js Support:** Optimized for server-side use in Node.js 16+.

## Installation

```bash
npm install vidnavigator
# or
yarn add vidnavigator
```

## Quick Start

First, initialize the SDK with your API key. It's recommended to store your key in an environment variable.

```ts
import { VidNavigatorClient } from 'vidnavigator';

const vn = new VidNavigatorClient({
  apiKey: process.env.VIDNAVIGATOR_API_KEY!,
});
```

Now you can easily call any of the API methods.

### Example: Get a Video Transcript

```ts
import { VidNavigatorClient, VideoInfo } from 'vidnavigator';

const vn = new VidNavigatorClient({ apiKey: 'YOUR_API_KEY' });

async function getTranscript() {
  try {
    const { video_info, transcript } = await vn.getTranscript({
      video_url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
    });

    console.log(`Title: ${video_info.title}`);
    console.log(`Is this a VideoInfo object?`, video_info instanceof VideoInfo);
    console.log('First 3 transcript segments:');
    transcript.slice(0, 3).forEach(segment => {
      console.log(`  [${segment.start.toFixed(2)}s]: ${segment.text}`);
    });
  } catch (error) {
    console.error('Failed to get transcript:', error);
  }
}

getTranscript();
```

### Example: Upload and Analyze a File

```ts
import { VidNavigatorClient } from 'vidnavigator';

const vn = new VidNavigatorClient({ apiKey: 'YOUR_API_KEY' });

async function uploadAndAnalyze(filePath: string) {
  try {
    // Upload the file and wait for processing to complete
    const { file_info } = await vn.uploadFile({ 
      filePath, 
      wait_for_completion: true 
    });
    console.log(`File '${file_info.name}' uploaded successfully.`);

    // Analyze the uploaded file
    const { transcript_analysis } = await vn.analyzeFile({ 
      file_id: file_info.id 
    });
    console.log('--- Analysis Summary ---');
    console.log(transcript_analysis.summary);

  } catch (error) {
    console.error('Operation failed:', error);
  }
}

uploadAndAnalyze('./my-meeting.mp4');
```

## API Reference

All methods return a `Promise` that resolves with an object containing rich data models.

### Transcripts
- `vn.getTranscript(payload)`

### Files
- `vn.getFiles([query])`
- `vn.getFile(file_id)`
- `vn.uploadFile(options)`
- `vn.deleteFile(file_id)`

### Analysis
- `vn.analyzeVideo(payload)`
- `vn.analyzeFile(payload)`

### Search
- `vn.searchVideos(payload)`
- `vn.searchFiles(payload)`

### System
- `vn.getUsage()`
- `vn.healthCheck()`

Please refer to the inline documentation in your IDE for detailed information on the payloads and return types for each method.


## More Examples & Documentation

For a comprehensive set of usage examples covering more SDK features, please see the [`test.py`](https://github.com/vidnavigator/vidnavigator-js/blob/main/test.js)

For full API documentation, visit [docs.vidnavigator.com](https://docs.vidnavigator.com).


## License

[Apache-2.0](./LICENSE) 