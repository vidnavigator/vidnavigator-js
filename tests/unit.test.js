/**
 * Unit tests — no network calls, pure model / error / export verification.
 * Run: node tests/unit.test.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { sdk, assert, fail, summary } = require('./helpers');

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
  assert(task.error === null, 'TikTokSearchTask.error defaults to null');
  assert(task.webhook === undefined, 'TikTokSearchTask.webhook undefined when absent');
}

// --- TikTok webhook / sort / error fields ---
{
  const profileSub = sdk.TikTokProfileScrapeSubmission.fromJSON({
    task_id: 't1', task_status: 'processing', profile_url: 'https://www.tiktok.com/@a',
    webhook_url: 'https://example.com/hook',
  });
  assert(profileSub.webhook_url === 'https://example.com/hook', 'TikTokProfileScrapeSubmission.webhook_url');
  const profileSubNull = sdk.TikTokProfileScrapeSubmission.fromJSON({
    task_id: 't1', task_status: 'processing', profile_url: 'https://www.tiktok.com/@a', webhook_url: null,
  });
  assert(profileSubNull.webhook_url === null, 'TikTokProfileScrapeSubmission.webhook_url null');

  const searchSub = sdk.TikTokSearchSubmission.fromJSON({
    task_id: 's1', task_status: 'processing', query: 'q', webhook_url: 'https://example.com/hook',
  });
  assert(searchSub.webhook_url === 'https://example.com/hook', 'TikTokSearchSubmission.webhook_url');

  const searchTask = sdk.TikTokSearchTask.fromJSON({
    task_id: 's1',
    task_status: 'completed',
    filters: { sort_by: 'newest', published_within: 'this_week', min_likes: null },
    stats: { pages_fetched: 2, results_count: 10, sort_by: 'relevance', published_within: 'all' },
    webhook: { status: 'delivered', attempts: 1, response_status: 200, last_error: null, delivered_at: '2026-01-01T00:00:00Z' },
  });
  assert(searchTask.filters.sort_by === 'newest', 'TikTokSearchTask.filters.sort_by');
  assert(searchTask.filters.published_within === 'this_week', 'TikTokSearchTask.filters.published_within');
  assert(searchTask.stats.sort_by === 'relevance', 'TikTokSearchTask.stats.sort_by');
  assert(searchTask.stats.published_within === 'all', 'TikTokSearchTask.stats.published_within');
  assert(searchTask.webhook.status === 'delivered' && searchTask.webhook.attempts === 1, 'TikTokSearchTask.webhook');

  const failedProfile = sdk.TikTokProfileTask.fromJSON({
    task_id: 't1',
    task_status: 'failed',
    error_message: 'Profile is private',
    error: { error: 'profile_private', message: 'Profile is private', http_status: 400 },
    webhook: null,
  });
  assert(failedProfile.error.error === 'profile_private', 'TikTokProfileTask.error.error');
  assert(failedProfile.error.http_status === 400, 'TikTokProfileTask.error.http_status');
  assert(failedProfile.error_message === 'Profile is private', 'TikTokProfileTask.error_message (deprecated) kept');
  assert(failedProfile.webhook === null, 'TikTokProfileTask.webhook null');
  assert(failedProfile.videos.length === 0, 'TikTokProfileTask failed has empty videos');
}

// --- Async job models ---
{
  const accepted = sdk.AsyncJobAccepted.fromJSON({
    task_id: 'job-1',
    task_status: 'processing',
    job_type: 'transcribe',
    expires_at: '2026-01-01T01:00:00Z',
    check_status_url: '/v1/transcribe/job-1',
    webhook_url: null,
    message: 'Job started.',
    docs_url: 'https://docs.vidnavigator.com/guides/async-jobs',
  });
  assert(accepted instanceof sdk.AsyncJobAccepted, 'AsyncJobAccepted instance');
  assert(accepted.task_id === 'job-1' && accepted.job_type === 'transcribe', 'AsyncJobAccepted fields');
  assert(accepted.webhook_url === null, 'AsyncJobAccepted.webhook_url null');
  assert(accepted.docs_url.includes('async-jobs'), 'AsyncJobAccepted.docs_url');

  let parseCalls = 0;
  const parser = (raw) => { parseCalls++; return { parsed: raw.value }; };
  const processing = sdk.AsyncJob.fromJSON({ task_id: 'job-1', task_status: 'processing', result: null, error: null }, parser);
  assert(processing instanceof sdk.AsyncJob, 'AsyncJob instance');
  assert(processing.result === null && processing.error === null, 'AsyncJob processing has null result/error');
  assert(parseCalls === 0, 'AsyncJob does not call parser without result');

  const missing = sdk.AsyncJob.fromJSON({ task_id: 'job-1', task_status: 'processing' }, parser);
  assert(missing.result === null && missing.error === null, 'AsyncJob missing result/error normalized to null');

  const completed = sdk.AsyncJob.fromJSON({
    task_id: 'job-1',
    task_status: 'completed',
    job_type: 'extract_video',
    request: { video_url: 'https://x.com/v' },
    created_at: '2026-01-01T00:00:00Z',
    started_at: '2026-01-01T00:00:01Z',
    completed_at: '2026-01-01T00:00:05Z',
    expires_at: '2026-01-01T01:00:05Z',
    check_status_url: '/v1/extract/video/job-1',
    webhook: { status: 'pending', attempts: 0 },
    result: { value: 42 },
  }, parser);
  assert(completed.result.parsed === 42, 'AsyncJob parses result with provided parser');
  assert(completed.request.video_url === 'https://x.com/v', 'AsyncJob.request echo');
  assert(completed.webhook.status === 'pending', 'AsyncJob.webhook');
  assert(completed.completed_at === '2026-01-01T00:00:05Z', 'AsyncJob.completed_at');

  const failed = sdk.AsyncJob.fromJSON({
    task_id: 'job-1',
    task_status: 'failed',
    result: null,
    error: { error: 'video_too_long', message: 'Too long', http_status: 400 },
  }, parser);
  assert(failed.error.error === 'video_too_long' && failed.error.http_status === 400, 'AsyncJob.error populated on failure');
  assert(failed.result === null, 'AsyncJob.result null on failure');
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
    ['InsufficientCreditsError', sdk.InsufficientCreditsError],
    ['TooManyActiveJobsError', sdk.TooManyActiveJobsError],
    ['TaskTimeoutError', sdk.TaskTimeoutError],
    ['WebhookSignatureError', sdk.WebhookSignatureError],
  ];
  for (const [name, Cls] of errors) {
    const inst = new Cls('test', 400, 'code', 'msg', { d: 1 });
    assert(inst instanceof Error, `${name} extends Error`);
    assert(inst instanceof sdk.VidNavigatorError, `${name} extends VidNavigatorError`);
    assert(inst.name === name, `${name}.name is "${name}"`);
  }
  const soe = new sdk.SystemOverloadError('msg', 503, 'system_overload', 'busy', null, 30);
  assert(soe.retry_after_seconds === 30, 'SystemOverloadError.retry_after_seconds');
  assert(new sdk.InsufficientCreditsError('m') instanceof sdk.PaymentRequiredError, 'InsufficientCreditsError extends PaymentRequiredError');
  assert(new sdk.TooManyActiveJobsError('m') instanceof sdk.RateLimitExceededError, 'TooManyActiveJobsError extends RateLimitExceededError');
  const tte = new sdk.TaskTimeoutError('msg', 'task-9');
  assert(tte.task_id === 'task-9', 'TaskTimeoutError.task_id');
  assert(sdk.VideoTooLongError === undefined, 'VideoTooLongError is not exported (sync endpoints are never called)');
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
  const instance = new sdk.VidNavigatorClient({ apiKey: 'test-key' });
  for (const op of ['transcribe', 'extractVideo', 'tweetStatement', 'tiktokProfile', 'tiktokSearch']) {
    assert(typeof instance[op] === 'function', `client.${op} is callable (blocking)`);
    assert(typeof instance[op].submit === 'function', `client.${op}.submit exists (non-blocking)`);
    assert(typeof instance[op].resume === 'function', `client.${op}.resume exists`);
  }
  for (const removed of ['transcribeVideoAsync', 'extractVideoDataAsync', 'getTweetStatementAsync', 'waitForTask']) {
    assert(instance[removed] === undefined, `${removed} is not part of the public API`);
  }
  assert(typeof sdk.Job === 'function', 'Job is exported');
  for (const fn of ['verifyWebhookSignature', 'constructWebhookEvent']) {
    assert(typeof sdk[fn] === 'function', `${fn} is exported`);
  }
  assert(sdk.WEBHOOK_HEADERS && sdk.WEBHOOK_HEADERS.signature === 'x-vidnavigator-signature', 'WEBHOOK_HEADERS exported');
}

// --- Webhook signature verification ---
{
  const secret = 'whsec_test_secret';
  const body = JSON.stringify({
    id: 'evt_1',
    type: 'transcribe.completed',
    created_at: '2026-01-01T00:00:00Z',
    api_version: '1.0.0',
    data: { task_id: 'job-1', task_status: 'completed', job_type: 'transcribe', result: { transcript: 'hi' } },
  });
  const t = 1767225600;
  const sign = (payload, ts = t, key = secret) =>
    crypto.createHmac('sha256', key).update(`${ts}.${payload}`).digest('hex');
  const header = `t=${t},v1=${sign(body)}`;
  const opts = { now: t + 10 };

  assert(sdk.verifyWebhookSignature(body, header, secret, opts) === true, 'verifyWebhookSignature accepts valid signature');
  assert(sdk.verifyWebhookSignature(Buffer.from(body), header, secret, opts) === true, 'verifyWebhookSignature accepts Buffer payload');
  assert(sdk.verifyWebhookSignature(body, [header], secret, opts) === true, 'verifyWebhookSignature accepts header array');
  assert(
    sdk.verifyWebhookSignature(body, `t=${t}, v1=${'0'.repeat(64)}, v1=${sign(body)}`, secret, opts) === true,
    'verifyWebhookSignature accepts any matching v1 (rotation)'
  );
  assert(sdk.verifyWebhookSignature(body, header, 'wrong-secret', opts) === false, 'verifyWebhookSignature rejects wrong secret');
  assert(sdk.verifyWebhookSignature(body + ' ', header, secret, opts) === false, 'verifyWebhookSignature rejects tampered body');
  assert(sdk.verifyWebhookSignature(body, header, secret, { now: t + 301 }) === false, 'verifyWebhookSignature rejects stale timestamp');
  assert(sdk.verifyWebhookSignature(body, header, secret, { now: t - 301 }) === false, 'verifyWebhookSignature rejects future timestamp');
  assert(
    sdk.verifyWebhookSignature(body, header, secret, { now: t + 10000, toleranceSeconds: 0 }) === true,
    'verifyWebhookSignature toleranceSeconds=0 disables age check'
  );
  assert(sdk.verifyWebhookSignature(body, undefined, secret, opts) === false, 'verifyWebhookSignature rejects missing header');
  assert(sdk.verifyWebhookSignature(body, 'garbage', secret, opts) === false, 'verifyWebhookSignature rejects malformed header');
  assert(sdk.verifyWebhookSignature(body, `t=${t},v1=zz`, secret, opts) === false, 'verifyWebhookSignature rejects non-hex signature');
  assert(sdk.verifyWebhookSignature(body, `t=${t},v1=abcd`, secret, opts) === false, 'verifyWebhookSignature rejects short signature');
  assert(sdk.verifyWebhookSignature(body, header, '', opts) === false, 'verifyWebhookSignature rejects empty secret');

  const event = sdk.constructWebhookEvent(body, header, secret, opts);
  assert(event.type === 'transcribe.completed' && event.data.task_id === 'job-1', 'constructWebhookEvent parses event');
  try {
    sdk.constructWebhookEvent(body, header, 'wrong-secret', opts);
    fail('constructWebhookEvent throws on bad signature');
  } catch (e) {
    assert(e instanceof sdk.WebhookSignatureError, 'constructWebhookEvent throws WebhookSignatureError');
  }
  const notJson = 'not json';
  try {
    sdk.constructWebhookEvent(notJson, `t=${t},v1=${sign(notJson)}`, secret, opts);
    fail('constructWebhookEvent throws on invalid JSON');
  } catch (e) {
    assert(e instanceof sdk.VidNavigatorError && !(e instanceof sdk.WebhookSignatureError), 'constructWebhookEvent invalid JSON throws VidNavigatorError');
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
    if (url === '/tweet/statement' || url === '/extract/video' || url === '/transcribe') {
      throw new Error(`SDK must never call the synchronous endpoint ${url}`);
    }
    if (method === 'POST' && url === '/tweet/statement/async') {
      return { status: 'success', data: { task_id: 'tw-legacy', task_status: 'processing', job_type: 'tweet_statement' } };
    }
    if (method === 'GET' && url === '/tweet/statement/tw-legacy') {
      return {
        status: 'success',
        data: {
          task_id: 'tw-legacy',
          task_status: 'completed',
          result: { final_statement: 'A claim', statement_query: 'claim', claim_type: 'factual_claim' },
        },
      };
    }
    if (method === 'POST' && url === '/extract/video/async') {
      return { status: 'success', data: { task_id: 'ex-legacy', task_status: 'processing', job_type: 'extract_video' } };
    }
    if (method === 'GET' && url === '/extract/video/ex-legacy') {
      return {
        status: 'success',
        data: { task_id: 'ex-legacy', task_status: 'completed', result: { topic: 'testing' } },
        usage: params && params.include_usage === 'true'
          ? {
              charges: [
                {
                  service_type: 'analysis_request',
                  quantity: 1,
                  credits: 1,
                  tokens: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
                },
              ],
              total_credits: 1,
            }
          : undefined,
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
  assert(calls[calls.length - 2].url === '/tweet/statement/async', 'getTweetStatement submits to /tweet/statement/async');
  assert(calls[calls.length - 1].url === '/tweet/statement/tw-legacy', 'getTweetStatement polls /tweet/statement/{task_id}');

  const callsBefore = calls.length;
  const videoExtraction = await client.extractVideoData({
    video_url: 'https://example.com/video',
    schema: { topic: { type: 'String', description: 'Topic' } },
    transcribe: false,
    include_usage: true,
  });
  const submitCall = calls[callsBefore];
  assert(submitCall.url === '/extract/video/async', 'extractVideoData submits to /extract/video/async');
  assert(videoExtraction.data.topic === 'testing', 'extractVideoData returns data from the async result');
  assert(videoExtraction.video_info === undefined, 'extractVideoData has no video_info (async API does not return it)');
  assert(videoExtraction.usage instanceof sdk.UsageBlock, 'extractVideoData parses usage as UsageBlock');
  assert(
    videoExtraction.usage.analysis_tokens && videoExtraction.usage.analysis_tokens.total_tokens === 3,
    'extractVideoData usage.analysis_tokens from analysis_request charge'
  );
  assert(submitCall.data.transcribe === false, 'extractVideoData sends transcribe');
  assert(submitCall.data.include_usage === undefined, 'extractVideoData does not send include_usage on submit');
  assert(calls[calls.length - 1].params.include_usage === 'true', 'extractVideoData sends include_usage on the poll');

  const schemaPath = path.join(__dirname, 'tmp-extraction-schema.json');
  fs.writeFileSync(schemaPath, JSON.stringify({ topic: { type: 'String', description: 'Topic' } }));
  try {
    const before = calls.length;
    const multipartExtraction = await client.extractVideoData({
      video_url: 'https://example.com/video',
      schemaFilePath: schemaPath,
      include_usage: true,
    });
    const multipartSubmit = calls[before];
    assert(multipartExtraction.data.topic === 'testing', 'extractVideoData multipart returns data');
    assert(multipartSubmit.url === '/extract/video/async', 'extractVideoData multipart submits to /extract/video/async');
    assert(typeof multipartSubmit.data.getHeaders === 'function', 'extractVideoData multipart sends FormData');
    assert(
      multipartSubmit.extraHeaders['content-type'].startsWith('multipart/form-data'),
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

function formFieldNames(form) {
  // form-data keeps each part header as a string in _streams; pull out the field names.
  return form._streams
    .filter((part) => typeof part === 'string')
    .map((part) => (part.match(/name="([^"]+)"/) || [])[1])
    .filter(Boolean);
}

/**
 * In-memory fake of the async job API. Each submitted task walks through `states`
 * (one entry per poll; the last one repeats). Records every request.
 */
