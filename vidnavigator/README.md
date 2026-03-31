# VidNavigator SDK for JavaScript

The official JavaScript/TypeScript SDK for the [VidNavigator Developer API](https://vidnavigator.com) — the fastest way to transcribe, analyze, search, and extract structured data from video and audio content.

[![npm version](https://img.shields.io/npm/v/vidnavigator.svg)](https://www.npmjs.com/package/vidnavigator)
[![License](https://img.shields.io/npm/l/vidnavigator.svg)](https://github.com/vidnavigator/vidnavigator-js/blob/main/LICENSE)

---

## Highlights

- **Full TypeScript support** — rich types, autocompletion, and compile-time safety out of the box.
- **Typed response models** — API responses are mapped to intuitive classes (`VideoInfo`, `FileInfo`, `AnalysisResult`, `Namespace`, etc.) with static `fromJSON` constructors.
- **Promise-based** — all methods return Promises, designed for `async`/`await`.
- **Structured data extraction** — define a JSON schema and let the API extract typed fields from any transcript.
- **Namespace organization** — group uploaded files into namespaces and scope searches accordingly.
- **Comprehensive error handling** — dedicated error classes for every API error code (auth, rate-limit, quota, geo-restriction, and more).
- **Lightweight** — only two runtime dependencies: `axios` and `form-data`.

## Requirements

- Node.js 16 or later
- A VidNavigator API key ([get one here](https://vidnavigator.com))

## Installation

```bash
npm install vidnavigator
```

```bash
yarn add vidnavigator
```

```bash
pnpm add vidnavigator
```

## Quick Start

```ts
import { VidNavigatorClient } from 'vidnavigator';

const vn = new VidNavigatorClient({
  apiKey: process.env.VIDNAVIGATOR_API_KEY!,
});
```

### Transcribe a YouTube video

```ts
const { video_info, transcript } = await vn.getYouTubeTranscript({
  video_url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
  language: 'en',
});

console.log(video_info.title);         // "Rick Astley - Never Gonna Give You Up"
console.log(video_info.duration);      // 212

// transcript is an array of timed segments by default
for (const seg of transcript.slice(0, 3)) {
  console.log(`[${seg.start.toFixed(1)}s] ${seg.text}`);
}
```

Pass `transcript_text: true` to receive the transcript as a single plain-text string instead of segments.

### Transcribe any online video

```ts
// Instagram, TikTok, Vimeo, X/Twitter, and more
const { video_info, transcript } = await vn.getTranscript({
  video_url: 'https://www.instagram.com/reel/C86ZvEaqRmo/',
});
```

### Upload and analyze a local file

```ts
const upload = await vn.uploadFile({
  filePath: './meeting-recording.mp4',
  wait_for_completion: true,
  namespace_ids: ['ns_meetings'],     // optional: organize into a namespace
});

if (upload.status === 'success') {
  const { transcript_analysis } = await vn.analyzeFile({
    file_id: upload.file_info.id,
    query: 'What action items were discussed?',
  });

  console.log(transcript_analysis.summary);
  console.log(transcript_analysis.query_answer?.answer);
}
```

### Extract structured data

Define a schema and let the API pull structured fields from any video or file transcript.

```ts
const { data, usage } = await vn.extractVideoData({
  video_url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
  schema: {
    topic:    { type: 'String',  description: 'Main topic of the video' },
    language: { type: 'String',  description: 'Primary spoken language (ISO 639-1)' },
    tone:     { type: 'Enum',    description: 'Overall tone', enum: ['positive', 'negative', 'neutral', 'mixed'] },
    duration_minutes: { type: 'Number', description: 'Approximate duration in minutes' },
  },
  what_to_extract: 'From the transcript, determine the topic, language, tone, and duration.',
  include_usage: true,
});

console.log(data);
// { topic: "A classic pop love song", language: "en", tone: "positive", duration_minutes: 3.5 }

console.log(usage?.total_tokens);
```

### Search across your content

```ts
const results = await vn.searchVideos({
  query: 'machine learning tutorial',
  focus: 'relevance',
});

for (const r of results.results) {
  console.log(`${r.title} (score: ${r.relevance_score})`);
}
```

```ts
const fileResults = await vn.searchFiles({
  query: 'quarterly revenue discussion',
  namespace_ids: ['ns_finance'],   // scope to a specific namespace
});

for (const r of fileResults.results) {
  console.log(`${r.name} — namespaces: ${r.namespaces?.map(n => n.name).join(', ')}`);
}
```

## API Reference

All methods return a `Promise`. Responses are automatically parsed into typed model classes.

### Transcripts

| Method | Description |
|--------|-------------|
| `getYouTubeTranscript(payload)` | Get transcript for a YouTube video |
| `getTranscript(payload)` | Get transcript for non-YouTube online videos |
| `transcribeVideo(payload)` | Speech-to-text transcription; supports `all_videos` for carousels |

**Payload options:** `video_url`, `language`, `metadata_only`, `fallback_to_metadata`, `transcript_text`, `all_videos`

### Files

| Method | Description |
|--------|-------------|
| `getFiles(query?)` | List uploaded files (paginated). Filter by `status` or `namespace_id` |
| `getFile(file_id, query?)` | Get file metadata and transcript |
| `uploadFile(options)` | Upload audio/video. Options: `filePath`, `wait_for_completion`, `namespace_ids` |
| `deleteFile(file_id)` | Delete a file |
| `getFileUrl(file_id)` | Get a signed download URL |
| `retryFileProcessing(file_id)` | Retry a failed processing job |
| `cancelFileUpload(file_id)` | Cancel an in-progress upload |

**Supported formats:** mp4, webm, mov, avi, wmv, flv, mkv, m4a, mp3, mpeg, mpga, wav

### Namespaces

Organize uploaded files into folders.

| Method | Description |
|--------|-------------|
| `getNamespaces()` | List all namespaces |
| `createNamespace({ name })` | Create a new namespace |
| `updateNamespace(id, { name })` | Rename a namespace |
| `deleteNamespace(id)` | Delete a namespace |
| `updateFileNamespaces(file_id, { namespace_ids })` | Assign a file to namespaces |

### Analysis

| Method | Description |
|--------|-------------|
| `analyzeVideo(payload)` | Analyze an online video with an optional query |
| `analyzeFile(payload)` | Analyze an uploaded file with an optional query |

Returns `transcript_analysis` with `summary`, `people`, `places`, `key_subjects`, and `query_answer`.

### Extraction

| Method | Description |
|--------|-------------|
| `extractVideoData(payload)` | Extract structured data from an online video transcript |
| `extractFileData(payload)` | Extract structured data from an uploaded file transcript |

**Schema field types:** `String`, `Number`, `Boolean`, `Integer`, `Object`, `Array`, `Enum`

### Search

| Method | Description |
|--------|-------------|
| `searchVideos(payload)` | Semantic search across indexed YouTube videos |
| `searchFiles(payload)` | Semantic search across uploaded files, with optional `namespace_ids` scope |

### System

| Method | Description |
|--------|-------------|
| `getUsage()` | Credits, activity counters, storage, and subscription info |
| `healthCheck()` | API health status (no auth required) |

## Error Handling

Every API error is mapped to a specific exception class, all extending `VidNavigatorError`:

```ts
import {
  VidNavigatorClient,
  AuthenticationError,
  BadRequestError,
  NotFoundError,
  RateLimitExceededError,
} from 'vidnavigator';

try {
  await vn.getFile('nonexistent-id');
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log(error.status_code);    // 404
    console.log(error.error_message);  // "File not found"
  }
}
```

| Error Class | HTTP Status | When |
|-------------|:-----------:|------|
| `AuthenticationError` | 401 | Invalid or missing API key |
| `PaymentRequiredError` | 402 | Credit limit reached |
| `AccessDeniedError` | 403 | Insufficient permissions |
| `NotFoundError` | 404 | Resource does not exist |
| `BadRequestError` | 400 | Invalid parameters |
| `StorageQuotaExceededError` | 413 | Storage quota exceeded |
| `RateLimitExceededError` | 429 | Too many requests |
| `GeoRestrictedError` | 451 | Content unavailable in region |
| `ServerError` | 5xx | Unexpected server error |
| `SystemOverloadError` | 503 | Temporary overload (includes `retry_after_seconds`) |

## Models

The SDK ships typed model classes with static `fromJSON` constructors:

| Class | Description |
|-------|-------------|
| `VideoInfo` | Video metadata (title, channel, duration, views, etc.) |
| `FileInfo` | Uploaded file metadata (name, size, status, `namespace_ids`, `namespaces`) |
| `TranscriptSegment` | Single transcript segment with `text`, `start`, `end` |
| `AnalysisResult` | Analysis output: summary, people, places, key subjects, query answer |
| `Namespace` | Full namespace object (id, name, timestamps) |
| `NamespaceRef` | Lightweight namespace reference `{ id, name }` embedded in file responses |
| `VideoSearchResult` | Extends `VideoInfo` with relevance score and search metadata |
| `FileSearchResult` | Extends `FileInfo` with relevance score, timestamps, and signed URL |
| `UsageData` | Credits, activity counters, storage metrics, subscription info |
| `ExtractionTokenUsage` | Token usage breakdown for extraction calls |
| `CarouselInfo` / `CarouselVideoResult` | Multi-video carousel response structure |

## Links

- [VidNavigator Website](https://vidnavigator.com)
- [API Documentation](https://docs.vidnavigator.com)
- [GitHub Repository](https://github.com/vidnavigator/vidnavigator-js)

## License

[Apache-2.0](./LICENSE)
