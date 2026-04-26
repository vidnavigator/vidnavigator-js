/**
 * Unit tests — no network calls, pure model / error / export verification.
 * Run: node tests/unit.test.js
 */
const { sdk, assert, summary } = require('./helpers');

console.log('=== Unit Tests ===\n');

// --- SDK_VERSION ---
assert(typeof sdk.SDK_VERSION === 'string' && sdk.SDK_VERSION.length > 0, 'SDK_VERSION is a non-empty string');
const pkg = require('../vidnavigator/package.json');
assert(sdk.SDK_VERSION === pkg.version, `SDK_VERSION is ${pkg.version} (got ${sdk.SDK_VERSION})`);

// --- VidNavigatorClient constructor ---
assert(typeof sdk.VidNavigatorClient === 'function', 'VidNavigatorClient is exported');
try {
  new sdk.VidNavigatorClient({});
  assert(false, 'Constructor throws without apiKey');
} catch (e) {
  assert(e.message.includes('API key is required'), 'Constructor throws without apiKey');
}

// --- VideoInfo ---
{
  const json = {
    title: 'Test', description: 'Desc', url: 'https://x.com/v',
    channel: 'Ch', duration: 120, views: 100, likes: 10,
    published_date: '2024-01-01', keywords: ['a'], category: 'Test',
    available_languages: ['en'], selected_language: 'en',
    carousel_info: { total_items: 3, video_count: 2, image_count: 1, selected_index: 1 },
  };
  const vi = sdk.VideoInfo.fromJSON(json);
  assert(vi instanceof sdk.VideoInfo, 'VideoInfo.fromJSON returns VideoInfo instance');
  assert(vi.title === 'Test', 'VideoInfo.title');
  assert(vi.carousel_info instanceof sdk.VideoCarouselInfo, 'VideoInfo.carousel_info is VideoCarouselInfo');
  assert(vi.carousel_info.video_count === 2, 'VideoCarouselInfo.video_count');
}

// --- FileInfo ---
{
  const fi = sdk.FileInfo.fromJSON({
    id: 'f1', name: 'audio.mp3', status: 'completed',
    created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
    size: 1024, type: 'audio/mpeg', duration: 60, has_transcript: true,
    namespace_ids: ['ns1', 'ns2'],
    namespaces: [{ id: 'ns1', name: 'Work' }, { id: 'ns2', name: 'Archive' }],
  });
  assert(fi instanceof sdk.FileInfo, 'FileInfo instance');
  assert(fi.id === 'f1' && fi.has_transcript === true, 'FileInfo fields');
  assert(Array.isArray(fi.namespace_ids) && fi.namespace_ids.length === 2, 'FileInfo.namespace_ids');
  assert(fi.namespace_ids[0] === 'ns1', 'FileInfo.namespace_ids[0]');
  assert(Array.isArray(fi.namespaces) && fi.namespaces.length === 2, 'FileInfo.namespaces');
  assert(fi.namespaces[0] instanceof sdk.NamespaceRef, 'FileInfo.namespaces[0] is NamespaceRef');
  assert(fi.namespaces[0].id === 'ns1' && fi.namespaces[0].name === 'Work', 'FileInfo.namespaces[0] fields');
  assert(fi.namespaces[1].name === 'Archive', 'FileInfo.namespaces[1].name');
}

// --- FileInfo without namespaces (backward compat) ---
{
  const fi2 = sdk.FileInfo.fromJSON({
    id: 'f2', name: 'old.mp3', status: 'completed',
    created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
  });
  assert(fi2.namespace_ids === undefined, 'FileInfo without namespace_ids');
  assert(fi2.namespaces === undefined, 'FileInfo without namespaces');
}

// --- TranscriptSegment ---
{
  const seg = sdk.TranscriptSegment.fromJSON({ text: 'hello', start: 0.5, end: 1.5 });
  assert(seg instanceof sdk.TranscriptSegment, 'TranscriptSegment instance');
  assert(seg.text === 'hello' && seg.start === 0.5 && seg.end === 1.5, 'TranscriptSegment fields');
}