function makeFakeApi(client) {
  const calls = [];
  const plans = {}; // task_id -> array of task snapshots (without task_id)
  let nextPlan = null;
  let seq = 0;
  const usageBlock = { charges: [{ service_type: 'transcription_hour', quantity: 0.5, credits: 5 }], total_credits: 5 };
  const pollCounts = {};

  const syncRoutes = ['/transcribe', '/extract/video', '/tweet/statement'];
  const submitRoutes = {
    '/transcribe/async': 'transcribe',
    '/extract/video/async': 'extract_video',
    '/tweet/statement/async': 'tweet_statement',
    '/tiktok/profile': 'tiktok_profile',
    '/tiktok/search': 'tiktok_search',
  };

  client.request = async (method, url, data, params, extraHeaders) => {
    calls.push({ method, url, data, params, extraHeaders });
    if (syncRoutes.includes(url)) throw new Error(`SDK must never call the synchronous endpoint ${url}`);

    if (method === 'POST' && submitRoutes[url]) {
      const job_type = submitRoutes[url];
      const task_id = `${job_type}-${++seq}`;
      plans[task_id] = nextPlan || [{ task_status: 'completed' }];
      nextPlan = null;
      const webhook_url = data && typeof data.webhook_url === 'string' && data.webhook_url ? data.webhook_url : null;
      const base = { task_id, task_status: 'processing', check_status_url: `/v1${url.replace('/async', '')}/${task_id}`, webhook_url };
      if (job_type === 'tiktok_profile') return { status: 'success', data: { ...base, profile_url: data.profile_url } };
      if (job_type === 'tiktok_search') return { status: 'success', data: { ...base, query: data.query } };
      return { status: 'success', data: { ...base, job_type } };
    }

    if (method === 'GET') {
      const task_id = url.split('/').pop();
      const plan = plans[task_id];
      if (!plan) throw new sdk.NotFoundError('Task not found', 404, 'task_not_found', 'Task not found');
      const n = (pollCounts[task_id] = (pollCounts[task_id] || 0) + 1);
      const snapshot = { task_id, ...plan[Math.min(n - 1, plan.length - 1)] };
      const withUsage = params && params.include_usage === 'true' && snapshot.task_status === 'completed';

      // TikTok pollers: paginate `videos` / `results` by cursor.
      if (snapshot.pages) {
        const pageIndex = params && params.cursor ? Number(params.cursor) : 0;
        const key = url.startsWith('/tiktok/profile') ? 'videos' : 'results';
        const page = snapshot.task_status === 'completed' ? snapshot.pages[pageIndex] : [];
        const items = params && params.limit === 1 ? page.slice(0, 1) : page;
        const hasNext = snapshot.task_status === 'completed' && pageIndex + 1 < snapshot.pages.length;
        const { pages, ...rest } = snapshot;
        return {
          status: 'success',
          data: {
            ...rest,
            [key]: items,
            pagination: { limit: params && params.limit, total_items: pages.flat().length, has_next: hasNext, next_cursor: hasNext ? String(pageIndex + 1) : null },
          },
          usage: withUsage ? usageBlock : undefined,
        };
      }
      return { status: 'success', data: snapshot, usage: withUsage ? usageBlock : undefined };
    }
    throw new Error(`Unexpected request: ${method} ${url}`);
  };

  return {
    calls,
    last: () => calls[calls.length - 1],
    plan: (states) => { nextPlan = states; },
    addTask: (task_id, states) => { plans[task_id] = states; },
    pollsOf: (task_id) => pollCounts[task_id] || 0,
  };
}

