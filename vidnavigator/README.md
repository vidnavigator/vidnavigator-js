# VidNavigator SDK for JavaScript

The official JavaScript/TypeScript SDK for the [VidNavigator Developer API](https://vidnavigator.com). Transcribe, analyze, search, and extract structured data from video and audio — YouTube, Instagram, TikTok, X/Twitter, Vimeo, Facebook, Dailymotion, Loom, and your own uploaded files.

[![npm version](https://img.shields.io/npm/v/vidnavigator.svg)](https://www.npmjs.com/package/vidnavigator)
[![License](https://img.shields.io/npm/l/vidnavigator.svg)](https://github.com/vidnavigator/vidnavigator-js/blob/main/LICENSE)

---

## Why VidNavigator?

- **Multi-platform transcription** — YouTube, Instagram Reels & carousel posts, TikTok, X/Twitter, Vimeo, Facebook, Dailymotion, Loom, and more.
- **Instagram carousel support** — select a specific video by index, or transcribe every video in a carousel post with one call.
- **AI-powered analysis** — get summaries, people mentioned, places, key subjects, and direct answers to questions about any video or audio.
- **Structured data extraction** — define a JSON schema and receive typed, structured fields extracted from any transcript (powered by LLMs).
- **Semantic search** — vector-based search with AI reranking across your indexed YouTube channels and uploaded file libraries.
- **File management with namespaces** — upload audio/video files, organize them into namespaces, and scope searches and analysis by folder.
- **Full TypeScript support** — rich types, autocompletion, and compile-time safety out of the box.
- **Comprehensive error handling** — dedicated error classes for every API error code (`AuthenticationError`, `RateLimitExceededError`, `GeoRestrictedError`, and more).
- **Lightweight** — only two runtime dependencies: `axios` and `form-data`.

## Supported Platforms

| Platform | Transcript | Transcribe (speech-to-text) | Carousel |
|----------|:----------:|:---------------------------:|:--------:|
| YouTube | Yes | - | - |
| Instagram Reels | - | Yes | Yes |
| Instagram Posts | - | Yes | Yes (`all_videos`) |
| TikTok | Yes | Yes | - |
| X / Twitter | Yes | Yes | - |
| Vimeo | Yes | Yes | - |
| Facebook | Yes | Yes | - |
| Dailymotion | Yes | Yes | - |
| Loom | Yes | Yes | - |
| Uploaded files | Yes | Yes | - |

> **Transcript** = fast caption/subtitle extraction. **Transcribe** = speech-to-text via AI models (works when captions are unavailable).

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

**Requirements:** Node.js 16+ and a [VidNavigator API key](https://vidnavigator.com).

## Quick Start

```ts
import { VidNavigatorClient } from 'vidnavigator';

const vn = new VidNavigatorClient({
  apiKey: process.env.VIDNAVIGATOR_API_KEY!,
});
```

---

## Examples

### 1. YouTube transcript

```ts
const { video_info, transcript } = await vn.getYouTubeTranscript({
  video_url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
  language: 'en',
});

console.log(video_info.title);    // "Rick Astley - Never Gonna Give You Up"
console.log(video_info.channel);  // "Rick Astley"
console.log(video_info.duration); // 212

// Timed segments by default
for (const seg of transcript.slice(0, 3)) {
  console.log(`[${seg.start.toFixed(1)}s] ${seg.text}`);
}
// [0.0s] We're no strangers to love
// [3.4s] You know the rules and so do I
// [6.8s] A full commitment's what I'm thinking of
```

Pass `transcript_text: true` to get the full transcript as a single plain-text string instead of segments.

### 2. Instagram Reel / TikTok / X / Vimeo

For most non-YouTube platforms, you can use either `getTranscript` (fast, caption-based) or `transcribeVideo` (speech-to-text). **Note:** Instagram only supports `transcribeVideo`.

```ts
// Instagram Reel (speech-to-text only)
const { video_info, transcript } = await vn.transcribeVideo({
  video_url: 'https://www.instagram.com/reel/C86ZvEaqRmo/',
});
console.log(video_info.title);
console.log(transcript[0].text);

// TikTok (can use getTranscript or transcribeVideo)
const tiktok = await vn.getTranscript({
  video_url: 'https://www.tiktok.com/@user/video/1234567890',
});

// X / Twitter
const tweet = await vn.getTranscript({
  video_url: 'https://twitter.com/user/status/1234567890',
});
```

### 3. Instagram carousel posts (multiple videos)

Instagram carousel posts can contain multiple videos. You can select a specific video by index, or transcribe them all at once:

```ts
// Transcribe the 2nd video in a carousel
const single = await vn.transcribeVideo({
  video_url: 'https://www.instagram.com/p/ABC123/?img_index=2',
});
console.log(single.video_info.title);
console.log(single.video_info.carousel_info);
// { total_items: 5, video_count: 3, image_count: 2, selected_index: 2 }

// Transcribe ALL videos in a carousel at once
const all = await vn.transcribeVideo({
  video_url: 'https://www.instagram.com/p/ABC123/',
  all_videos: true,
});

if ('carousel_info' in all) {
  console.log(`${all.carousel_info.transcribed_count} of ${all.carousel_info.video_count} videos transcribed`);

  for (const video of all.videos) {
    if (video.status === 'success') {
      console.log(`Video #${video.index}: ${video.video_info.title}`);
      console.log(`  Transcript: ${video.transcript[0]?.text}...`);
    } else {
      console.log(`Video #${video.index}: failed — ${video.message}`);
    }
  }
}
```

### 4. Upload and analyze a local file

Upload audio or video files for transcription, analysis, and search. Supported formats: mp4, webm, mov, avi, wmv, flv, mkv, m4a, mp3, mpeg, mpga, wav.

```ts
const upload = await vn.uploadFile({
  filePath: './meeting-recording.mp4',
  wait_for_completion: true,
  namespace_ids: ['ns_meetings'],  // optional: file goes into a namespace
});

console.log(upload.file_id);       // "64a1b2c3d4e5f6789..."
console.log(upload.file_name);     // "meeting-recording.mp4"
console.log(upload.file_info.namespace_ids);  // ["ns_meetings"]

// Analyze with a question
const { transcript_analysis } = await vn.analyzeFile({
  file_id: upload.file_info.id,
  query: 'What action items were discussed?',
});

console.log(transcript_analysis.summary);
// "The meeting covered Q3 targets, hiring plans, and a product launch timeline..."

console.log(transcript_analysis.people);
// [{ name: "Sarah", context: "VP of Engineering, presented hiring plan" }, ...]

console.log(transcript_analysis.key_subjects);
// [{ name: "Q3 targets", description: "Revenue goals for...", importance: "high" }, ...]

console.log(transcript_analysis.query_answer?.answer);
// "Three action items were discussed: 1) Finalize the hiring..."
```

### 5. Extract structured data

Define a schema and get back clean, structured data extracted from any video or file transcript. Powered by LLMs with token usage tracking.

```ts
const { data, usage } = await vn.extractVideoData({
  video_url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
  schema: {
    topic:    { type: 'String',  description: 'Main topic of the video' },
    language: { type: 'String',  description: 'Primary spoken language (ISO 639-1)' },
    tone:     { type: 'Enum',    description: 'Overall tone',
                enum: ['positive', 'negative', 'neutral', 'mixed'] },
    key_quotes: { type: 'Array', description: 'Top 3 memorable quotes' },
  },
  what_to_extract: 'Determine the topic, language, tone, and notable quotes.',
  include_usage: true,
});

console.log(data);
// {
//   topic: "A classic pop love song",
//   language: "en",
//   tone: "positive",
//   key_quotes: ["Never gonna give you up", "Never gonna let you down", ...]
// }

console.log(usage?.total_tokens); // 847
```

Also works on uploaded files:

```ts
const { data } = await vn.extractFileData({
  file_id: 'your-file-id',
  schema: {
    action_items: { type: 'Array',  description: 'List of action items from the meeting' },
    next_meeting: { type: 'String', description: 'When is the next meeting scheduled?' },
    sentiment:    { type: 'Enum',   description: 'Overall meeting mood',
                    enum: ['productive', 'tense', 'casual', 'urgent'] },
  },
});
```

**Supported schema types:** `String`, `Number`, `Boolean`, `Integer`, `Object`, `Array`, `Enum`

### 6. Semantic search

Search across your indexed YouTube channels and uploaded file libraries using AI-powered vector search with reranking.

```ts
// Search indexed YouTube videos
const videoResults = await vn.searchVideos({
  query: 'how to deploy a Node.js app',
});

console.log(`Found ${videoResults.total_found} results`);
for (const r of videoResults.results) {
  console.log(`${r.title} — score: ${r.relevance_score}`);
  console.log(`  ${r.transcript_summary}`);
}

// Search uploaded files — optionally scoped to a namespace
const fileResults = await vn.searchFiles({
  query: 'quarterly revenue discussion',
  namespace_ids: ['ns_finance'],
});

for (const r of fileResults.results) {
  console.log(`${r.name} (score: ${r.relevance_score})`);
  console.log(`  Answer: ${r.query_answer}`);
  console.log(`  Namespaces: ${r.namespaces?.map(n => n.name).join(', ')}`);
}
```

### 7. Organize files with namespaces

```ts
// Create a namespace
const ns = await vn.createNamespace({ name: 'Client Calls' });

// Assign a file to namespaces
const updated = await vn.updateFileNamespaces(fileId, {
  namespace_ids: [ns.id],
});
console.log(updated.namespaces);
// [{ id: "...", name: "Client Calls" }]

// List files filtered by namespace
const files = await vn.getFiles({ namespace_id: ns.id });

// List all namespaces
const all = await vn.getNamespaces();
```

### 8. Usage and credits

```ts
const usage = await vn.getUsage();

console.log(`Credits remaining: ${usage.credits.monthly_remaining}`);
console.log(`Video transcripts used: ${usage.usage.videoTranscripts.used}`);
console.log(`YouTube transcripts used: ${usage.usage.youtubeTranscripts.used}`);
console.log(`Storage: ${usage.storage.used_formatted} / ${usage.storage.limit_formatted}`);
console.log(`Channels indexed: ${usage.channelsIndexed.used} / ${usage.channelsIndexed.limit}`);
```

---

## API Reference

All methods return a `Promise`. Responses are automatically parsed into typed model classes.

### Transcripts

| Method | Description |
|--------|-------------|
| `getYouTubeTranscript(payload)` | Get transcript for a YouTube video (fast, caption-based) |
| `getTranscript(payload)` | Get transcript for non-YouTube videos (Vimeo, X/Twitter, TikTok, etc. — note: Instagram not supported) |
| `transcribeVideo(payload)` | Speech-to-text transcription via AI models; supports Instagram carousel with `all_videos` |

**Common options:** `video_url`, `language`, `metadata_only`, `fallback_to_metadata`, `transcript_text`

### Files

| Method | Description |
|--------|-------------|
| `getFiles(query?)` | List uploaded files (paginated). Filter by `status` or `namespace_id` |
| `getFile(file_id, query?)` | Get file info and transcript. Pass `transcript_text: true` for plain text |
| `uploadFile(options)` | Upload audio/video. Options: `filePath`, `wait_for_completion`, `namespace_ids` |
| `deleteFile(file_id)` | Delete a file |
| `getFileUrl(file_id)` | Get a signed download URL |
| `retryFileProcessing(file_id)` | Retry a failed processing job |
| `cancelFileUpload(file_id)` | Cancel an in-progress upload |

**Supported formats:** mp4, webm, mov, avi, wmv, flv, mkv, m4a, mp3, mpeg, mpga, wav

### Namespaces

| Method | Description |
|--------|-------------|
| `getNamespaces()` | List all namespaces |
| `createNamespace({ name })` | Create a new namespace |
| `updateNamespace(id, { name })` | Rename a namespace |
| `deleteNamespace(id)` | Delete a namespace |
| `updateFileNamespaces(file_id, { namespace_ids })` | Assign a file to namespaces. Returns updated `namespace_ids` and `namespaces` |

### Analysis

| Method | Description |
|--------|-------------|
| `analyzeVideo(payload)` | Analyze an online video with an optional natural language query |
| `analyzeFile(payload)` | Analyze an uploaded file with an optional natural language query |

Returns `transcript_analysis` containing:
- `summary` — content overview
- `people` — people mentioned (name + context)
- `places` — locations referenced
- `key_subjects` — important topics (name, description, importance)
- `query_answer` — direct answer to your query (when provided) with `answer`, `best_segment_index`, and `relevant_segments`

### Extraction

| Method | Description |
|--------|-------------|
| `extractVideoData(payload)` | Extract structured data from an online video transcript |
| `extractFileData(payload)` | Extract structured data from an uploaded file transcript |

**Options:** `schema` (required), `what_to_extract` (optional guidance), `include_usage` (token tracking)

**Schema field types:** `String`, `Number`, `Boolean`, `Integer`, `Object`, `Array`, `Enum`

### Search

| Method | Description |
|--------|-------------|
| `searchVideos(payload)` | Semantic search across indexed YouTube channels |
| `searchFiles(payload)` | Semantic search across uploaded files, with optional `namespace_ids` scope |

Results include `relevance_score`, `transcript_summary`, `people`, `places`, `key_subjects`, `query_answer`, `timestamps`, and `relevant_text`.

### System

| Method | Description |
|--------|-------------|
| `getUsage()` | Credits, activity counters, storage, channels indexed, subscription info |
| `healthCheck()` | API health status (no auth required) |

## Error Handling

Every API error is mapped to a specific exception class, all extending `VidNavigatorError`:

```ts
import {
  VidNavigatorClient,
  AuthenticationError,
  NotFoundError,
  RateLimitExceededError,
} from 'vidnavigator';

try {
  await vn.getFile('nonexistent-id');
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log(error.status_code);    // 404
    console.log(error.error_message);  // "File not found"
  } else if (error instanceof RateLimitExceededError) {
    console.log('Slow down! Rate limited.');
  }
}
```

| Error Class | HTTP | When |
|-------------|:----:|------|
| `BadRequestError` | 400 | Invalid parameters |
| `AuthenticationError` | 401 | Invalid or missing API key |
| `PaymentRequiredError` | 402 | Credit limit reached |
| `AccessDeniedError` | 403 | Insufficient permissions |
| `NotFoundError` | 404 | Resource does not exist |
| `StorageQuotaExceededError` | 413 | Storage quota exceeded |
| `RateLimitExceededError` | 429 | Too many requests |
| `GeoRestrictedError` | 451 | Content unavailable in your region |
| `ServerError` | 5xx | Unexpected server error |
| `SystemOverloadError` | 503 | Temporary overload (has `retry_after_seconds`) |

## TypeScript Models

All API responses are parsed into typed classes with static `fromJSON()` constructors:

| Class | Description |
|-------|-------------|
| `VideoInfo` | Video metadata: title, channel, duration, views, likes, published date, keywords, carousel info |
| `FileInfo` | Uploaded file: name, size, type, duration, status, `namespace_ids`, `namespaces` |
| `TranscriptSegment` | Timed segment: `text`, `start`, `end` (seconds) |
| `AnalysisResult` | AI analysis: summary, people, places, key subjects, query answer |
| `Namespace` | Full namespace: id, name, created/updated timestamps |
| `NamespaceRef` | Lightweight `{ id, name }` reference embedded in file and search responses |
| `VideoSearchResult` | Extends `VideoInfo` with `relevance_score`, `transcript_summary`, search metadata |
| `FileSearchResult` | Extends `FileInfo` with `relevance_score`, `query_answer`, timestamps, signed URL |
| `UsageData` | Credits info, per-service activity counts, storage metrics, subscription details |
| `ExtractionTokenUsage` | `prompt_tokens`, `completion_tokens`, `total_tokens` |
| `CarouselInfo` | Carousel summary: total items, video/image count, transcribed count, total duration |
| `CarouselVideoResult` | Per-video result in a carousel: index, status, video info, transcript |

## Links

- [VidNavigator Website](https://vidnavigator.com)
- [API Documentation](https://docs.vidnavigator.com)
- [GitHub Repository](https://github.com/vidnavigator/vidnavigator-js)

## License

[Apache-2.0](./LICENSE)