// --- transcriptFromJSON ---
{
  const segments = sdk.transcriptFromJSON([
    { text: 'a', start: 0, end: 1 },
    { text: 'b', start: 1, end: 2 },
  ]);
  assert(Array.isArray(segments) && segments.length === 2, 'transcriptFromJSON parses segment array');
  assert(segments[0] instanceof sdk.TranscriptSegment, 'transcriptFromJSON returns TranscriptSegment instances');

  const plain = sdk.transcriptFromJSON('Hello world');
  assert(plain === 'Hello world', 'transcriptFromJSON passes through string');
  assert(sdk.transcriptFromJSON(undefined) === undefined, 'transcriptFromJSON handles undefined');
}

// --- AnalysisResult ---
{
  const ar = sdk.AnalysisResult.fromJSON({
    summary: 'Sum', people: [{ name: 'Alice', context: 'c' }],
    places: [], key_subjects: [{ name: 'KS', description: 'd', importance: 'high' }],
    query_answer: { answer: 'A', best_segment_index: 0, relevant_segments: ['s'] },
  });
  assert(ar instanceof sdk.AnalysisResult, 'AnalysisResult instance');
  assert(ar.people.length === 1 && ar.people[0].name === 'Alice', 'AnalysisResult.people');
  assert(ar.query_answer.answer === 'A', 'AnalysisResult.query_answer');
}

// --- NamespaceRef ---
{
  assert(typeof sdk.NamespaceRef === 'function', 'NamespaceRef is exported');
  const nr = sdk.NamespaceRef.fromJSON({ id: 'ns1', name: 'My Namespace' });
  assert(nr instanceof sdk.NamespaceRef, 'NamespaceRef instance');
  assert(nr.id === 'ns1' && nr.name === 'My Namespace', 'NamespaceRef fields');
}