/** Replace timers + clock so poll delays are recorded and "elapse" instantly. */
async function withFakeClock(fn) {
  const realSetTimeout = global.setTimeout;
  const realNow = Date.now;
  let now = 1_000_000;
  const delays = [];
  global.setTimeout = (cb, ms, ...args) => { delays.push(ms); now += ms; return realSetTimeout(cb, 0, ...args); };
  Date.now = () => now;
  try {
    return await fn(delays);
  } finally {
    global.setTimeout = realSetTimeout;
    Date.now = realNow;
  }
}

const FAST = { intervalMs: 1, fastStart: false };

async function runOperationTests() {
  const client = new sdk.VidNavigatorClient({ apiKey: 'test-key' });
  const api = makeFakeApi(client);
  const videoResult = {
    video_info: { title: 'Reel', url: 'https://www.instagram.com/reel/x/', duration: 1500 },
    transcript: [{ text: 'hello', start: 0, end: 1 }],
  };

  // ── transcribe: blocking one-liner ──
  api.plan([{ task_status: 'processing' }, { task_status: 'processing' }, { task_status: 'completed', result: videoResult }]);
  const tr = await client.transcribe('https://www.instagram.com/reel/x/', { ...FAST, include_usage: true });
  const trSubmit = api.calls.find((c) => c.url === '/transcribe/async');
  assert(trSubmit && trSubmit.method === 'POST', 'transcribe submits POST /transcribe/async');
  assert(trSubmit.data.video_url === 'https://www.instagram.com/reel/x/', 'transcribe(url) sends video_url');
  assert(trSubmit.data.include_usage === undefined, 'transcribe does not send include_usage on submit');
  assert(api.last().url === '/transcribe/transcribe-1', 'transcribe polls /transcribe/{task_id}');
  assert(api.last().params.include_usage === 'true', 'transcribe sends include_usage on the poll');
  assert(api.pollsOf('transcribe-1') === 3, 'transcribe polls until completed');
  assert(tr.video_info instanceof sdk.VideoInfo, 'transcribe result.video_info is VideoInfo');
  assert(tr.transcript[0] instanceof sdk.TranscriptSegment, 'transcribe result.transcript parsed');
  assert(tr.usage instanceof sdk.UsageBlock && tr.usage.total_credits === 5, 'transcribe result.usage');

  // Object input + webhook pass-through; polling still works.
  api.plan([{ task_status: 'completed', result: { carousel_info: { total_items: 2, video_count: 2 }, videos: [{ index: 1, status: 'success', transcript: 'one' }] } }]);
  const carousel = await client.transcribe(
    { video_url: 'https://www.instagram.com/p/abc/', all_videos: true, transcript_text: true, webhook_url: 'https://example.com/hook' },
    FAST
  );
  const carouselSubmit = api.calls.filter((c) => c.url === '/transcribe/async').pop();
  assert(carouselSubmit.data.webhook_url === 'https://example.com/hook', 'transcribe passes webhook_url through');
  assert(carouselSubmit.data.all_videos === true && carouselSubmit.data.transcript_text === true, 'transcribe passes options through');
  assert(carousel.carousel_info instanceof sdk.CarouselInfo, 'transcribe carousel result parsed (polling works with a webhook set)');
  assert(carousel.videos[0] instanceof sdk.CarouselVideoResult, 'transcribe carousel videos parsed');
  assert(carousel.usage === undefined, 'transcribe result has no usage unless requested');

  // ── transcribe.submit: non-blocking handle ──
  api.plan([{ task_status: 'processing' }, { task_status: 'completed', result: videoResult }]);
  const beforeSubmit = api.calls.length;
  const job = await client.transcribe.submit({ video_url: 'https://x.com/v', webhook_url: 'https://example.com/hook' });
  assert(api.calls.length === beforeSubmit + 1, 'submit makes exactly one request');
  assert(job instanceof sdk.Job, 'submit returns a Job');
  assert(job.task_id === 'transcribe-3' && job.job_type === 'transcribe', 'Job.task_id / job_type');
  assert(job.webhook_url === 'https://example.com/hook', 'Job.webhook_url echoes the submit response');
  assert(job.check_status_url === '/v1/transcribe/transcribe-3', 'Job.check_status_url');
  assert((await job.status()) === 'processing', 'Job.status() polls once and returns task_status');
  assert(job.task.task_status === 'processing', 'Job.task holds the latest snapshot');
  const jobResult = await job.result(FAST);
  assert(jobResult.video_info instanceof sdk.VideoInfo, 'Job.result() resolves to the parsed result');
  assert((await job.status()) === 'completed', 'Job.status() after completion');
  const again = await job.result(FAST);
  assert(again.video_info.title === 'Reel', 'Job.result() can be read again (results are not consumed)');

  // ── many at once ──
  const urls = ['https://x.com/1', 'https://x.com/2', 'https://x.com/3'];
  const jobs = [];
  for (const u of urls) {
    api.plan([{ task_status: 'processing' }, { task_status: 'completed', result: { video_info: { title: u }, transcript: 't' } }]);
    jobs.push(await client.transcribe.submit(u));
  }
  const all = await Promise.all(jobs.map((j) => j.result(FAST)));
  assert(all.map((r) => r.video_info.title).join(',') === urls.join(','), 'several jobs run concurrently via submit() + result()');

  // ── resume by task_id ──
  api.addTask('saved-task', [{ task_status: 'completed', result: videoResult }]);
  const beforeResume = api.calls.length;
  const resumed = client.transcribe.resume('saved-task', { include_usage: true });
  assert(api.calls.length === beforeResume, 'resume() makes no request');
  assert(resumed instanceof sdk.Job && resumed.task_id === 'saved-task', 'resume() returns a Job for the task_id');
  const resumedResult = await resumed.result(FAST);
  assert(resumedResult.video_info instanceof sdk.VideoInfo && resumedResult.usage instanceof sdk.UsageBlock, 'resumed Job.result() with usage');

  // ── wait loop keeps going on any non-terminal status ──
  api.plan([{ task_status: 'queued' }, { task_status: 'starting' }, { task_status: 'completed', result: videoResult }]);
  await client.transcribe('https://x.com/q', FAST);
  assert(api.pollsOf(`transcribe-${urls.length + 4}`) === 3, 'wait loop polls through unknown non-terminal statuses');

  // ── legacy transcribeVideo is async-backed ──
  api.plan([{ task_status: 'completed', result: videoResult }]);
  const legacy = await client.transcribeVideo({ video_url: 'https://x.com/v', include_usage: true }, FAST);
  const legacySubmit = api.calls.filter((c) => c.url === '/transcribe/async').pop();
  assert(legacySubmit.data.video_url === 'https://x.com/v' && legacySubmit.data.include_usage === undefined, 'transcribeVideo submits to /transcribe/async');
  assert(legacy.usage instanceof sdk.UsageBlock, 'transcribeVideo include_usage is read from the poll');

  // ── extractVideo (JSON) ──
  api.plan([{ task_status: 'processing' }, { task_status: 'completed', result: { topic: 'Never Gonna Give You Up' } }]);
  const ex = await client.extractVideo(
    { video_url: 'https://youtu.be/x', schema: { topic: { type: 'String', description: 'Topic' } }, transcribe: false, webhook_url: '' },
    { ...FAST, include_usage: true }
  );
  const exSubmit = api.calls.filter((c) => c.url === '/extract/video/async').pop();
  assert(exSubmit.data.schema.topic.type === 'String', 'extractVideo sends schema');
  assert(exSubmit.data.transcribe === false, 'extractVideo sends transcribe');
  assert(exSubmit.data.webhook_url === '', 'extractVideo passes empty webhook_url (opt-out) through');
  assert(ex.data.topic === 'Never Gonna Give You Up', 'extractVideo result.data is the extracted object');
  assert(ex.usage instanceof sdk.UsageBlock, 'extractVideo result.usage');

  // ── extractVideo (multipart schema file) ──
  const schemaPath = path.join(__dirname, 'tmp-async-extraction-schema.yaml');
  fs.writeFileSync(schemaPath, 'topic:\n  type: String\n  description: Topic\n');
  try {
    api.plan([{ task_status: 'completed', result: { topic: 'x' } }]);
    const exJob = await client.extractVideo.submit({
      video_url: 'https://youtu.be/x',
      schemaFilePath: schemaPath,
      transcribe: false,
      webhook_url: 'https://example.com/hook',
    });
    const form = api.last().data;
    assert(api.last().url === '/extract/video/async', 'extractVideo multipart submits to /extract/video/async');
    assert(typeof form.getHeaders === 'function', 'extractVideo multipart sends FormData');
    assert(api.last().extraHeaders['content-type'].startsWith('multipart/form-data'), 'extractVideo multipart content type');
    const names = formFieldNames(form);
    for (const field of ['video_url', 'schema', 'transcribe', 'webhook_url']) {
      assert(names.includes(field), `extractVideo multipart has ${field} field`);
    }
    assert(!names.includes('what_to_extract'), 'extractVideo multipart omits undefined fields');
    assert((await exJob.result(FAST)).data.topic === 'x', 'extractVideo multipart job result');
  } finally {
    fs.unlinkSync(schemaPath);
  }

  // ── tweetStatement ──
  api.plan([{ task_status: 'processing' }, { task_status: 'completed', result: { final_statement: 'A claim', claim_type: 'opinion' } }]);
  const tw = await client.tweetStatement('1234567890', { ...FAST, include_usage: true });
  const twSubmit = api.calls.filter((c) => c.url === '/tweet/statement/async').pop();
  assert(twSubmit.data.tweet_id === '1234567890', 'tweetStatement(id) sends tweet_id');
  assert(tw instanceof sdk.TweetStatement && tw.claim_type === 'opinion', 'tweetStatement result is TweetStatement');
  assert(tw.usage instanceof sdk.UsageBlock, 'tweetStatement result.usage');

  api.plan([{ task_status: 'completed', result: { final_statement: 'Legacy' } }]);
  const legacyTweet = await client.getTweetStatement({ tweet_id: '1', webhook_url: 'https://example.com/hook' }, FAST);
  assert(legacyTweet.final_statement === 'Legacy', 'getTweetStatement is async-backed');
  assert(api.calls.filter((c) => c.url === '/tweet/statement/async').pop().data.webhook_url === 'https://example.com/hook', 'getTweetStatement passes webhook_url through');

  // ── tiktokProfile: collects every page ──
  const video = (id) => ({ id, url: `https://www.tiktok.com/@a/video/${id}`, published_at: '2026-01-01T00:00:00Z', views: 10.7 });
  const profilePages = [[video('1'), video('2')], [video('3')], [video('4'), video('5')]];
  api.plan([{ task_status: 'processing', pages: profilePages }, { task_status: 'completed', pages: profilePages, stats: { videos_matched: 5 } }]);
  const profile = await client.tiktokProfile('https://www.tiktok.com/@a', { ...FAST, include_usage: true });
  const profileSubmit = api.calls.filter((c) => c.url === '/tiktok/profile').pop();
  assert(profileSubmit.data.profile_url === 'https://www.tiktok.com/@a', 'tiktokProfile(url) sends profile_url');
  const statusPolls = api.calls.filter((c) => c.method === 'GET' && c.url.startsWith('/tiktok/profile/') && c.params.limit === 1);
  assert(statusPolls.length === 2, 'tiktokProfile status polls request a single item');
  assert(profile instanceof sdk.TikTokProfileTask, 'tiktokProfile result is TikTokProfileTask');
  assert(profile.videos.length === 5 && profile.videos.map((v) => v.id).join('') === '12345', 'tiktokProfile collects videos from every page');
  assert(profile.videos[0] instanceof sdk.TikTokVideo && profile.videos[0].views === 10, 'tiktokProfile videos parsed');
  assert(profile.pagination.has_next === false && profile.pagination.next_cursor === null, 'tiktokProfile pagination reflects the merged result');
  assert(profile.usage instanceof sdk.UsageBlock, 'tiktokProfile result.usage');
  const pageCalls = api.calls.filter((c) => c.method === 'GET' && c.url.startsWith('/tiktok/profile/') && c.params.limit === 500);
  assert(pageCalls.length === 3, 'tiktokProfile fetches each page once');
  assert(pageCalls[0].params.include_usage === 'true' && pageCalls[1].params.include_usage === undefined, 'tiktokProfile asks for usage on the first page only');

  api.plan([{ task_status: 'completed', pages: [[video('9')]] }]);
  const profileJob = await client.tiktokProfile.submit({ profile_url: 'https://www.tiktok.com/@b', max_posts: 1, webhook_url: 'https://example.com/hook' });
  assert(profileJob.job_type === 'tiktok_profile' && profileJob.webhook_url === 'https://example.com/hook', 'tiktokProfile.submit returns a Job with webhook_url');
  assert((await profileJob.status()) === 'completed', 'tiktokProfile Job.status()');
  assert((await profileJob.result(FAST)).videos[0].id === '9', 'tiktokProfile Job.result()');

  // ── tiktokSearch ──
  const result = (id) => ({ id, url: `https://www.tiktok.com/@c/video/${id}` });
  api.plan([{ task_status: 'completed', pages: [[result('a')], [result('b')]] }]);
  const search = await client.tiktokSearch(
    { query: 'ai tools', sort_by: 'newest', published_within: 'this_week', webhook_url: 'https://example.com/hook' },
    FAST
  );
  const searchSubmit = api.calls.filter((c) => c.url === '/tiktok/search').pop();
  assert(searchSubmit.data.sort_by === 'newest' && searchSubmit.data.published_within === 'this_week', 'tiktokSearch passes options through');
  assert(searchSubmit.data.webhook_url === 'https://example.com/hook', 'tiktokSearch passes webhook_url through');
  assert(search instanceof sdk.TikTokSearchTask && search.results.map((r) => r.id).join('') === 'ab', 'tiktokSearch collects results from every page');

  api.plan([{ task_status: 'completed', pages: [[result('z')]] }]);
  const bareSearch = await client.tiktokSearch('cats', FAST);
  assert(api.calls.filter((c) => c.url === '/tiktok/search').pop().data.query === 'cats', 'tiktokSearch(query) sends query');
  assert(bareSearch.results[0] instanceof sdk.TikTokSearchResult, 'tiktokSearch results parsed');
}

