/**
 * Unit tests — no network calls, pure model / error / export verification.
 * Run: node tests/unit.test.js
 */
const fs = require('fs');
const path = require('path');
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

// --- UsageBlock (charges-based, tokens under analysis_request) ---
{
  const ub = sdk.UsageBlock.fromJSON({
    charges: [
      { service_type: 'residential_request', quantity: 1, credits: 1 },
      {
        service_type: 'analysis_request',
        quantity: 2,
        credits: 2,
        tokens: { prompt_tokens: 1200, completion_tokens: 300, total_tokens: 1500 },
      },
    ],
    total_credits: 3,
    credits_remaining_after: 497,
  });
  assert(ub instanceof sdk.UsageBlock, 'UsageBlock instance');
  assert(Array.isArray(ub.charges) && ub.charges.length === 2, 'UsageBlock.charges array');
  assert(ub.charges[0] instanceof sdk.UsageCharge, 'UsageBlock.charges[0] is UsageCharge');
  assert(ub.total_credits === 3, 'UsageBlock.total_credits');
  assert(ub.credits_remaining_after === 497, 'UsageBlock.credits_remaining_after');

  const analysis = ub.charge_for('analysis_request');
  assert(analysis && analysis.service_type === 'analysis_request', 'UsageBlock.charge_for(analysis_request)');
  assert(ub.chargeFor('residential_request').credits === 1, 'UsageBlock.chargeFor alias');
  assert(ub.charge_for('search_request') === undefined, 'UsageBlock.charge_for missing meter');

  const tokens = ub.analysis_tokens;
  assert(tokens && tokens.total_tokens === 1500, 'UsageBlock.analysis_tokens reads analysis_request tokens');
  assert(ub.analysisTokens.prompt_tokens === 1200, 'UsageBlock.analysisTokens alias');
}

// --- UsageBlock (legacy flat token fallback + waived) ---
{
  const ub = sdk.UsageBlock.fromJSON({
    charges: [{ service_type: 'transcription_hour', quantity: 0.1, credits: 0, waived: true, credits_saved: 5 }],
    total_credits: 0,
    waived: { credits_saved: 5 },
    prompt_tokens: 10,
    completion_tokens: 5,
    total_tokens: 15,
  });
  assert(ub.waived && ub.waived.credits_saved === 5, 'UsageBlock.waived.credits_saved');
  assert(ub.charges[0].waived === true, 'UsageCharge.waived');
  const tokens = ub.analysis_tokens;
  assert(tokens && tokens.total_tokens === 15, 'UsageBlock.analysis_tokens falls back to flat token fields');
}