// --- Namespace ---
{
  const ns = sdk.Namespace.fromJSON({ id: 'n1', name: 'Test NS', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' });
  assert(ns instanceof sdk.Namespace, 'Namespace instance');
  assert(ns.id === 'n1' && ns.name === 'Test NS', 'Namespace fields');
}

// --- CarouselInfo ---
{
  const ci = sdk.CarouselInfo.fromJSON({ total_items: 5, video_count: 3, image_count: 2, transcribed_count: 3, total_duration: 120 });
  assert(ci instanceof sdk.CarouselInfo, 'CarouselInfo instance');
  assert(ci.transcribed_count === 3, 'CarouselInfo.transcribed_count');
}

// --- CarouselVideoResult ---
{
  const cvr = sdk.CarouselVideoResult.fromJSON({
    index: 1, status: 'success',
    video_info: { title: 'V1', url: 'https://x.com' },
    transcript: [{ text: 'hi', start: 0, end: 1 }],
  });
  assert(cvr instanceof sdk.CarouselVideoResult, 'CarouselVideoResult instance');
  assert(cvr.video_info instanceof sdk.VideoInfo, 'CarouselVideoResult.video_info is VideoInfo');
  assert(Array.isArray(cvr.transcript) && cvr.transcript[0] instanceof sdk.TranscriptSegment, 'CarouselVideoResult.transcript parsed');
}

// --- ExtractionTokenUsage ---
{
  const u = sdk.ExtractionTokenUsage.fromJSON({ prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 });
  assert(u instanceof sdk.ExtractionTokenUsage, 'ExtractionTokenUsage instance');
  assert(u.total_tokens === 30, 'ExtractionTokenUsage.total_tokens');
}

// --- TikTok profile models ---
{
  const task = sdk.TikTokProfileTask.fromJSON({
    task_id: 'task-1',
    task_status: 'completed',
    profile_url: 'https://www.tiktok.com/@tiktok',
    filters: { max_posts: 10.9, after_date: '2026-04-01', before_date: '2026-04-30' },
    stats: { videos_scanned: 2.8, videos_matched: 1.2, pages_consumed: 1.9 },
    videos: [{
      id: 'v1',
      duration: 12.8,
      timestamp: 1776892618.9,
      published_at: '2026-04-22T21:16:58+00:00',
      views: 100.9,
      likes: 50.7,
      reposts: 3.2,
      comments: 4.8,
      url: 'https://www.tiktok.com/@tiktok/video/1',
    }],
    pagination: { limit: 50.7, offset: 0.1, total_items: 1.9, has_next: false, has_prev: false },
  });
  assert(task instanceof sdk.TikTokProfileTask, 'TikTokProfileTask instance');
  assert(task.videos[0] instanceof sdk.TikTokVideo, 'TikTokProfileTask.videos parsed');
  assert(task.videos[0].published_at instanceof Date, 'TikTokVideo.published_at parsed as Date');
  assert(task.videos[0].published_at.toISOString() === '2026-04-22T21:16:58.000Z', 'TikTokVideo.published_at value');
  assert(Number.isInteger(task.videos[0].views) && task.videos[0].views === 100, 'TikTokVideo.views integer');
  assert(Number.isInteger(task.videos[0].likes) && task.videos[0].likes === 50, 'TikTokVideo.likes integer');
  assert(Number.isInteger(task.stats.videos_scanned) && task.stats.videos_scanned === 2, 'TikTokProfileTask.stats integers');
  assert(task.pagination.total_items === 1, 'TikTokProfileTask.pagination');
  assert(task.filters.after_date === '2026-04-01', 'TikTokProfileTask filters use YYYY-MM-DD');
}

// --- TweetStatement ---
{
  const statement = sdk.TweetStatement.fromJSON({
    final_statement: 'The author claims something testable.',
    statement_query: 'testable claim',
    topics: ['topic'],
    entities: ['Entity'],
    claim_type: 'factual_claim',
    intent: 'inform',
    tone: 'serious',
    emotion: 'curiosity',
    authority: 'data_driven',
    tweet_text: 'A tweet',
  });
  assert(statement instanceof sdk.TweetStatement, 'TweetStatement instance');
  assert(statement.claim_type === 'factual_claim', 'TweetStatement.claim_type');
  assert(statement.topics.length === 1, 'TweetStatement.topics');
}

// --- UsageData (credits model) ---
{
  const ud = sdk.UsageData.fromJSON({
    usage_period: { start: '2024-01-01T00:00:00Z', end: '2024-02-01T00:00:00Z' },
    billing_period: { start: '2024-01-01T00:00:00Z', end: '2024-02-01T00:00:00Z', interval: 'month' },
    subscription: { plan_id: 'p1', plan_name: 'Pro', interval: 'month', status: 'active', cancel_at_period_end: false },
    credits: { monthly_total: 1000, monthly_remaining: 500, purchased: 0 },
    usage: {
      video_transcripts: { used: 10 },
      youtube_transcripts: { used: 5 },
      video_searches: { used: 3 },
      video_analyses: { used: 2 },
      video_scene_analyses: { used: 1 },
      video_uploads: { used: 0, unit: 'hours' },
    },
    channels_indexed: { used: 0, limit: 10, remaining: 10, percentage: 0 },
    storage: {
      used_bytes: 0, used_formatted: '0 B',
      limit_bytes: 1073741824, limit_formatted: '1 GB',
      remaining_bytes: 1073741824, remaining_formatted: '1 GB', percentage: 0,
    },
    generated_at: '2024-01-15T12:00:00Z',
  });
  assert(ud instanceof sdk.UsageData, 'UsageData instance');
  assert(ud.credits instanceof sdk.CreditsInfo, 'UsageData.credits is CreditsInfo');
  assert(ud.credits.monthly_total === 1000, 'CreditsInfo.monthly_total');
  assert(ud.usage.youtubeTranscripts instanceof sdk.ActivityCount, 'UsageData.usage.youtubeTranscripts is ActivityCount');
  assert(ud.usage.videoUploads.unit === 'hours', 'ActivityCount.unit');
  assert(ud.channelsIndexed instanceof sdk.CapacityMetric, 'UsageData.channelsIndexed is CapacityMetric');
  assert(ud.channelsIndexed.limit === 10, 'CapacityMetric.limit');
  assert(ud.storage instanceof sdk.StorageUsage, 'UsageData.storage is StorageUsage');
  assert(ud.generatedAt instanceof Date, 'UsageData.generatedAt is Date');
}

// --- VideoSearchResult ---
{
  const vsr = sdk.VideoSearchResult.fromJSON({
    title: 'SR', url: 'https://x.com', relevance_score: 0.9,
    people: [{ name: 'Bob' }], key_subjects: [{ name: 'KS' }],
    timestamp: 42, query_relevance: 'high',
  });
  assert(vsr instanceof sdk.VideoSearchResult, 'VideoSearchResult instance');
  assert(vsr instanceof sdk.VideoInfo, 'VideoSearchResult extends VideoInfo');
  assert(vsr.people.length === 1 && vsr.people[0].name === 'Bob', 'VideoSearchResult.people');
  assert(vsr.query_relevance === 'high', 'VideoSearchResult.query_relevance');
}

// --- FileSearchResult ---
{
  const fsr = sdk.FileSearchResult.fromJSON({
    id: 'f1', name: 'file.mp4', status: 'completed',
    created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
    relevance_score: 0.8, file_url: 'https://x.com/f',
    timestamps: [10, 20], query_answer: 'The answer',
    namespace_ids: ['ns1'], namespaces: [{ id: 'ns1', name: 'Meetings' }],
  });
  assert(fsr instanceof sdk.FileSearchResult, 'FileSearchResult instance');
  assert(fsr instanceof sdk.FileInfo, 'FileSearchResult extends FileInfo');
  assert(fsr.timestamps.length === 2, 'FileSearchResult.timestamps');
  assert(fsr.query_answer === 'The answer', 'FileSearchResult.query_answer');
  assert(fsr.namespace_ids.length === 1 && fsr.namespace_ids[0] === 'ns1', 'FileSearchResult.namespace_ids (inherited)');
  assert(fsr.namespaces[0] instanceof sdk.NamespaceRef, 'FileSearchResult.namespaces[0] is NamespaceRef (inherited)');
  assert(fsr.namespaces[0].name === 'Meetings', 'FileSearchResult.namespaces[0].name');
}

// --- Error classes ---
{
  const errors = [
    ['VidNavigatorError', sdk.VidNavigatorError],
    ['AuthenticationError', sdk.AuthenticationError],
    ['BadRequestError', sdk.BadRequestError],
    ['AccessDeniedError', sdk.AccessDeniedError],
    ['NotFoundError', sdk.NotFoundError],
    ['RateLimitExceededError', sdk.RateLimitExceededError],
    ['PaymentRequiredError', sdk.PaymentRequiredError],
    ['ServerError', sdk.ServerError],
    ['StorageQuotaExceededError', sdk.StorageQuotaExceededError],
    ['GeoRestrictedError', sdk.GeoRestrictedError],
    ['SystemOverloadError', sdk.SystemOverloadError],
  ];
  for (const [name, Cls] of errors) {
    const inst = new Cls('test', 400, 'code', 'msg', { d: 1 });
    assert(inst instanceof Error, `${name} extends Error`);
    assert(inst instanceof sdk.VidNavigatorError, `${name} extends VidNavigatorError`);
    assert(inst.name === name, `${name}.name is "${name}"`);
  }
  const soe = new sdk.SystemOverloadError('msg', 503, 'system_overload', 'busy', null, 30);
  assert(soe.retry_after_seconds === 30, 'SystemOverloadError.retry_after_seconds');
}

// --- Method existence on prototype ---
{
  const methods = [
    'getTranscript', 'getYouTubeTranscript', 'transcribeVideo',
    'getFiles', 'getFile', 'uploadFile', 'deleteFile', 'getFileUrl',
    'retryFileProcessing', 'cancelFileUpload',
    'getNamespaces', 'createNamespace', 'updateNamespace', 'deleteNamespace', 'updateFileNamespaces',
    'analyzeVideo', 'analyzeFile',
    'getTweetStatement',
    'extractVideoData', 'extractFileData',
    'submitTikTokProfileScrape', 'getTikTokProfileScrape',
    'searchVideos', 'searchFiles',
    'getUsage', 'healthCheck',
  ];
  for (const m of methods) {
    assert(
      typeof sdk.VidNavigatorClient.prototype[m] === 'function',
      `VidNavigatorClient.prototype.${m} exists`
    );
  }
}

async function runClientMethodTests() {
  const client = new sdk.VidNavigatorClient({ apiKey: 'test-key' });
  const calls = [];
  client.request = async (method, url, data, params) => {
    calls.push({ method, url, data, params });
    if (url === '/youtube/transcript') {
      return {
        status: 'success',
        data: {
          video_info: { title: 'YT', url: 'https://youtube.com/watch?v=test' },
          transcript: 'hello',
        },
      };
    }
    if (url === '/tiktok/profile' && method === 'POST') {
      return {
        status: 'success',
        data: {
          task_id: 'task-1',
          task_status: 'processing',
          profile_url: data.profile_url,
          check_status_url: '/v1/tiktok/profile/task-1',
        },
      };
    }
    if (url === '/tiktok/profile/task-1' && method === 'GET') {
      return {
        status: 'success',
        data: {
          task_id: 'task-1',
          task_status: 'completed',
          videos: [{ id: 'v1' }],
          pagination: { limit: 1, offset: 0, total_items: 1, has_next: false, has_prev: false },
        },
      };
    }
    if (url === '/tweet/statement') {
      return {
        status: 'success',
        data: {
          final_statement: 'A claim',
          statement_query: 'claim',
          claim_type: 'factual_claim',
        },
      };
    }
    if (url === '/extract/video') {
      return {
        status: 'success',
        data: { topic: 'testing' },
        video_info: { title: 'Video', url: data.video_url },
        usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
      };
    }
    if (url === '/extract/file') {
      return {
        status: 'success',
        data: { summary: 'testing' },
        file_info: {
          id: data.file_id,
          name: 'file.mp4',
          status: 'completed',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      };
    }
    throw new Error(`Unexpected request: ${method} ${url}`);
  };

  const yt = await client.getYouTubeTranscript({ video_url: 'https://youtube.com/watch?v=test' });
  assert(yt.video_info instanceof sdk.VideoInfo, 'getYouTubeTranscript parses VideoInfo');
  assert(calls[calls.length - 1].url === '/youtube/transcript', 'getYouTubeTranscript uses /youtube/transcript');

  const submitted = await client.submitTikTokProfileScrape({ profile_url: 'https://www.tiktok.com/@tiktok' });
  assert(submitted instanceof sdk.TikTokProfileScrapeSubmission, 'submitTikTokProfileScrape parses submission');
  assert(calls[calls.length - 1].url === '/tiktok/profile', 'submitTikTokProfileScrape path');

  const scrape = await client.getTikTokProfileScrape('task-1', { limit: 1 });
  assert(scrape instanceof sdk.TikTokProfileTask, 'getTikTokProfileScrape parses task');
  assert(calls[calls.length - 1].params.limit === 1, 'getTikTokProfileScrape query params');

  const tweet = await client.getTweetStatement({ tweet_id: '123' });
  assert(tweet instanceof sdk.TweetStatement, 'getTweetStatement parses TweetStatement');
  assert(calls[calls.length - 1].url === '/tweet/statement', 'getTweetStatement path');

  const videoExtraction = await client.extractVideoData({
    video_url: 'https://example.com/video',
    schema: { topic: { type: 'String', description: 'Topic' } },
    transcribe: false,
    include_usage: true,
  });
  assert(videoExtraction.video_info instanceof sdk.VideoInfo, 'extractVideoData parses video_info');
  assert(videoExtraction.usage instanceof sdk.ExtractionTokenUsage, 'extractVideoData parses usage');
  assert(calls[calls.length - 1].data.transcribe === false, 'extractVideoData sends transcribe');

  const fileExtraction = await client.extractFileData({
    file_id: 'file-1',
    schema: { summary: { type: 'String', description: 'Summary' } },
  });
  assert(fileExtraction.file_info instanceof sdk.FileInfo, 'extractFileData parses file_info');
}

runClientMethodTests()
  .then(() => process.exit(summary()))
  .catch((e) => {
    fail('client method tests', e.message);
    process.exit(summary());
  });