async function runPollingTests() {
  const client = new sdk.VidNavigatorClient({ apiKey: 'test-key' });
  const api = makeFakeApi(client);
  const processing = Array.from({ length: 14 }, () => ({ task_status: 'processing' }));
  const done = { task_status: 'completed', result: { video_info: { title: 'x' }, transcript: 't' } };

  // Default cadence: 1s during the first 10s, then 3s.
  await withFakeClock(async (delays) => {
    api.plan([...processing, done]);
    await client.transcribe('https://x.com/cadence');
    assert(delays.length === 14, 'default cadence sleeps once between polls', delays.join(','));
    assert(delays.slice(0, 10).every((d) => d === 1000), 'polls every 1s during the first 10s', delays.join(','));
    assert(delays.slice(10).every((d) => d === 3000), 'polls every 3s after the first 10s', delays.join(','));
  });

  // fastStart: false → 3s from the start.
  await withFakeClock(async (delays) => {
    api.plan([...processing.slice(0, 3), done]);
    await client.transcribe('https://x.com/slow', { fastStart: false });
    assert(delays.length === 3 && delays.every((d) => d === 3000), 'fastStart:false polls every 3s', delays.join(','));
  });

  // Custom interval.
  await withFakeClock(async (delays) => {
    api.plan([...processing.slice(0, 2), done]);
    await client.transcribe('https://x.com/custom', { intervalMs: 7000, fastStart: false });
    assert(delays.every((d) => d === 7000), 'intervalMs is honoured', delays.join(','));
  });

  // Timeout: error carries task_id, and the job can be resumed with it.
  let timeoutErr;
  await withFakeClock(async () => {
    api.plan([...processing, ...processing, done]);
    timeoutErr = await client.transcribe('https://x.com/long', { timeoutMs: 20000 }).catch((e) => e);
  });
  assert(timeoutErr instanceof sdk.TaskTimeoutError, 'blocking call throws TaskTimeoutError on timeout', timeoutErr && timeoutErr.name);
  assert(typeof timeoutErr.task_id === 'string' && timeoutErr.task_id.startsWith('transcribe-'), 'TaskTimeoutError carries task_id');
  assert(timeoutErr.message.includes(timeoutErr.task_id), 'TaskTimeoutError message includes task_id');
  const recovered = await client.transcribe.resume(timeoutErr.task_id).result(FAST);
  assert(recovered.video_info.title === 'x', 'job resumed from TaskTimeoutError.task_id completes');

  // Default timeout is 30 minutes.
  let defaultTimeout;
  await withFakeClock(async (delays) => {
    api.plan([{ task_status: 'processing' }]);
    defaultTimeout = await client.transcribe('https://x.com/forever').catch((e) => e);
    const waited = delays.reduce((a, b) => a + b, 0);
    assert(waited <= 30 * 60 * 1000 && waited > 29 * 60 * 1000, 'default timeout is 30 minutes', String(waited));
  });
  assert(defaultTimeout instanceof sdk.TaskTimeoutError, 'default timeout throws TaskTimeoutError');

  // timeoutMs: 0 waits forever (bounded here by the plan finishing).
  await withFakeClock(async () => {
    api.plan([...Array.from({ length: 700 }, () => ({ task_status: 'processing' })), done]);
    const r = await client.transcribe('https://x.com/forever2', { timeoutMs: 0, fastStart: false });
    assert(r.video_info.title === 'x', 'timeoutMs:0 waits past 30 minutes');
  });

  // Abort: error carries task_id.
  {
    api.plan([{ task_status: 'processing' }]);
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 15);
    const e = await client.transcribe('https://x.com/abort', { signal: controller.signal }).catch((err) => err);
    assert(e instanceof sdk.VidNavigatorError && /aborted/.test(e.message), 'abort stops waiting');
    assert(typeof e.task_id === 'string' && e.task_id.startsWith('transcribe-'), 'abort error carries task_id');
  }

  // onPoll sees every snapshot.
  {
    api.plan([{ task_status: 'processing' }, done]);
    const seen = [];
    await client.transcribe('https://x.com/onpoll', { ...FAST, onPoll: (t) => seen.push(t.task_status) });
    assert(seen.join(',') === 'processing,completed', 'onPoll receives every snapshot');
  }

  // Failures: read the `error` object; typed by http_status; carry task_id.
  const failures = [
    [{ error: 'invalid_parameter', message: 'Bad URL', http_status: 400 }, sdk.BadRequestError],
    [{ error: 'limit_exceeded', message: 'Out of credits mid-job', http_status: 402 }, sdk.InsufficientCreditsError],
    [{ error: 'video_not_found', message: 'Gone', http_status: 404 }, sdk.NotFoundError],
    [{ error: 'geo_restricted', message: 'Blocked', http_status: 451 }, sdk.GeoRestrictedError],
    [{ error: 'internal_error', message: 'Boom', http_status: 500 }, sdk.ServerError],
    [{ error: 'upstream_failed', message: 'X API down', http_status: 502 }, sdk.ServerError],
  ];
  for (const [error, Cls] of failures) {
    api.plan([{ task_status: 'processing' }, { task_status: 'failed', result: null, error }]);
    const e = await client.transcribe('https://x.com/fail', FAST).catch((err) => err);
    assert(e instanceof Cls, `failed job (${error.http_status} ${error.error}) throws ${Cls.name}`, e && `${e.name}: ${e.message}`);
    assert(e.error_code === error.error && e.status_code === error.http_status && e.error_message === error.message, `failed job ${error.error} carries error / http_status / message`);
    assert(typeof e.task_id === 'string' && e.task_id.startsWith('transcribe-'), `failed job ${error.error} error carries task_id`);
  }

  // Deprecated error_message is never read.
  {
    api.plan([{ task_status: 'failed', error: null, error_message: 'LEGACY TEXT' }]);
    const e = await client.transcribe('https://x.com/legacy-fail', FAST).catch((err) => err);
    assert(e instanceof sdk.VidNavigatorError && e.constructor === sdk.VidNavigatorError, 'failure without error object throws VidNavigatorError');
    assert(!e.message.includes('LEGACY TEXT'), 'failure handling ignores deprecated error_message');
    assert(e.task_id, 'failure without error object still carries task_id');

    // TikTok tasks still expose the deprecated field; it must not drive the error either.
    api.plan([{ task_status: 'failed', pages: [[]], error: null, error_message: 'LEGACY TIKTOK TEXT' }]);
    const t = await client.tiktokSearch('legacy', FAST).catch((err) => err);
    assert(t instanceof sdk.VidNavigatorError && !t.message.includes('LEGACY TIKTOK TEXT'), 'TikTok failure ignores deprecated error_message');
    assert(t.error_message === undefined, 'TikTok failure error_message not taken from deprecated field');
  }

  // wait() returns the failed snapshot without throwing.
  {
    api.plan([{ task_status: 'failed', error: { error: 'video_not_found', message: 'Gone', http_status: 404 } }]);
    const j = await client.transcribe.submit('https://x.com/w');
    const final = await j.wait(FAST);
    assert(final.task_status === 'failed' && final.error.http_status === 404, 'Job.wait() returns the failed task');
  }

  // A poll error (e.g. expired task) carries task_id.
  {
    const e = await client.transcribe.resume('expired-task').result(FAST).catch((err) => err);
    assert(e instanceof sdk.NotFoundError, 'polling an unknown task throws NotFoundError');
    assert(e.task_id === 'expired-task', 'poll errors carry task_id');
  }

  // TikTok failures use the error object too.
  {
    api.plan([{ task_status: 'failed', pages: [[]], error_message: 'private', error: { error: 'profile_private', message: 'Profile is private', http_status: 400 } }]);
    const e = await client.tiktokProfile('https://www.tiktok.com/@private', FAST).catch((err) => err);
    assert(e instanceof sdk.BadRequestError && e.error_code === 'profile_private', 'tiktokProfile failure throws typed error from error object');
    assert(e.task_id && e.task_id.startsWith('tiktok_profile-'), 'tiktokProfile failure carries task_id');
  }
}