// --- TikTok profile models ---
{
  const task = sdk.TikTokProfileTask.fromJSON({
    task_id: 'task-1',
    task_status: 'completed',
    profile_url: 'https://www.tiktok.com/@tiktok',
    filters: {
      max_posts: 10.9,
      after_datetime: '2026-04-01',
      before_datetime: '2026-04-30T23:59:59+00:00',
    },
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
  assert(task.filters.after_datetime === '2026-04-01', 'TikTokProfileTask filters accept YYYY-MM-DD');
  assert(
    task.filters.before_datetime === '2026-04-30T23:59:59+00:00',
    'TikTokProfileTask filters accept ISO datetime'
  );
}

// --- TikTok search models ---
{
  const submitted = sdk.TikTokSearchSubmission.fromJSON({
    task_id: 'search-1',
    task_status: 'processing',
    query: 'ai tools',
    max_results: 25.9,
    parallel_search_slices: 2.7,
  });
  assert(submitted instanceof sdk.TikTokSearchSubmission, 'TikTokSearchSubmission instance');
  assert(submitted.max_results === 25, 'TikTokSearchSubmission max_results integer');
  assert(submitted.parallel_search_slices === 2, 'TikTokSearchSubmission parallel_search_slices integer');

  const task = sdk.TikTokSearchTask.fromJSON({
    task_id: 'search-1',
    task_status: 'completed',
    query: 'ai tools',
    parallel_search_slices: 2.7,
    filters: {
      after_datetime: '2026-04-01',
      min_likes: 10.9,
      max_views: 1000.7,
    },
    stats: { pages_fetched: 3.8, results_count: 20.2, next_search_cursor: 123.9 },
    results: [{
      id: 'v1',
      item_type: 0.9,
      description: 'demo',
      timestamp: 1776892618.9,
      published_at: '2026-04-22T21:16:58+00:00',
      stats: { views: 100.9, likes: 50.7, comments: 4.8, shares: 3.2, collects: 2.9 },
      music: { id: 'm1', title: 'sound', duration: 12.8 },
      duration: 13.9,
      hashtags: ['ai'],
      url: 'https://www.tiktok.com/@creator/video/1',
    }],
    pagination: { limit: 50.7, offset: 0.1, total_items: 1.9, has_next: false, has_prev: false },
  });
  assert(task instanceof sdk.TikTokSearchTask, 'TikTokSearchTask instance');
  assert(task.results[0] instanceof sdk.TikTokSearchResult, 'TikTokSearchTask.results parsed');
  assert(task.results[0].published_at instanceof Date, 'TikTokSearchResult.published_at parsed as Date');
  assert(task.results[0].published_at.toISOString() === '2026-04-22T21:16:58.000Z', 'TikTokSearchResult.published_at value');
  assert(task.results[0].stats.views === 100, 'TikTokSearchResult stats integers');
  assert(task.results[0].music.duration === 12, 'TikTokSearchResult music duration integer');
  assert(task.filters.min_likes === 10, 'TikTokSearchTask filters integers');
  assert(task.stats.pages_fetched === 3, 'TikTokSearchTask stats integers');
  assert(task.pagination.total_items === 1, 'TikTokSearchTask pagination');
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
    'submitTikTokSearch', 'getTikTokSearch',
    'getTranscript', 'searchYouTube',
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
  client.request = async (method, url, data, params, extraHeaders) => {
    calls.push({ method, url, data, params, extraHeaders });
    if (url === '/transcript') {
      return {
        status: 'success',
        data: {
          video_info: { title: 'Any', url: data.video_url },
          transcript: 'hello',
        },
        usage: data.include_usage
          ? {
              charges: [{ service_type: 'residential_request', quantity: 1, credits: 1 }],
              total_credits: 1,
              credits_remaining_after: 499,
            }
          : undefined,
      };
    }
    if (url === '/youtube/search' && method === 'POST') {
      return {
        status: 'success',
        data: {
          results: [{ title: 'R1', url: 'https://youtube.com/watch?v=r1', relevance_score: 0.9 }],
          query: data.query,
          total_found: 1,
        },
        usage: data.include_usage
          ? {
              charges: [
                { service_type: 'residential_request', quantity: 1, credits: 1 },
                {
                  service_type: 'analysis_request',
                  quantity: 1,
                  credits: 1,
                  tokens: { prompt_tokens: 900, completion_tokens: 100, total_tokens: 1000 },
                },
              ],
              total_credits: 2,
            }
          : undefined,
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
        usage: params && params.include_usage === 'true'
          ? {
              charges: [{ service_type: 'standard_request', quantity: 2, credits: 2 }],
              total_credits: 2,
            }
          : undefined,
      };
    }
    if (url === '/tiktok/search' && method === 'POST') {
      return {
        status: 'success',
        data: {
          task_id: 'search-1',
          task_status: 'processing',
          query: data.query,
          check_status_url: '/v1/tiktok/search/search-1',
        },
      };
    }
    if (url === '/tiktok/search/search-1' && method === 'GET') {
      return {
        status: 'success',
        data: {
          task_id: 'search-1',
          task_status: 'completed',
          query: 'ai tools',
          results: [{ id: 'v1', published_at: '2026-04-22T21:16:58+00:00' }],
          pagination: { limit: 1, offset: 0, total_items: 1, has_next: false, has_prev: false },
        },
        usage: params && params.include_usage === 'true'
          ? {
              charges: [{ service_type: 'residential_request', quantity: 3, credits: 3 }],
              total_credits: 3,
            }
          : undefined,
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
        usage: {
          charges: [
            {
              service_type: 'analysis_request',
              quantity: 1,
              credits: 1,
              tokens: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
            },
          ],
          total_credits: 1,
        },
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

  // getTranscript hits the single /transcript endpoint and parses usage when requested.
  const tr = await client.getTranscript({ video_url: 'https://twitter.com/u/status/1', include_usage: true });
  assert(tr.video_info instanceof sdk.VideoInfo, 'getTranscript parses VideoInfo');
  assert(calls[calls.length - 1].url === '/transcript', 'getTranscript uses /transcript');
  assert(calls[calls.length - 1].data.include_usage === true, 'getTranscript sends include_usage in body');
  assert(tr.usage instanceof sdk.UsageBlock, 'getTranscript parses usage as UsageBlock');
  assert(tr.usage.total_credits === 1, 'getTranscript usage.total_credits');

  // getYouTubeTranscript is a deprecated alias that forwards to /transcript with a warning.
  {
    const originalWarn = console.warn;
    let warned = '';
    console.warn = (msg) => { warned += msg; };
    try {
      const yt = await client.getYouTubeTranscript({ video_url: 'https://youtube.com/watch?v=test' });
      assert(yt.video_info instanceof sdk.VideoInfo, 'getYouTubeTranscript (alias) parses VideoInfo');
    } finally {
      console.warn = originalWarn;
    }
    assert(calls[calls.length - 1].url === '/transcript', 'getYouTubeTranscript alias forwards to /transcript');
    assert(/deprecated/i.test(warned) && /getTranscript/.test(warned), 'getYouTubeTranscript emits deprecation warning');
  }

  const submitted = await client.submitTikTokProfileScrape({ profile_url: 'https://www.tiktok.com/@tiktok' });
  assert(submitted instanceof sdk.TikTokProfileScrapeSubmission, 'submitTikTokProfileScrape parses submission');
  assert(calls[calls.length - 1].url === '/tiktok/profile', 'submitTikTokProfileScrape path');

  const scrape = await client.getTikTokProfileScrape('task-1', { limit: 1, include_usage: true });
  assert(scrape instanceof sdk.TikTokProfileTask, 'getTikTokProfileScrape parses task');
  assert(calls[calls.length - 1].params.limit === 1, 'getTikTokProfileScrape query params');
  assert(calls[calls.length - 1].params.include_usage === 'true', 'getTikTokProfileScrape sends include_usage query param');
  assert(scrape.usage instanceof sdk.UsageBlock, 'getTikTokProfileScrape attaches usage on completed task');
  assert(scrape.usage.charge_for('standard_request').quantity === 2, 'getTikTokProfileScrape usage charge');

  const searchSubmitted = await client.submitTikTokSearch({ query: 'ai tools', parallel_search_slices: 2 });
  assert(searchSubmitted instanceof sdk.TikTokSearchSubmission, 'submitTikTokSearch parses submission');
  assert(calls[calls.length - 1].url === '/tiktok/search', 'submitTikTokSearch path');

  const search = await client.getTikTokSearch('search-1', { limit: 1, include_usage: true });
  assert(search instanceof sdk.TikTokSearchTask, 'getTikTokSearch parses task');
  assert(search.results[0] instanceof sdk.TikTokSearchResult, 'getTikTokSearch parses results');
  assert(calls[calls.length - 1].params.limit === 1, 'getTikTokSearch query params');
  assert(calls[calls.length - 1].params.include_usage === 'true', 'getTikTokSearch sends include_usage query param');
  assert(search.usage instanceof sdk.UsageBlock, 'getTikTokSearch attaches usage on completed task');
  assert(search.usage.charge_for('residential_request').quantity === 3, 'getTikTokSearch usage charge');

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
  assert(videoExtraction.usage instanceof sdk.UsageBlock, 'extractVideoData parses usage as UsageBlock');
  assert(
    videoExtraction.usage.analysis_tokens && videoExtraction.usage.analysis_tokens.total_tokens === 3,
    'extractVideoData usage.analysis_tokens from analysis_request charge'
  );
  assert(calls[calls.length - 1].data.transcribe === false, 'extractVideoData sends transcribe');
  assert(calls[calls.length - 1].data.include_usage === true, 'extractVideoData sends include_usage in body');

  const schemaPath = path.join(__dirname, 'tmp-extraction-schema.json');
  fs.writeFileSync(schemaPath, JSON.stringify({ topic: { type: 'String', description: 'Topic' } }));
  try {
    const multipartExtraction = await client.extractVideoData({
      video_url: 'https://example.com/video',
      schemaFilePath: schemaPath,
      include_usage: true,
    });
    assert(multipartExtraction.video_info instanceof sdk.VideoInfo, 'extractVideoData multipart parses video_info');
    assert(typeof calls[calls.length - 1].data.getHeaders === 'function', 'extractVideoData multipart sends FormData');
    assert(
      calls[calls.length - 1].extraHeaders['content-type'].startsWith('multipart/form-data'),
      'extractVideoData multipart content type'
    );
  } finally {
    fs.unlinkSync(schemaPath);
  }

  const fileExtraction = await client.extractFileData({
    file_id: 'file-1',
    schema: { summary: { type: 'String', description: 'Summary' } },
  });
  assert(fileExtraction.file_info instanceof sdk.FileInfo, 'extractFileData parses file_info');

  // searchYouTube hits /youtube/search, forwards focus/max_results/include_usage, parses usage.
  const yts = await client.searchYouTube({
    query: 'react hooks',
    focus: 'popularity',
    max_results: 2,
    include_usage: true,
  });
  assert(calls[calls.length - 1].url === '/youtube/search', 'searchYouTube uses /youtube/search');
  assert(calls[calls.length - 1].data.max_results === 2, 'searchYouTube sends max_results');
  assert(calls[calls.length - 1].data.focus === 'popularity', 'searchYouTube sends focus');
  assert(calls[calls.length - 1].data.include_usage === true, 'searchYouTube sends include_usage in body');
  assert(yts.results[0] instanceof sdk.VideoSearchResult, 'searchYouTube parses results');
  assert(yts.usage instanceof sdk.UsageBlock, 'searchYouTube parses usage as UsageBlock');
  assert(yts.usage.analysis_tokens.total_tokens === 1000, 'searchYouTube usage.analysis_tokens');

  // searchVideos is a deprecated alias forwarding to /youtube/search with a warning.
  {
    const originalWarn = console.warn;
    let warned = '';
    console.warn = (msg) => { warned += msg; };
    try {
      const legacy = await client.searchVideos({ query: 'legacy path' });
      assert(legacy.results[0] instanceof sdk.VideoSearchResult, 'searchVideos (alias) parses results');
    } finally {
      console.warn = originalWarn;
    }
    assert(calls[calls.length - 1].url === '/youtube/search', 'searchVideos alias forwards to /youtube/search');
    assert(/deprecated/i.test(warned) && /searchYouTube/.test(warned), 'searchVideos emits deprecation warning');
  }
}

runClientMethodTests()
  .then(() => process.exit(summary()))
  .catch((e) => {
    fail('client method tests', e.message);
    process.exit(summary());
  });
