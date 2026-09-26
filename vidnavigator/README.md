# VidNavigator SDK for JavaScript

The official JavaScript/TypeScript SDK for the [VidNavigator Developer API](https://vidnavigator.com). Transcribe, analyze, search, and extract structured data from video and audio — YouTube, Instagram, TikTok, X/Twitter, Vimeo, Facebook, Dailymotion, Loom, and your own uploaded files.

[![npm version](https://img.shields.io/npm/v/vidnavigator.svg)](https://www.npmjs.com/package/vidnavigator)
[![License](https://img.shields.io/npm/l/vidnavigator.svg)](https://github.com/vidnavigator/vidnavigator-js/blob/main/LICENSE)

---

## Why VidNavigator?

- **Multi-platform transcription** — YouTube, Instagram Reels & carousel posts, TikTok, X/Twitter, Vimeo, Facebook, Dailymotion, Loom, and more.
- **Any video length** — transcription, extraction, and tweet analysis run as background jobs, so there is no duration limit. Get the result with one `await`, or submit many jobs and collect them as they finish.
- **Async TikTok profile scraping and keyword search** — collect public TikTok videos in the background, then read results via cursor pagination or a signed `download_url`, optionally notified by webhook.
- **Instagram carousel support** — select a specific video by index, or transcribe every video in a carousel post with one call.
- **AI-powered analysis** — get summaries, people mentioned, places, key subjects, and direct answers to questions about any video or audio.
- **Structured data extraction** — define a JSON schema and receive typed, structured fields extracted from any transcript (powered by LLMs).
- **AI search and reranking** — YouTube search and file search with AI ranking/reranking and rich result metadata.
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

**Requirements:** Node.js 16+ (18+ for the examples that use the global `fetch`) and a [VidNavigator API key](https://vidnavigator.com).

The SDK is for server-side use: it reads local files for uploads and schema files, and your API key should never be shipped to a browser.

## Quick Start

```ts
import { VidNavigatorClient } from 'vidnavigator';

const vn = new VidNavigatorClient({
  apiKey: process.env.VIDNAVIGATOR_API_KEY!,
});
```

CommonJS works too: `const { VidNavigatorClient } = require('vidnavigator');`

### Configuration

| Option | Default | |
|---|---|---|
| `apiKey` | (required) | Your VidNavigator API key |
| `baseURL` | `https://api.vidnavigator.com/v1` | API base URL |
| `axiosConfig` | | Passed to the underlying [axios](https://axios-http.com/docs/req_config) instance: HTTP timeout, proxy, extra headers, ... |

```ts
const vn = new VidNavigatorClient({
  apiKey: process.env.VIDNAVIGATOR_API_KEY!,
  axiosConfig: {
    timeout: 120_000, // per HTTP request, in ms (separate from how long background jobs may run)
    proxy: { protocol: 'http', host: 'proxy.internal', port: 3128 },
  },
});
```

`axiosConfig.timeout` limits each HTTP request. How long the SDK waits for a background job to finish is set per call with `timeoutMs` (see [Background jobs](#3-background-jobs-one-call-or-many-at-once)).

### Upgrading from 1.x

Transcription, structured extraction, and tweet analysis now always run as background jobs, so they work on videos of any length. Your existing calls keep working with the same arguments, with two differences:

- `extractVideoData()` no longer returns `video_info`. Use `getTranscript({ video_url, metadata_only: true })` if you need the metadata.
- `getTweetStatement()` no longer returns `statement_query`, which was never part of the documented API.

New in 2.0: `vn.transcribe`, `vn.extractVideo`, `vn.tweetStatement`, `vn.tiktokProfile`, and `vn.tiktokSearch`, each with `.submit()` for running many jobs at once (see [Background jobs](#3-background-jobs-one-call-or-many-at-once)), plus webhook signature helpers.

---

## Examples

### 1. Get a transcript (any platform)

There is a single `getTranscript` method that auto-detects the platform (YouTube, Vimeo, X/Twitter, TikTok, Facebook, Dailymotion, Loom, and more) from the URL.

```ts
const { video_info, transcript } = await vn.getTranscript({
  video_url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
  language: 'en',
});

console.log(video_info.title);    // "Rick Astley - Never Gonna Give You Up"
console.log(video_info.channel);  // "Rick Astley"
console.log(video_info.duration); // 212

// Timed segments by default (a single string when transcript_text: true)
if (Array.isArray(transcript)) {
  for (const seg of transcript.slice(0, 3)) {
    console.log(`[${seg.start.toFixed(1)}s] ${seg.text}`);
  }
}
// [0.0s] We're no strangers to love
// [3.4s] You know the rules and so do I
// [6.8s] A full commitment's what I'm thinking of
```

Pass `transcript_text: true` to get the full transcript as a single plain-text string instead of segments.

> **Deprecated:** `getYouTubeTranscript()` still works but is deprecated — it now forwards to `getTranscript()` and emits a deprecation warning. Use `getTranscript()` instead.

### 2. Instagram Reel / TikTok / X / Vimeo

For most non-Instagram platforms, you can use either `getTranscript` (fast, caption-based) or `transcribe` (speech-to-text, any length). **Note:** Instagram only supports `transcribe`.

```ts
// Instagram Reel (speech-to-text only)
const { video_info, transcript } = await vn.transcribe('https://www.instagram.com/reel/C86ZvEaqRmo/');
console.log(video_info.title);
console.log(transcript);

// TikTok (can use getTranscript or transcribe)
const tiktok = await vn.getTranscript({
  video_url: 'https://www.tiktok.com/@user/video/1234567890',
});

// X / Twitter
const tweet = await vn.getTranscript({
  video_url: 'https://twitter.com/user/status/1234567890',
});
```

### 3. Background jobs: one call, or many at once

Transcription, structured extraction, tweet analysis, and TikTok scraping run as background jobs on VidNavigator. The SDK always uses the async API endpoints, so **video length is never a problem**. You never deal with the request-response limits of long transcriptions.

Each of these operations comes in two shapes:

| Operation | Wait for the result | Start it and come back later |
|---|---|---|
| Transcription | `await vn.transcribe(url)` | `await vn.transcribe.submit(url)` |
| Structured extraction | `await vn.extractVideo({ video_url, schema })` | `await vn.extractVideo.submit({ ... })` |
| Tweet claim analysis | `await vn.tweetStatement(tweetId)` | `await vn.tweetStatement.submit(tweetId)` |
| TikTok profile scrape | `await vn.tiktokProfile(profileUrl)` | `await vn.tiktokProfile.submit(profileUrl)` |
| TikTok keyword search | `await vn.tiktokSearch(query)` | `await vn.tiktokSearch.submit(query)` |

**Wait for the result.** The one-liner submits the job, checks on it until it finishes, and returns the result:

```ts
const { video_info, transcript, usage } = await vn.transcribe(
  'https://www.tiktok.com/@user/video/1234567890',
  { include_usage: true }
);
console.log(video_info.title, transcript, usage?.total_credits);
```

Pass an object instead of a URL for more options, e.g. `vn.transcribe({ video_url, transcript_text: true, all_videos: true })`.

**Start many at once.** `.submit()` returns a `Job` right away. Each job has a `task_id`, `status()` (checks once), `result()` (waits, then returns the result), and `wait()` (waits, then returns the final task without throwing on failure):

```ts
const urls = ['https://www.instagram.com/reel/A/', 'https://www.instagram.com/reel/B/', 'https://vimeo.com/123'];

const jobs = await Promise.all(urls.map((url) => vn.transcribe.submit(url)));
console.log(jobs.map((job) => job.task_id)); // store these if you may need to come back later

const results = await Promise.allSettled(jobs.map((job) => job.result()));
results.forEach((r, i) => console.log(urls[i], r.status === 'fulfilled' ? r.value : r.reason.message));
```

```ts
const job = await vn.extractVideo.submit({
  video_url: 'https://www.facebook.com/watch/?v=1234567890',
  schema: {
    speakers: { type: 'Array',  description: 'Names of everyone who speaks', items: { type: 'String', description: 'A speaker name' } },
    verdict:  { type: 'String', description: 'The final conclusion of the video' },
  },
});

console.log(await job.status()); // 'processing' | 'completed' | 'failed'
const { data } = await job.result();
console.log(data); // { speakers: [...], verdict: "..." }, shaped like your schema
```

**Come back later.** A job keeps running on VidNavigator even if your process stops waiting, and its result stays available for **1 hour after it finishes**. Keep the `task_id` and reattach with `.resume()`:

```ts
const job = vn.transcribe.resume(savedTaskId);
const result = await job.result();
```

**Timeouts.** The one-liners and `result()` wait up to 30 minutes by default. If that runs out, they throw a `TaskTimeoutError` that **carries the `task_id`**. The job is not lost, so resume it:

```ts
import { TaskTimeoutError } from 'vidnavigator';

try {
  const result = await vn.transcribe(url, { timeoutMs: 5 * 60 * 1000 });
} catch (err) {
  if (err instanceof TaskTimeoutError) {
    saveForLater(err.task_id); // later: await vn.transcribe.resume(err.task_id).result()
  } else {
    throw err;
  }
}
```

**Waiting options.** Pass these to the one-liner or to `result()` / `wait()`:

| Option | Default | |
|---|---|---|
| `timeoutMs` | 30 minutes | Stop waiting and throw `TaskTimeoutError` (with `task_id`). `0` waits forever |
| `intervalMs` | `3000` | Time between checks. Checking costs no credits and is not rate-limited |
| `fastStart` | `true` | Check every second for the first 10 seconds, so short clips return quickly |
| `signal` | | An `AbortSignal` to stop waiting early (the job keeps running) |
| `onPoll` | | Called with each task snapshot, e.g. for progress logs |
| `include_usage` | `false` | Attach a `usage` block to the result (one-liner, `.submit()` and `.resume()` options) |

**When a job fails**, `result()` and the one-liners throw an error built from the job's `error` details (`error`, `message`, `http_status`), using the same error class as any other API error, for example `NotFoundError` for a missing video. The error also carries the `task_id`. `wait()` returns the failed task instead, with `task.error` set.

**When a job can't start**, submitting throws right away and no job is created:
- `InsufficientCreditsError` (402): not enough credits (for transcription, less than 60 seconds left). A job can also be accepted and then run out of credits while it runs; `result()` then throws the same `InsufficientCreditsError`, so handle it in both places.
- `TooManyActiveJobsError` (429): too many of your jobs are already running. Wait for some to finish and retry.

**Large batches.** Your account can only have a limited number of jobs running at once, so `Promise.all` over hundreds of URLs will hit `TooManyActiveJobsError`. Keep a fixed number in flight and retry when the limit is reached:

```ts
import { TooManyActiveJobsError } from 'vidnavigator';

async function transcribeAll(urls: string[], concurrency = 10) {
  const results = new Map<string, unknown>();
  const queue = [...urls];

  async function worker() {
    for (let url = queue.shift(); url; url = queue.shift()) {
      for (;;) {
        try {
          results.set(url, await vn.transcribe(url));
          break;
        } catch (err) {
          if (err instanceof TooManyActiveJobsError) {
            await new Promise((r) => setTimeout(r, 10_000)); // wait for running jobs to finish
            continue;
          }
          results.set(url, err); // record the failure and move on
          break;
        }
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}
```

**Progress.** `onPoll` receives every task snapshot while you wait:

```ts
const started = Date.now();
const result = await vn.transcribe(url, {
  onPoll: (task) => console.log(`${task.task_id}: ${task.task_status} after ${Math.round((Date.now() - started) / 1000)}s`),
});
```

**Surviving restarts.** Save each `task_id` as soon as you submit, so a crash or deploy doesn't lose the work. Results stay available for 1 hour after a job finishes:

```ts
import { writeFileSync, readFileSync, existsSync } from 'fs';

// Submit and persist
const job = await vn.transcribe.submit(url);
writeFileSync('pending-jobs.json', JSON.stringify([...pending(), job.task_id]));

// After a restart: pick every job back up
for (const taskId of pending()) {
  const result = await vn.transcribe.resume(taskId).result();
  // ... store the result, then drop taskId from pending-jobs.json
}

function pending(): string[] {
  return existsSync('pending-jobs.json') ? JSON.parse(readFileSync('pending-jobs.json', 'utf8')) : [];
}
```

> The older methods `transcribeVideo()`, `extractVideoData()`, and `getTweetStatement()` still work with the same arguments. They now run as background jobs too, so they handle videos of any length. `extractVideoData()` no longer returns `video_info`; call `getTranscript({ video_url, metadata_only: true })` if you need it.

### 4. Webhooks

You can also have VidNavigator call your server when a job finishes. Pass `webhook_url` to any of the operations above (transcription, extraction, tweet analysis, TikTok profile and search), or set an account-wide default in **Studio → API**. A per-job `webhook_url` overrides the default, and `webhook_url: ''` turns the default off for that one job. The URL must be a public `https` endpoint; private and loopback hosts are rejected with a `BadRequestError`.

Webhooks are optional. Waiting with `result()` or the one-liners works exactly the same whether or not a webhook is set, and it remains the source of truth.

```ts
const job = await vn.transcribe.submit({
  video_url: 'https://www.instagram.com/reel/C86ZvEaqRmo/',
  webhook_url: 'https://example.com/hooks/vidnavigator',
});
console.log(job.webhook_url); // where the notification will be sent, or null
```

Each delivery is signed with your signing secret (from Studio → API). Verify it with `constructWebhookEvent()`, passing the **raw** request body:

```ts
import express from 'express';
import { VidNavigatorClient, constructWebhookEvent, WebhookSignatureError, WEBHOOK_HEADERS } from 'vidnavigator';

const vn = new VidNavigatorClient({ apiKey: process.env.VIDNAVIGATOR_API_KEY! });
const app = express();

app.post('/hooks/vidnavigator', express.raw({ type: 'application/json' }), async (req, res) => {
  let event;
  try {
    event = constructWebhookEvent(
      req.body,                                  // raw Buffer, not parsed JSON
      req.headers[WEBHOOK_HEADERS.signature],    // "t=<unix_ts>,v1=<hex>"
      process.env.VIDNAVIGATOR_WEBHOOK_SECRET!
    );
  } catch (err) {
    if (err instanceof WebhookSignatureError) return res.status(400).send('Invalid signature');
    throw err;
  }
  res.sendStatus(200); // acknowledge quickly; any 2xx counts

  // Deliveries can repeat: dedupe on req.headers[WEBHOOK_HEADERS.delivery].
  // The simplest handler reattaches to the job and reads the parsed result:
  if (event.type === 'transcribe.completed') {
    const result = await vn.transcribe.resume(event.data.task_id).result();
    console.log(result);
  } else if (event.type === 'tiktok_profile.completed') {
    const task = await vn.tiktokProfile.resume(event.data.task_id).result(); // every video, all pages
    console.log(task.videos.length);
  } else if (event.type.endsWith('.failed')) {
    console.error(event.data.task_id, event.data.error); // { error, message, http_status }
  }
});
```

- `event.data.result` holds the raw result for transcription, extraction, and tweet events, unless it was over 256 KB (`result_truncated: true`). For TikTok events it is only a summary, `{ stats, download_url_available }`, since a scrape can hold thousands of videos. In every case, `resume(task_id).result()` gets the full parsed result.
- `verifyWebhookSignature(rawBody, signatureHeader, secret)` returns `true` or `false` instead of throwing.
- Deliveries older than 5 minutes are rejected by default. Change this with `{ toleranceSeconds }`; `0` turns the check off.
- Failed deliveries (5xx, 429, network errors) are retried 5 times over about 13 minutes. Other 4xx responses are not retried.
- To see a job's delivery status, check it: `(await job.refresh()).webhook` → `{ status: 'pending' | 'delivered' | 'failed', attempts, response_status, last_error, delivered_at }`.

### 5. TikTok profile scraping (async)

`vn.tiktokProfile()` scrapes a public profile in the background and returns the finished task with **every** matching video (the SDK fetches all result pages for you):

```ts
const task = await vn.tiktokProfile({
  profile_url: 'https://www.tiktok.com/@tiktok',
  max_posts: 250,
  after_datetime: '2024-01-01',
});

console.log(`Matched ${task.videos.length} videos`, task.stats);
const videos = task.videos; // TikTokVideo[], published_at parsed as Date
```

Pass just the URL for the defaults: `await vn.tiktokProfile('https://www.tiktok.com/@tiktok')`. As with every operation, `vn.tiktokProfile.submit(...)` returns a `Job` instead, and `webhook_url` is accepted.

If you'd rather read the results one page at a time, or grab them as a single JSON file, submit the job and use the page-level method with its `task_id`:

```ts
const job = await vn.tiktokProfile.submit('https://www.tiktok.com/@tiktok');
await job.wait();

// Page by page
let cursor: string | undefined;
do {
  const page = await vn.getTikTokProfileScrape(job.task_id, { limit: 100, cursor });
  handle(page.videos);
  cursor = page.pagination?.next_cursor ?? undefined;
} while (cursor);

// Or the whole result as one JSON file (short-lived signed URL, any HTTP client works)
const { download_url } = await vn.getTikTokProfileScrape(job.task_id, { limit: 1 });
if (download_url) {
  const fullProfile = await (await fetch(download_url)).json();
  console.log(fullProfile.videos.length);
}
```

After you have the final video list, loop through each TikTok video URL and use the normal transcript or extraction APIs:

```ts
for (const video of videos) {
  if (!video.url) continue;

  console.log(video.published_at?.toISOString()); // Date parsed from API `published_at`

  const { transcript } = await vn.getTranscript({
    video_url: video.url,
    transcript_text: true,
    fallback_to_metadata: true,
  });

  console.log(video.title, transcript);
}
```

```ts
for (const video of videos) {
  if (!video.url) continue;

  const { data } = await vn.extractVideoData({
    video_url: video.url,
    schema: {
      hook: { type: 'String', description: 'The opening hook or premise' },
      products: { type: 'Array', description: 'Products or brands mentioned', items: { type: 'String', description: 'A product or brand' } },
      sentiment: {
        type: 'Enum',
        description: 'Overall sentiment',
        enum: ['positive', 'negative', 'neutral', 'mixed'],
      },
    },
    what_to_extract: 'Extract creator messaging and product mentions.',
    transcribe: true,
  });

  console.log(video.url, data);
}
```

For large profiles, process videos sequentially or with a small concurrency limit so you do not exhaust credits or hit rate limits.

### 6. TikTok keyword search (async)

`vn.tiktokSearch()` works the same way and returns the finished task with every result:

```ts
const task = await vn.tiktokSearch({
  query: 'ai tools',
  max_results: 100,
  sort_by: 'most_liked',          // 'relevance' | 'most_liked' | 'newest'
  published_within: 'this_month', // 'all' | 'past_24_hours' | 'this_week' | 'this_month' | 'last_3_months' | 'last_6_months'
  min_views: 10000,
});

console.log(task.stats?.sort_by, task.stats?.published_within); // what the search actually ran with
for (const result of task.results) {
  console.log(result.published_at?.toISOString(), result.url, result.stats?.views);
}
```

- `sort_by` and `published_within` are applied by TikTok itself. If you leave out `sort_by`, results come back newest first. If you leave out `published_within` and set an `after_datetime` more than 24 hours ago, the smallest window that covers it is picked for you.
- `parallel_search_slices` (`2` to `4`) runs several search chains in parallel to collect more results than TikTok's single-chain limit (about 115 to 140 items). Billing grows with the number of slices, so keep it at `1` unless you need the extra results, and especially when `published_within` is set, since every slice searches the same window.

### 7. Instagram carousel posts (multiple videos)

Instagram carousel posts can contain multiple videos. You can select a specific video by index, or transcribe them all at once:

```ts
// Transcribe the 2nd video in a carousel
const single = await vn.transcribe('https://www.instagram.com/p/ABC123/?img_index=2');
console.log(single.video_info.title);
console.log(single.video_info.carousel_info);
// { total_items: 5, video_count: 3, image_count: 2, selected_index: 2 }

// Transcribe ALL videos in a carousel at once
const all = await vn.transcribe({
  video_url: 'https://www.instagram.com/p/ABC123/',
  all_videos: true,
});

if ('carousel_info' in all) {
  console.log(`${all.carousel_info.transcribed_count} of ${all.carousel_info.video_count} videos transcribed`);

  for (const video of all.videos) {
    if (video.status === 'success') {
      console.log(`Video #${video.index}: ${video.video_info?.title}`);
      console.log('  Transcript:', video.transcript);
    } else {
      console.log(`Video #${video.index}: failed — ${video.message}`);
    }
  }
}
```

### 8. Upload and analyze a local file

Upload audio or video files for transcription, analysis, and search. Supported formats: mp4, webm, mov, avi, wmv, flv, mkv, m4a, mp3, mpeg, mpga, wav.

```ts
const upload = await vn.uploadFile({
  filePath: './meeting-recording.mp4',
  wait_for_completion: true,
  namespace_ids: ['ns_meetings'],  // optional: file goes into a namespace
});

console.log(upload.file_id);       // "64a1b2c3d4e5f6789..."
console.log(upload.file_name);     // "meeting-recording.mp4"
console.log(upload.file_info?.namespace_ids); // ["ns_meetings"]

// Analyze with a question
const { transcript_analysis } = await vn.analyzeFile({
  file_id: upload.file_id,
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

Without `wait_for_completion`, the upload returns right away (`status: 'accepted'`) while the file is processed. Check on it with `getFile()`, then work with it:

```ts
const { file_id } = await vn.uploadFile({ filePath: './interview.mp3' });

let { file_info } = await vn.getFile(file_id);
while (file_info.status === 'processing') {
  await new Promise((r) => setTimeout(r, 5000));
  ({ file_info } = await vn.getFile(file_id));
}

if (file_info.status === 'failed') {
  await vn.retryFileProcessing(file_id); // or: await vn.cancelFileUpload(file_id) while it is still processing
}

const { transcript } = await vn.getFile(file_id, { transcript_text: true }); // full text
const { file_url } = await vn.getFileUrl(file_id);                            // signed download URL
const { files, has_more } = await vn.getFiles({ status: 'completed', limit: 20, offset: 0 });
await vn.deleteFile(file_id);
```

### Analyze an online video

```ts
const { video_info, transcript_analysis } = await vn.analyzeVideo({
  video_url: 'https://www.youtube.com/watch?v=4czjS9h4Fpg',
  query: 'Where did the rover land?',
  include_usage: true,
});

console.log(transcript_analysis.summary);
console.log(transcript_analysis.query_answer?.answer);             // direct answer to your question
console.log(transcript_analysis.query_answer?.relevant_segments);  // supporting transcript excerpts
```

### 9. Extract structured data

Define a schema and get back clean, structured data extracted from any video or file transcript. Powered by LLMs with per-call usage tracking (see [Per-call usage](#per-call-usage)).

```ts
const { data, usage } = await vn.extractVideoData({
  video_url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
  schema: {
    topic:    { type: 'String',  description: 'Main topic of the video' },
    language: { type: 'String',  description: 'Primary spoken language (ISO 639-1)' },
    tone:     { type: 'Enum',    description: 'Overall tone',
                enum: ['positive', 'negative', 'neutral', 'mixed'] },
    key_quotes: { type: 'Array', description: 'Top 3 memorable quotes', items: { type: 'String', description: 'A quote' } },
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

// LLM token counts live under the analysis_request charge:
console.log(usage?.analysis_tokens?.total_tokens); // 847
console.log(usage?.total_credits);                 // 2
```

Also works on uploaded files:

```ts
const { data } = await vn.extractFileData({
  file_id: 'your-file-id',
  schema: {
    action_items: { type: 'Array',  description: 'List of action items from the meeting', items: { type: 'String', description: 'An action item' } },
    next_meeting: { type: 'String', description: 'When is the next meeting scheduled?' },
    sentiment:    { type: 'Enum',   description: 'Overall meeting mood',
                    enum: ['productive', 'tense', 'casual', 'urgent'] },
  },
});
```

For larger schemas, pass a JSON or YAML schema file with multipart form-data:

```ts
const { data } = await vn.extractVideoData({
  video_url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
  schemaFilePath: './schemas/video-extraction.yaml',
  include_usage: true,
});
```

**Supported schema types:** `String`, `Number`, `Boolean`, `Integer`, `Object`, `Array`, `Enum`

**Schema rules:** every field needs `type` and `description`. `Array` fields also need `items` (the schema of one element). `Object` fields list their sub-fields in `properties` (up to 10), and `Enum` fields list the allowed values in `enum`. At most 10 top-level fields and 3 levels of nesting. An invalid schema is rejected with a `BadRequestError` before anything runs.

> `extractVideoData()` runs as a background job, so videos of any length work. For many extractions at once, use `vn.extractVideo.submit()` (see [Background jobs](#3-background-jobs-one-call-or-many-at-once)). The result has `data` and `usage`, but no `video_info`.

### 10. Semantic search

Search YouTube videos and uploaded files with AI-powered ranking/reranking.

```ts
// Search YouTube videos
const videoResults = await vn.searchYouTube({
  query: 'how to deploy a Node.js app',
  focus: 'relevance',   // 'relevance' (default) | 'popularity' | 'brevity'
  max_results: 5,       // caps how many candidates are analysed (and the cost)
  include_usage: true,  // attach a per-call usage block
});

console.log(`Found ${videoResults.total_found} results`);
for (const r of videoResults.results) {
  console.log(`${r.title} — score: ${r.relevance_score}`);
  console.log(`  ${r.transcript_summary}`);
}

// If credits run out mid-search, a partial result is returned instead of throwing:
if (videoResults.status === 'partial') {
  console.log('Partial results:', videoResults.error_code); // "insufficient_credits_video_search"
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

> **Deprecated:** `searchVideos()` still works but is deprecated — it now forwards to `searchYouTube()` (the `/search/video` endpoint moved to `/youtube/search`) and emits a deprecation warning. Use `searchYouTube()` instead.

### 11. Organize files with namespaces

```ts
// Create a namespace
const ns = await vn.createNamespace({ name: 'Client Calls' });

// Assign a file to namespaces
const updated = await vn.updateFileNamespaces(fileId, {
  namespace_ids: [ns.id!],
});
console.log(updated.namespaces);
// [{ id: "...", name: "Client Calls" }]

// List files filtered by namespace
const files = await vn.getFiles({ namespace_id: ns.id! });

// List all namespaces
const all = await vn.getNamespaces();
```

### 12. Usage and credits

```ts
const usage = await vn.getUsage();

console.log(`Credits remaining: ${usage.credits.monthly_remaining}`);
console.log(`Transcription hours used: ${usage.usage.transcriptionHour?.used}`);
console.log(`Standard requests used: ${usage.usage.standardRequest?.used}`);
console.log(`Storage: ${usage.storage.usedFormatted} / ${usage.storage.limitFormatted}`);
console.log(`Channels indexed: ${usage.channelsIndexed.used} / ${usage.channelsIndexed.limit}`);
```

### Per-call usage

Pass `include_usage: true` to most endpoints (`getTranscript`, `transcribeVideo`, `analyzeVideo`, `analyzeFile`, `extractVideoData`, `extractFileData`, `searchYouTube`, `searchFiles`) to receive a `usage` block describing exactly what the request cost. For background jobs, pass it in the options: `vn.transcribe(url, { include_usage: true })`, `vn.transcribe.submit(url, { include_usage: true })`, or `vn.transcribe.resume(taskId, { include_usage: true })`. The result's `usage` is filled in once the job completes. A failed job has all its charges reverted, so it has no usage.

The `usage` field is a `UsageBlock`:

```ts
const { usage } = await vn.getTranscript({
  video_url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
  include_usage: true,
});

if (usage) {
  console.log(usage.total_credits);            // net credits deducted by this request
  console.log(usage.credits_remaining_after);  // balance after the request (when provided)

  // Every meter that fired, consolidated to one entry per service_type:
  for (const charge of usage.charges) {
    console.log(charge.service_type, charge.quantity, charge.credits, charge.waived);
  }

  // Convenience accessors:
  const residential = usage.charge_for('residential_request'); // matching charge entry or undefined
  const tokens = usage.analysis_tokens;                         // { prompt_tokens, completion_tokens, total_tokens }
  console.log(tokens?.total_tokens);
}
```

`service_type` is one of: `standard_request`, `residential_request`, `transcription_hour`, `analysis_request`, `search_request`, `scene_analysis_hour`. LLM token counts (for `/extract/*`, `/analyze/*`, and `/youtube/search`) are nested inside the `analysis_request` charge — read them via the `analysis_tokens` accessor rather than expecting flat `total_tokens`. When a charge is waived via a cache-hit sponsorship, the entry carries `waived: true` + `credits_saved`, and the block carries a top-level `waived.credits_saved`.

---

## API Reference

All methods return a `Promise`. Responses are automatically parsed into typed model classes.

### Transcripts

| Method | Description |
|--------|-------------|
| `getTranscript(payload)` | Get a transcript for any supported video; auto-detects the platform from the URL (note: Instagram uses `transcribeVideo`) |
| `getYouTubeTranscript(payload)` | **Deprecated** — forwards to `getTranscript()` |
| `transcribe(urlOrInput, options?)` | Speech-to-text of any length. Input: `video_url`, `transcript_text`, `all_videos` (Instagram carousels), `webhook_url`. See [Background jobs](#background-jobs) |
| `transcribeVideo(payload, options?)` | Same as `transcribe()`, with the original payload shape (`include_usage` in the payload) |

**Common options:** `video_url`, `language`, `metadata_only`, `fallback_to_metadata`, `transcript_text`, `include_usage`

### Background jobs

| Member | Description |
|--------|-------------|
| `vn.transcribe`, `vn.extractVideo`, `vn.tweetStatement`, `vn.tiktokProfile`, `vn.tiktokSearch` | Call directly to submit and wait for the result. Options: `include_usage`, `timeoutMs`, `intervalMs`, `fastStart`, `signal`, `onPoll` |
| `.submit(input, { include_usage? })` | Start the job and return a `Job` immediately |
| `.resume(task_id, { include_usage? })` | Get a `Job` for a job you already started (no request is made) |
| `job.task_id`, `job.job_type`, `job.check_status_url`, `job.webhook_url` | Job details from the submit response |
| `job.status()` | Check once; returns `'processing'`, `'completed'` or `'failed'` |
| `job.refresh()` | Check once; returns the full task (`error`, `webhook`, timestamps, ...) |
| `job.result(options?)` | Wait until finished and return the result. Throws on failure or timeout; every error carries `task_id` |
| `job.wait(options?)` | Wait until finished and return the final task, without throwing on failure |

Results: `transcribe` → same shape as `transcribeVideo()`; `extractVideo` → `{ data, usage? }`; `tweetStatement` → `TweetStatement`; `tiktokProfile` / `tiktokSearch` → the completed task with every page of `videos` / `results`.

### Webhooks

| Function | Description |
|----------|-------------|
| `constructWebhookEvent(rawBody, signatureHeader, secret, options?)` | Verify a delivery and return the parsed `WebhookEvent`. Throws `WebhookSignatureError` if the signature is invalid |
| `verifyWebhookSignature(rawBody, signatureHeader, secret, options?)` | Same check, returning `true` / `false` |
| `WEBHOOK_HEADERS` | Header names: `signature`, `delivery`, `event`, `taskId` |

`options`: `toleranceSeconds` (default `300`, `0` turns the check off). Event types: `transcribe.*`, `extract_video.*`, `tweet_statement.*`, `tiktok_profile.*`, `tiktok_search.*`, each with `.completed` or `.failed`.

### TikTok

| Method | Description |
|--------|-------------|
| `tiktokProfile(urlOrInput, options?)` | Scrape a public profile and return the completed task with every video. See [Background jobs](#background-jobs) |
| `tiktokSearch(queryOrInput, options?)` | Keyword search returning the completed task with every result |
| `submitTikTokProfileScrape(payload)` | Lower-level: start a public TikTok profile scrape. Returns a `task_id` immediately. Options: `max_posts`, `after_datetime`, `before_datetime`, `min_likes`, `max_likes`, `webhook_url` |
| `getTikTokProfileScrape(task_id, query?)` | Poll task status and retrieve a page of videos. Options: `cursor`, `limit`, `include_usage` |
| `submitTikTokSearch(payload)` | Start an async TikTok keyword search. Returns a `task_id` immediately. Options: `max_results`, `parallel_search_slices`, `sort_by`, `published_within`, `after_datetime`, `before_datetime`, `min_likes`, `max_likes`, `min_views`, `max_views`, `webhook_url` |
| `getTikTokSearch(task_id, query?)` | Poll search status and retrieve a page of results. Options: `cursor`, `limit`, `include_usage` |

Completed profile tasks include `videos`; completed search tasks include `results`. Both include `pagination`, optional `stats`, and an optional short-lived `download_url` for retrieving the whole result as JSON. Failed tasks include `error` (`{ error, message, http_status }`); the older `error_message` string still works but is deprecated. Datetime filters use `after_datetime` and `before_datetime`, each accepting either `YYYY-MM-DD` or full ISO datetime strings with timezone; TikTok `published_at` values are parsed into JavaScript `Date` objects, and numeric counters such as `views` and `likes` are normalized to integers.

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
| `tweetStatement(tweetIdOrInput, options?)` | Structured claim analysis of an X/Twitter tweet, including attached media of any length. Input: `tweet_id`, `webhook_url`. Returns a `TweetStatement` |
| `getTweetStatement(payload, options?)` | Same as `tweetStatement()`, with the original payload shape |

Returns `transcript_analysis` containing:
- `summary` — content overview
- `people` — people mentioned (name + context)
- `places` — locations referenced
- `key_subjects` — important topics (name, description, importance)
- `query_answer` — direct answer to your query (when provided) with `answer`, `best_segment_index`, and `relevant_segments`

### Extraction

| Method | Description |
|--------|-------------|
| `extractVideo(input, options?)` | Structured data from an online video of any length. Input: `video_url`, `schema` or `schemaFilePath`, `what_to_extract`, `transcribe`, `webhook_url`. Returns `{ data, usage? }` |
| `extractVideoData(payload, options?)` | Same as `extractVideo()`, with the original payload shape (`include_usage` in the payload) |
| `extractFileData(payload)` | Extract structured data from an uploaded file transcript |

**Options:** `schema` (required for JSON requests), `schemaFilePath` (JSON/YAML schema file via multipart form-data), `what_to_extract` (optional guidance), `include_usage` (attach a per-call `UsageBlock`; read LLM tokens via `usage.analysis_tokens`)

**Schema field types:** `String`, `Number`, `Boolean`, `Integer`, `Object`, `Array`, `Enum`

### Search

| Method | Description |
|--------|-------------|
| `searchYouTube(payload)` | Search YouTube videos with AI ranking/reranking |
| `searchVideos(payload)` | **Deprecated** — forwards to `searchYouTube()` |
| `searchFiles(payload)` | Semantic search across uploaded files, with optional `namespace_ids` scope |

**`searchYouTube` options:** `query` (required), `use_enhanced_search` (default `true`), `start_year`, `end_year`, `focus` (`'relevance'` (default) \| `'popularity'` \| `'brevity'`), `duration`, `max_results` (caps candidates analysed & cost; defaults to your plan ceiling), `include_usage`.

Results include `relevance_score`, `transcript_summary`, `people`, `places`, `key_subjects`, `query_answer`, `timestamps`, and `relevant_text`. If credits run out mid-search the API returns a partial result: `searchYouTube` surfaces it as `{ status: 'partial', error_code: 'insufficient_credits_video_search', results, usage? }` instead of throwing.

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
| `InsufficientCreditsError` | 402 | A job could not start: not enough credits (`limit_exceeded`). Extends `PaymentRequiredError` |
| `AccessDeniedError` | 403 | Insufficient permissions |
| `NotFoundError` | 404 | Resource does not exist, or a job's `task_id` is unknown or expired (`task_not_found`) |
| `StorageQuotaExceededError` | 413 | Storage quota exceeded |
| `RateLimitExceededError` | 429 | Too many requests |
| `TooManyActiveJobsError` | 429 | A job could not start: too many of your jobs are already running (`too_many_active_jobs`). Extends `RateLimitExceededError` |
| `GeoRestrictedError` | 451 | Content unavailable in your region |
| `ServerError` | 5xx | Unexpected server error |
| `SystemOverloadError` | 503 | Temporary overload (has `retry_after_seconds`) |
| `TaskTimeoutError` | - | Waiting for a job took longer than `timeoutMs`. Has `task_id`; the job keeps running, so `resume(task_id)` it |
| `WebhookSignatureError` | - | `constructWebhookEvent()` got a missing, invalid, or expired signature |

A failed job throws the class matching its `error.http_status`, with `error_code` and `error_message` taken from its `error` details. Every error raised while waiting for a job has a `task_id` property.

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
| `UsageData` | Account-level usage from `getUsage()`: credits info, per-service activity counts, storage metrics, subscription details |
| `UsageBlock` | Per-call usage returned when `include_usage: true`: `charges[]`, `total_credits`, `credits_remaining_after`, `waived`, plus `charge_for(service_type)` and `analysis_tokens` accessors |
| `UsageCharge` | A single consolidated meter charge: `service_type`, `quantity`, `credits`, `waived`, `credits_saved`, and (on `analysis_request`) `tokens` |
| `ExtractionTokenUsage` | Legacy flat token usage (`prompt_tokens`, `completion_tokens`, `total_tokens`) — extraction now returns a `UsageBlock`; prefer `usage.analysis_tokens` |
| `CarouselInfo` | Carousel summary: total items, video/image count, transcribed count, total duration |
| `CarouselVideoResult` | Per-video result in a carousel: index, status, video info, transcript |
| `Job` | Handle returned by `.submit()` / `.resume()`: `task_id`, `status()`, `refresh()`, `result()`, `wait()` |
| `AsyncJob<T>` | Task snapshot of a transcription, extraction, or tweet job (from `job.refresh()` / `job.wait()`): `task_status`, `result`, `error`, `webhook`, `request`, timestamps |
| `TikTokProfileScrapeSubmission` | Async scrape submission: `task_id`, status, profile URL, expiry, `webhook_url` |
| `TikTokProfileTask` | TikTok profile scrape task with status, profile metadata, videos, pagination, `download_url`, `error`, `webhook` |
| `TikTokVideo` | Public TikTok video metadata returned by profile scraping, including `published_at` as a `Date` and integer counters |
| `TikTokSearchSubmission` | Async TikTok keyword search submission: `task_id`, query, slice count, expiry, `webhook_url` |
| `TikTokSearchTask` | TikTok keyword search task with status, results, pagination, `download_url`, `error`, `webhook`; `stats` shows the `sort_by` / `published_within` the search ran with |
| `TikTokSearchResult` | Normalized TikTok keyword result, including `published_at` as a `Date` and integer counters |
| `TweetStatement` | Structured X/Twitter claim analysis, topics, entities, tone, intent, and source text |

## Links

- [VidNavigator Website](https://vidnavigator.com)
- [API Documentation](https://docs.vidnavigator.com)
- [GitHub Repository](https://github.com/vidnavigator/vidnavigator-js)

## License

[Apache-2.0](./LICENSE)