async function runErrorMappingTests() {
  // Exercise the real request() error path by stubbing the underlying axios instance.
  const client = new sdk.VidNavigatorClient({ apiKey: 'test-key' });
  const axiosError = (status, data) => ({ isAxiosError: true, message: `Request failed with status code ${status}`, response: { status, data } });
  let nextError;
  client.client.request = async () => { throw nextError; };
  client.client.post = async () => { throw nextError; };

  const limit402 = { status: 'error', error: 'limit_exceeded', error_code: 'limit_exceeded', message: 'Less than 60 seconds of transcription credit left' };
  const jobs429 = { status: 'error', error: 'too_many_active_jobs', message: 'Too many jobs already running' };
  const cases = [
    ['transcribe submit 402', () => client.transcribe('https://x.com/v'), 402, limit402, sdk.InsufficientCreditsError],
    ['extractVideo submit 402', () => client.extractVideo({ video_url: 'https://x.com/v', schema: {} }), 402, limit402, sdk.InsufficientCreditsError],
    ['tweetStatement submit 402', () => client.tweetStatement('1'), 402, limit402, sdk.InsufficientCreditsError],
    ['tiktokProfile submit 402', () => client.tiktokProfile('https://www.tiktok.com/@a'), 402, limit402, sdk.InsufficientCreditsError],
    ['transcribe submit 429', () => client.transcribe('https://x.com/v'), 429, jobs429, sdk.TooManyActiveJobsError],
    ['extractVideo.submit 429', () => client.extractVideo.submit({ video_url: 'https://x.com/v', schema: {} }), 429, jobs429, sdk.TooManyActiveJobsError],
    ['tweetStatement.submit 429', () => client.tweetStatement.submit('1'), 429, jobs429, sdk.TooManyActiveJobsError],
    ['getTranscript 429 (plain rate limit)', () => client.getTranscript({ video_url: 'x' }), 429, { status: 'error', error: 'rate_limit_exceeded', message: 'Slow down' }, sdk.RateLimitExceededError],
    ['transcribe submit 400', () => client.transcribe('bad'), 400, { status: 'error', error: 'invalid_parameter', message: 'Bad URL' }, sdk.BadRequestError],
    ['extractVideo submit 400 (invalid schema)', () => client.extractVideo({ video_url: 'https://x.com/v', schema: {} }), 400, { status: 'error', error: 'invalid_schema', message: 'Bad schema' }, sdk.BadRequestError],
    ['transcribe submit 401', () => client.transcribe('https://x.com/v'), 401, { status: 'error', error: 'invalid_api_key', message: 'Bad key' }, sdk.AuthenticationError],
    ['transcribe submit 403', () => client.transcribe('https://x.com/v'), 403, { status: 'error', error: 'access_denied', message: 'No permission' }, sdk.AccessDeniedError],
    ['tiktokSearch submit 503', () => client.tiktokSearch('ai'), 503, { status: 'error', error: 'system_overload', message: 'Busy', retry_after_seconds: 12 }, sdk.SystemOverloadError],
    ['uploadFile 404', () => client.uploadFile({ filePath: __filename }), 404, { status: 'error', error: 'not_found', message: 'Nope' }, sdk.NotFoundError],
    ['uploadFile 429', () => client.uploadFile({ filePath: __filename }), 429, { status: 'error', error: 'rate_limited', message: 'Slow down' }, sdk.RateLimitExceededError],
  ];
  for (const [label, call, status, data, Cls] of cases) {
    nextError = axiosError(status, data);
    const e = await call().then(() => null, (err) => err);
    assert(e instanceof Cls, `${label} throws ${Cls.name}`, e && `${e.name}: ${e.message}`);
    if (e) {
      assert(e.status_code === status && e.error_code === data.error, `${label} error carries status_code / error_code`);
      assert(e.message.includes(data.message), `${label} error message includes API message`);
    }
  }

  nextError = axiosError(429, { status: 'error', error: 'rate_limit_exceeded', message: 'Slow down' });
  const plain429 = await client.getTranscript({ video_url: 'x' }).catch((err) => err);
  assert(!(plain429 instanceof sdk.TooManyActiveJobsError), 'plain 429 is not TooManyActiveJobsError');

  nextError = axiosError(402, { status: 'partial', error_code: 'insufficient_credits_video_search', data: { results: [], query: 'q', total_found: 0 } });
  const partial = await client.searchYouTube({ query: 'q' });
  assert(partial.status === 'partial', 'searchYouTube 402 partial results still surface (not InsufficientCreditsError)');

  nextError = axiosError(503, { status: 'error', error: 'system_overload', message: 'Busy', retry_after_seconds: 12 });
  const overload = await client.tiktokSearch('ai').catch((err) => err);
  assert(overload.retry_after_seconds === 12, 'SystemOverloadError.retry_after_seconds from response');

  nextError = new Error('socket hang up');
  const network = await client.transcribe('https://x.com/v').catch((err) => err);
  assert(network instanceof sdk.VidNavigatorError && network.status_code === undefined, 'network errors surface as VidNavigatorError');
  assert(network.task_id === undefined, 'submit errors have no task_id (no task was created)');
}

runClientMethodTests()
  .then(runOperationTests)
  .then(runPollingTests)
  .then(runErrorMappingTests)
  .then(() => process.exit(summary()))
  .catch((e) => {
    fail('client method tests', e.stack || e.message);
    process.exit(summary());
  });
