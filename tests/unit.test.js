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
  assert(fi2.scenes_status === undefined && fi2.scenes_error === undefined, 'FileInfo without scene fields (older server)');
}

// --- FileInfo: where the scene analysis of a file stands ---
{
  const base = {
    id: 'f3', name: 'recipe.mp4', status: 'completed', type: 'video/mp4', has_transcript: true,
    created_at: '2026-11-16T12:38:21.203Z', updated_at: '2026-11-16T12:38:49.307Z',
  };
  const done = sdk.FileInfo.fromJSON({ ...base, scenes_status: 'completed', frames_analyzed: 30 });
  assert(done.scenes_status === 'completed' && done.frames_analyzed === 30, 'FileInfo.scenes_status / frames_analyzed');
  assert(done.scenes_error === undefined, 'FileInfo has no scenes_error when the scenes are there');
  assert(sdk.FileInfo.fromJSON({ ...base, scenes_status: 'none' }).scenes_status === 'none', 'FileInfo.scenes_status none');
  assert(sdk.FileInfo.fromJSON({ ...base, scenes_status: 'processing' }).frames_analyzed === undefined, 'FileInfo.frames_analyzed absent while processing');
  const audio = sdk.FileInfo.fromJSON({
    ...base, name: 'recipe.mp3', type: 'audio/mp3', scenes_status: 'failed',
    scenes_error: { error: 'frames_not_available', message: 'This file has no picture we can read (an audio file, or a video without a video track).' },
  });
  assert(audio.scenes_status === 'failed' && audio.scenes_error.error === 'frames_not_available', 'FileInfo.scenes_error says why the scenes failed');
  assert(done.toJSON().scenes_status === 'completed', 'FileInfo.toJSON keeps scenes_status');
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

// --- The analysis model is gone with the analysis endpoints (3.0.0) ---
assert(sdk.AnalysisResult === undefined, 'AnalysisResult is not exported (analysis was removed in 3.0.0)');

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
  assert(ub.credits_remaining_after === undefined, 'UsageBlock.credits_remaining_after is undefined when absent (no credit limit)');
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

// --- TikTok keyword search: country and billing stats ---
{
  const sub = sdk.TikTokSearchSubmission.fromJSON({ task_id: 's1', task_status: 'processing', query: 'football', country: 'fr' });
  assert(sub.country === 'fr', 'TikTokSearchSubmission.country');
  const task = sdk.TikTokSearchTask.fromJSON({
    task_id: 's1', task_status: 'completed', query: 'football', country: 'fr',
    stats: { pages_fetched: '2', videos_fetched: '58', results_count: 41, country: 'fr', parallel_search_slices: '2',
             items_examined: 58, items_filtered_out: '17', items_deduplicated: 3 },
  });
  assert(task.country === 'fr' && task.stats.country === 'fr', 'TikTokSearchTask.country and stats.country');
  assert(task.stats.videos_fetched === 58 && task.stats.parallel_search_slices === 2, 'TikTokSearchTask.stats.videos_fetched / parallel_search_slices integers');
  assert(task.stats.items_examined === 58 && task.stats.items_filtered_out === 17 && task.stats.items_deduplicated === 3, 'TikTokSearchTask.stats.items_* integers');
  const bare = sdk.TikTokSearchTask.fromJSON({ task_id: 's2', task_status: 'completed', stats: { pages_fetched: 1, results_count: 0 } });
  assert(!('items_examined' in bare.stats) && !('country' in bare.stats), 'TikTokSearchTask.stats leaves out fields the API did not send');
}

// --- TikTok LIVE search models ---
{
  const sub = sdk.TikTokLiveSearchSubmission.fromJSON({
    task_id: 'l1', task_status: 'processing', query: 'gaming', country: 'us', max_results: '0',
    include_stream_urls: true, check_status_url: '/v1/tiktok/live/search/l1', webhook_url: null,
  });
  assert(sub instanceof sdk.TikTokLiveSearchSubmission, 'TikTokLiveSearchSubmission instance');
  assert(sub.country === 'us' && sub.max_results === 0 && sub.include_stream_urls === true, 'TikTokLiveSearchSubmission fields');

  const room = {
    id: '7704440240265644830',
    title: 'Ranked grind #fortnite #FYP',
    url: 'https://www.tiktok.com/@creator/live',
    started_at: '2026-11-04T22:04:46Z',
    author: { id: '6628548115959152646', unique_id: 'creator', nickname: 'Creator', sec_uid: 'MS4wLjABAAAA', followers: 576168.0, avatar_url: 'https://p16.example/a.webp' },
    stats: { viewers: 1296, total_viewers: 232347, likes: 301154, comments: null, shares: 360 },
    hashtags: ['fortnite', 'FYP'],
    category: 'Gaming',
    game_tags: ['Fortnite'],
    cover_url: 'https://p19.example/cover.webp',
    stream_urls: {
      default_quality: 'hd',
      flv: { hd: 'https://pull-f5.example/stream_hd.flv?expire=1795089584' },
      hls: { hd: 'https://pull-hls.example/stream_hd/index.m3u8?expire=1795089584' },
      audio_only: 'https://pull-f5.example/stream.flv?expire=1795089584&only_audio=1',
      expires_at: '2026-11-19T11:59:44Z',
    },
  };
  const task = sdk.TikTokLiveSearchTask.fromJSON({
    task_id: 'l1', task_status: 'completed', query: 'gaming', country: 'us',
    stats: { pages_fetched: '1', rooms_fetched: '44', results_count: 44, has_more: false, country: 'us' },
    results: [room, { id: '2', title: 'No streams' }],
    pagination: { limit: 50, offset: 0, total_items: 2, has_next: false, has_prev: false },
    webhook: null,
  });
  assert(task instanceof sdk.TikTokLiveSearchTask && task.country === 'us', 'TikTokLiveSearchTask instance');
  assert(task.stats.rooms_fetched === 44 && task.stats.pages_fetched === 1 && task.stats.has_more === false, 'TikTokLiveSearchTask.stats');
  const r = task.results[0];
  assert(r instanceof sdk.TikTokLiveRoom, 'TikTokLiveSearchTask.results parsed as TikTokLiveRoom');
  assert(r.started_at instanceof Date && r.started_at.toISOString() === '2026-11-04T22:04:46.000Z', 'TikTokLiveRoom.started_at Date');
  assert(r.author.sec_uid === 'MS4wLjABAAAA' && r.author.followers === 576168, 'TikTokLiveRoom.author');
  assert(r.stats.viewers === 1296 && r.stats.comments === null, 'TikTokLiveRoom.stats');
  assert(r.hashtags.join(',') === 'fortnite,FYP' && r.category === 'Gaming' && r.game_tags[0] === 'Fortnite', 'TikTokLiveRoom hashtags / category / game_tags');
  assert(r.stream_urls.default_quality === 'hd' && r.stream_urls.flv.hd.includes('_hd.flv'), 'TikTokLiveRoom.stream_urls.flv');
  assert(r.stream_urls.hls.hd.includes('.m3u8') && r.stream_urls.audio_only.includes('only_audio=1'), 'TikTokLiveRoom.stream_urls.hls / audio_only');
  assert(r.stream_urls.expires_at instanceof Date && r.stream_urls.expires_at.toISOString() === '2026-11-19T11:59:44.000Z', 'TikTokLiveRoom.stream_urls.expires_at Date');
  const bare = task.results[1];
  assert(bare.stream_urls === undefined && bare.hashtags.length === 0 && bare.game_tags.length === 0, 'TikTokLiveRoom without stream_urls / tags');
  assert(task.webhook === null && task.error === null, 'TikTokLiveSearchTask webhook / error');
  const noHls = sdk.TikTokLiveRoom.fromJSON({ id: '3', stream_urls: { default_quality: 'hd', flv: { hd: 'https://x/a.flv' } } });
  assert(Object.keys(noHls.stream_urls.hls).length === 0 && noHls.stream_urls.audio_only === null && noHls.stream_urls.expires_at === null, 'TikTokLiveRoom stream_urls defaults');
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

  // An extraction job asked with include_scenes carries the scene fields beside its result.
  const withScenes = sdk.AsyncJob.fromJSON({
    task_id: 'job-2', task_status: 'completed', job_type: 'extract_video',
    result: { dish: 'Soup' }, video_info: { title: 'Recipe' },
    frames_analyzed: 30,
    transcript_error: { error: 'transcript_not_available', message: 'No transcript found for this video.' },
  }, (raw) => raw);
  assert(withScenes.frames_analyzed === 30, 'AsyncJob.frames_analyzed');
  assert(withScenes.transcript_error.error === 'transcript_not_available' && withScenes.scenes_error === undefined, 'AsyncJob.transcript_error / scenes_error');
  assert(failed.frames_analyzed === undefined, 'AsyncJob.frames_analyzed absent without include_scenes');
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
  assert(statement.frames_analyzed === undefined && statement.scenes_error === undefined, 'TweetStatement has no scene fields without include_scenes');

  // Asked with include_scenes: the frames read, and why a video's picture could not be read.
  const withScenes = sdk.TweetStatement.fromJSON({
    final_statement: 'The author shows a chart of rising prices.',
    claim_type: 'factual_claim',
    frames_analyzed: 23,
    scenes_error: { error: 'frames_not_available', message: 'This video has no picture we can read.' },
  });
  assert(withScenes.frames_analyzed === 23, 'TweetStatement.frames_analyzed');
  assert(withScenes.scenes_error.error === 'frames_not_available' && withScenes.scenes_error.message.includes('no picture'), 'TweetStatement.scenes_error');
}

// --- Watch models ---
{
  const scene = sdk.VideoScene.fromJSON({
    start: 4.0, end: 12.0,
    description: 'A presenter stands in front of a world map and points at Europe.',
    on_screen_text: 'BREAKING NEWS',
  });
  assert(scene instanceof sdk.VideoScene, 'VideoScene instance');
  assert(scene.start === 4 && scene.end === 12, 'VideoScene start / end');
  assert(scene.description.startsWith('A presenter') && scene.on_screen_text === 'BREAKING NEWS', 'VideoScene description / on_screen_text');
  const bare = sdk.VideoScene.fromJSON({ start: 0, end: 1 });
  assert(bare.description === '' && bare.on_screen_text === '', 'VideoScene text fields default to an empty string');

  const watched = sdk.WatchResult.fromJSON({
    video_info: { title: 'Evening news', duration: 12.5, url: 'https://example.com/v' },
    transcript: [{ text: 'Good evening.', start: 0.4, end: 1.6 }],
    scenes: [
      { start: 0, end: 4, description: 'A presenter stands in front of a world map.', on_screen_text: 'BREAKING NEWS' },
      { start: 4, end: 12.5, description: 'Aerial view of a harbour at dusk.', on_screen_text: '' },
    ],
    frames_analyzed: 9,
  });
  assert(watched instanceof sdk.WatchResult, 'WatchResult instance');
  assert(watched.video_info instanceof sdk.VideoInfo && watched.video_info.title === 'Evening news', 'WatchResult.video_info is VideoInfo');
  assert(watched.transcript[0] instanceof sdk.TranscriptSegment, 'WatchResult.transcript parsed into segments');
  assert(watched.scenes.length === 2 && watched.scenes.every((s) => s instanceof sdk.VideoScene), 'WatchResult.scenes are VideoScene');
  assert(watched.scenes[1].on_screen_text === '', 'WatchResult scene without text on screen');
  assert(watched.frames_analyzed === 9, 'WatchResult.frames_analyzed');
  assert(watched.transcript_error === undefined && watched.usage === undefined, 'WatchResult has no transcript_error / usage by default');

  const silent = sdk.WatchResult.fromJSON({
    video_info: { title: 'Silent clip' },
    transcript: [],
    transcript_error: { error: 'transcript_not_available', message: 'No transcript found for this video.' },
    scenes: [{ start: 0, end: 3, description: 'A beach.', on_screen_text: '' }],
    frames_analyzed: 4,
  });
  assert(Array.isArray(silent.transcript) && silent.transcript.length === 0, 'WatchResult without speech has an empty transcript');
  assert(silent.transcript_error.error === 'transcript_not_available', 'WatchResult.transcript_error says why');
  assert(silent.scenes.length === 1, 'WatchResult without speech keeps the scenes');

  const scenesOnly = sdk.WatchResult.fromJSON({ video_info: { title: 'T' }, scenes: [], frames_analyzed: 4 });
  assert(scenesOnly.transcript === undefined, 'WatchResult.transcript is left out with include_transcript: false');
  const asText = sdk.WatchResult.fromJSON({ video_info: { title: 'T' }, transcript: 'Good evening.', scenes: [] });
  assert(asText.transcript === 'Good evening.', 'WatchResult.transcript as one string');
  const noScenes = sdk.WatchResult.fromJSON({ video_info: { title: 'T' } });
  assert(Array.isArray(noScenes.scenes) && noScenes.scenes.length === 0, 'WatchResult.scenes defaults to an empty list');
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

// --- UsageData: every counter /usage sends, and an account without a subscription period ---
const USAGE_DATA_JSON = {
  usage_period: { start: '2026-11-01T00:00:00Z', end: '2026-12-01T00:00:00Z' },
  billing_period: { start: '2026-11-01T00:00:00Z', end: '2026-12-01T00:00:00Z', interval: 'month' },
  subscription: { plan_id: 'p1', plan_name: 'Pro', interval: 'month', status: 'active', cancel_at_period_end: false },
  credits: { monthly_total: 1000, monthly_remaining: 500, purchased: 0 },
  usage: {
    standard_request: { used: 3 },
    residential_request: { used: 7 },
    search_request: { used: 2 },
    analysis_request: { used: 1 },
    scene_analysis_hour: { used: 0.25, unit: 'hours' },
    transcription_hour: { used: 0.5, unit: 'hours' },
    frame_analysis: { used: 120, unit: 'frames' },
  },
  channels_indexed: { used: 0, limit: 10, remaining: 10, percentage: 0 },
  storage: {
    used_bytes: 0, used_formatted: '0 B',
    limit_bytes: 1073741824, limit_formatted: '1 GB',
    remaining_bytes: 1073741824, remaining_formatted: '1 GB', percentage: 0,
  },
  generated_at: '2026-11-23T12:00:00Z',
};
{
  const ud = sdk.UsageData.fromJSON(USAGE_DATA_JSON);
  assert(ud.usage.frameAnalysis instanceof sdk.ActivityCount && ud.usage.frameAnalysis.used === 120 && ud.usage.frameAnalysis.unit === 'frames', 'UsageData.usage.frameAnalysis');
  assert(ud.usage.sceneAnalysisHour instanceof sdk.ActivityCount && ud.usage.sceneAnalysisHour.used === 0.25 && ud.usage.sceneAnalysisHour.unit === 'hours', 'UsageData.usage.sceneAnalysisHour');
  assert(ud.usage.transcriptionHour.used === 0.5 && ud.usage.standardRequest.used === 3, 'UsageData.usage keeps the other counters');
  assert(ud.usagePeriod.start instanceof Date && ud.usagePeriod.start.toISOString() === '2026-11-01T00:00:00.000Z', 'UsageData.usagePeriod.start is a Date');
  assert(ud.billingPeriod.end instanceof Date && ud.billingPeriod.interval === 'month', 'UsageData.billingPeriod.end is a Date');

  const noPeriod = sdk.UsageData.fromJSON({
    ...USAGE_DATA_JSON,
    usage_period: { start: null, end: null },
    billing_period: { start: null, end: null, interval: null },
    subscription: { plan_id: 'free', plan_name: 'Explorer', interval: null, status: null, cancel_at_period_end: null },
  });
  assert(noPeriod.usagePeriod.start === undefined && noPeriod.usagePeriod.end === undefined, 'UsageData: null usage_period dates are undefined, not 1970');
  assert(noPeriod.billingPeriod.start === undefined && noPeriod.billingPeriod.end === undefined, 'UsageData: null billing_period dates are undefined, not 1970');
  assert(noPeriod.subscription.planName === 'Explorer', 'UsageData without a subscription period still parses');
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

// --- people / places / key_subjects arrive as names: read with `.name` ---
{
  const vsr = sdk.VideoSearchResult.fromJSON({
    title: 'SR', url: 'https://x.com',
    people: ['Sam Altman'], places: ['San Francisco'], key_subjects: ['AI regulation'],
  });
  assert(vsr.people[0].name === 'Sam Altman', 'VideoSearchResult.people: a name becomes { name }');
  assert(vsr.places[0].name === 'San Francisco', 'VideoSearchResult.places: a name becomes { name }');
  assert(vsr.key_subjects[0].name === 'AI regulation', 'VideoSearchResult.key_subjects: a name becomes { name }');
  const fsr = sdk.FileSearchResult.fromJSON({
    id: 'f1', name: 'call.mp3', status: 'completed',
    people: ['John Smith', { name: 'Ann', context: 'host' }], key_subjects: ['Pricing'],
  });
  assert(fsr.people[0].name === 'John Smith' && fsr.people[1].context === 'host', 'FileSearchResult.people: names and objects');
  assert(fsr.key_subjects[0].name === 'Pricing', 'FileSearchResult.key_subjects: a name becomes { name }');
  assert(fsr.places === undefined, 'FileSearchResult.places absent stays undefined');
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
    ['ScenesNotAvailableError', sdk.ScenesNotAvailableError],
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
  const sna = new sdk.ScenesNotAvailableError('msg', 409, 'scenes_not_available', 'No scenes yet', null, 'failed', { error: 'frames_not_available', message: 'No picture' });
  assert(sna.scenes_status === 'failed' && sna.scenes_error.error === 'frames_not_available', 'ScenesNotAvailableError.scenes_status / scenes_error');
  const tte = new sdk.TaskTimeoutError('msg', 'task-9');
  assert(tte.task_id === 'task-9', 'TaskTimeoutError.task_id');
  assert(sdk.VideoTooLongError === undefined, 'VideoTooLongError is not exported (sync endpoints are never called)');
}

// --- Method existence on prototype ---
{
  const methods = [
    'getTranscript', 'getYouTubeTranscript', 'transcribeVideo', 'watchVideo',
    'getFiles', 'getFile', 'uploadFile', 'deleteFile', 'getFileUrl',
    'retryFileProcessing', 'cancelFileUpload', 'analyzeFileScenes',
    'getNamespaces', 'createNamespace', 'updateNamespace', 'deleteNamespace', 'updateFileNamespaces',
    'getTweetStatement',
    'extractVideoData', 'extractFileData',
    'submitTikTokProfileScrape', 'getTikTokProfileScrape',
    'submitTikTokSearch', 'getTikTokSearch',
    'submitTikTokLiveSearch', 'getTikTokLiveSearch', 'getTikTokLiveRoom',
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
  for (const op of ['transcribe', 'watch', 'extractVideo', 'tweetStatement', 'tiktokProfile', 'tiktokSearch', 'tiktokLiveSearch']) {
    assert(typeof instance[op] === 'function', `client.${op} is callable (blocking)`);
    assert(typeof instance[op].submit === 'function', `client.${op}.submit exists (non-blocking)`);
    assert(typeof instance[op].resume === 'function', `client.${op}.resume exists`);
  }
  for (const removed of ['transcribeVideoAsync', 'extractVideoDataAsync', 'getTweetStatementAsync', 'waitForTask', 'analyzeVideo', 'analyzeFile', 'analyze']) {
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

  // A watch event parses like the others; its result is the raw watch result.
  const watchBody = JSON.stringify({
    id: 'evt_2',
    type: 'watch.completed',
    created_at: '2026-01-01T00:00:00Z',
    api_version: '1.0.0',
    data: {
      task_id: 'job-2', task_status: 'completed', job_type: 'watch', check_status_url: '/v1/watch/job-2',
      result: { video_info: { title: 'Evening news' }, scenes: [{ start: 0, end: 4, description: 'A presenter.', on_screen_text: 'BREAKING NEWS' }], frames_analyzed: 9 },
    },
  });
  const watchEvent = sdk.constructWebhookEvent(watchBody, `t=${t},v1=${sign(watchBody)}`, secret, opts);
  assert(watchEvent.type === 'watch.completed' && watchEvent.data.job_type === 'watch', 'constructWebhookEvent parses a watch.completed event');
  assert(watchEvent.data.result.scenes[0].on_screen_text === 'BREAKING NEWS', 'watch.completed event carries the raw result');
  assert(sdk.WatchResult.fromJSON(watchEvent.data.result).scenes[0] instanceof sdk.VideoScene, 'a watch event result parses with WatchResult.fromJSON');

  // So does the event of a tweet analysis asked with include_scenes.
  const tweetBody = JSON.stringify({
    id: 'evt_3',
    type: 'tweet_statement.completed',
    created_at: '2026-01-01T00:00:00Z',
    api_version: '1.0.0',
    data: {
      task_id: 'job-3', task_status: 'completed', job_type: 'tweet_statement', check_status_url: '/v1/tweet/statement/job-3',
      result: { final_statement: 'A claim.', claim_type: 'factual_claim', frames_analyzed: 23 },
    },
  });
  const tweetEvent = sdk.constructWebhookEvent(tweetBody, `t=${t},v1=${sign(tweetBody)}`, secret, opts);
  assert(tweetEvent.type === 'tweet_statement.completed' && tweetEvent.data.job_type === 'tweet_statement', 'constructWebhookEvent parses a tweet_statement.completed event');
  assert(sdk.TweetStatement.fromJSON(tweetEvent.data.result).frames_analyzed === 23, 'a tweet event result parses with TweetStatement.fromJSON, frames_analyzed included');
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
    if (url === '/tweet/statement' || url === '/extract/video' || url === '/transcribe' || url === '/watch') {
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
        data: {
          task_id: 'ex-legacy',
          task_status: 'completed',
          result: { topic: 'testing' },
          video_info: { title: 'Extracted video', url: 'https://example.com/video' },
        },
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
    schema: { type: 'object', properties: { topic: { type: 'string', description: 'Topic' } } },
    transcribe: false,
    include_usage: true,
  });
  const submitCall = calls[callsBefore];
  assert(submitCall.url === '/extract/video/async', 'extractVideoData submits to /extract/video/async');
  assert(videoExtraction.data.topic === 'testing', 'extractVideoData returns data from the async result');
  assert(
    videoExtraction.video_info instanceof sdk.VideoInfo && videoExtraction.video_info.title === 'Extracted video',
    'extractVideoData parses video_info from the async job'
  );
  assert(videoExtraction.usage instanceof sdk.UsageBlock, 'extractVideoData parses usage as UsageBlock');
  assert(
    videoExtraction.usage.analysis_tokens && videoExtraction.usage.analysis_tokens.total_tokens === 3,
    'extractVideoData usage.analysis_tokens from analysis_request charge'
  );
  assert(submitCall.data.transcribe === false, 'extractVideoData sends transcribe');
  assert(submitCall.data.include_usage === undefined, 'extractVideoData does not send include_usage on submit');
  assert(calls[calls.length - 1].params.include_usage === 'true', 'extractVideoData sends include_usage on the poll');

  const schemaPath = path.join(__dirname, 'tmp-extraction-schema.json');
  fs.writeFileSync(schemaPath, JSON.stringify({ type: 'object', properties: { topic: { type: 'string', description: 'Topic' } } }));
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
    schema: { type: 'object', properties: { summary: { type: 'string', description: 'Summary' } } },
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

  // Every filter reaches the API as given, the `recency` focus included.
  await client.searchYouTube({
    query: 'react hooks',
    focus: 'recency',
    start_year: 2024,
    end_year: 2025,
    duration: 300,
  });
  {
    const sent = calls[calls.length - 1].data;
    assert(sent.focus === 'recency', 'searchYouTube sends focus=recency');
    assert(sent.start_year === 2024 && sent.end_year === 2025, 'searchYouTube sends start_year and end_year');
    assert(sent.duration === 300, 'searchYouTube sends duration');
  }

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

function formFieldValue(form, name) {
  // The value of a text field is the part that follows its header.
  const at = form._streams.findIndex((part) => typeof part === 'string' && part.includes(`name="${name}"`));
  return at === -1 ? undefined : form._streams[at + 1];
}

/**
 * Fake of the HTTP layer under the client: each "METHOD url" is answered with the given
 * [status, body] pairs in turn (the last one repeats), the way axios would, a 4xx or 5xx
 * rejecting with the response attached. The client's own request and error handling run for real.
 */
function makeHttpStub(client) {
  const calls = [];
  const answers = {};
  const respond = async (config) => {
    calls.push(config);
    const key = `${config.method} ${config.url}`;
    const queue = answers[key];
    if (!queue) throw new Error(`Unexpected request: ${key}`);
    const [status, body] = queue.length > 1 ? queue.shift() : queue[0];
    if (status >= 400) {
      throw { isAxiosError: true, message: `Request failed with status code ${status}`, response: { status, data: body } };
    }
    return { status, data: body };
  };
  client.client.request = respond;
  client.client.post = (url, data, config) => respond({ method: 'POST', url, data, ...config });
  return {
    calls,
    last: () => calls[calls.length - 1],
    on: (key, ...queue) => { answers[key] = queue; },
  };
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

  const syncRoutes = ['/transcribe', '/watch', '/extract/video', '/tweet/statement'];
  const submitRoutes = {
    '/transcribe/async': 'transcribe',
    '/watch/async': 'watch',
    '/extract/video/async': 'extract_video',
    '/tweet/statement/async': 'tweet_statement',
    '/tiktok/profile': 'tiktok_profile',
    '/tiktok/search': 'tiktok_search',
    '/tiktok/live/search': 'tiktok_live_search',
  };

  client.request = async (method, url, data, params, extraHeaders) => {
    calls.push({ method, url, data, params, extraHeaders });
    if (syncRoutes.includes(url)) throw new Error(`SDK must never call the synchronous endpoint ${url}`);
    if (url.startsWith('/analyze/')) throw new Error(`SDK must never call the removed endpoint ${url}`);

    if (method === 'POST' && submitRoutes[url]) {
      const job_type = submitRoutes[url];
      const task_id = `${job_type}-${++seq}`;
      plans[task_id] = nextPlan || [{ task_status: 'completed' }];
      nextPlan = null;
      const webhook_url = data && typeof data.webhook_url === 'string' && data.webhook_url ? data.webhook_url : null;
      const base = { task_id, task_status: 'processing', check_status_url: `/v1${url.replace('/async', '')}/${task_id}`, webhook_url };
      if (job_type === 'tiktok_profile') return { status: 'success', data: { ...base, profile_url: data.profile_url } };
      if (job_type === 'tiktok_search') return { status: 'success', data: { ...base, query: data.query, country: data.country || 'gb' } };
      if (job_type === 'tiktok_live_search') {
        return { status: 'success', data: { ...base, query: data.query, country: data.country || 'us', include_stream_urls: data.include_stream_urls !== false } };
      }
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
      // A plan state may carry its own `usage` block; it is served beside `data`, like the API does.
      const { usage: ownUsage, ...data } = snapshot;
      return { status: 'success', data, usage: withUsage ? ownUsage || usageBlock : undefined };
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
  api.plan([{ task_status: 'processing' }, { task_status: 'completed', result: { topic: 'Never Gonna Give You Up' }, video_info: { title: 'Rick Astley', duration: 212 } }]);
  const ex = await client.extractVideo(
    { video_url: 'https://youtu.be/x', schema: { type: 'object', properties: { topic: { type: 'string', description: 'Topic' } } }, transcribe: false, webhook_url: '' },
    { ...FAST, include_usage: true }
  );
  const exSubmit = api.calls.filter((c) => c.url === '/extract/video/async').pop();
  assert(exSubmit.data.schema.properties.topic.type === 'string', 'extractVideo sends schema');
  assert(exSubmit.data.transcribe === false, 'extractVideo sends transcribe');
  assert(exSubmit.data.webhook_url === '', 'extractVideo passes empty webhook_url (opt-out) through');
  assert(ex.data.topic === 'Never Gonna Give You Up', 'extractVideo result.data is the extracted object');
  assert(ex.usage instanceof sdk.UsageBlock, 'extractVideo result.usage');
  assert(ex.video_info instanceof sdk.VideoInfo && ex.video_info.duration === 212, 'extractVideo result.video_info parsed as VideoInfo');
  assert(ex.schema === undefined, 'extractVideo result has no schema when one was sent');

  // ── extractVideo with what_to_extract alone: the schema written comes back ──
  const written = { type: 'object', required: ['brand'], properties: { brand: { type: 'string', description: 'Brand shown' } } };
  api.plan([{ task_status: 'completed', result: { brand: 'Nike' }, schema: written }]);
  const fromText = await client.extractVideo({ video_url: 'https://youtu.be/x', what_to_extract: 'the brand shown' }, FAST);
  const textSubmit = api.calls.filter((c) => c.url === '/extract/video/async').pop();
  assert(textSubmit.data.schema === undefined, 'extractVideo with what_to_extract alone sends no schema');
  assert(textSubmit.data.what_to_extract === 'the brand shown', 'extractVideo sends what_to_extract');
  assert(fromText.data.brand === 'Nike', 'extractVideo with what_to_extract alone returns the data');
  assert(JSON.stringify(fromText.schema) === JSON.stringify(written), 'extractVideo returns the schema written');
  for (const bad of [
    { video_url: 'https://youtu.be/x' },
    { video_url: 'https://youtu.be/x', what_to_extract: '   ' },
    { video_url: 'https://youtu.be/x', schema: written, schemaFilePath: 'x.json' },
  ]) {
    const refused = await client.extractVideo(bad, FAST).catch((err) => err);
    assert(refused instanceof Error && /schema/.test(refused.message), `extractVideo refuses ${JSON.stringify(Object.keys(bad))} before sending`);
  }

  // ── extractVideo (multipart schema file) ──
  const schemaPath = path.join(__dirname, 'tmp-async-extraction-schema.yaml');
  fs.writeFileSync(schemaPath, 'type: object\nproperties:\n  topic:\n    type: string\n    description: Topic\n');
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
    const exJobResult = await exJob.result(FAST);
    assert(exJobResult.data.topic === 'x', 'extractVideo multipart job result');
    assert(exJobResult.video_info === undefined, 'extractVideo result without video_info (older server) leaves it undefined');
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

  // ── tweetStatement with include_scenes: sent only when true ──
  {
    const tweetSubmits = () => api.calls.filter((c) => c.url === '/tweet/statement/async');
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const scenesResult = { final_statement: 'The video shows the price on a label.', claim_type: 'factual_claim', frames_analyzed: 23 };

    assert(!('include_scenes' in tweetSubmits()[0].data), 'tweetStatement(id) leaves include_scenes to the API default');

    // Blocking call, include_scenes: true.
    api.plan([{ task_status: 'processing' }, { task_status: 'completed', result: scenesResult }]);
    const withScenes = await client.tweetStatement({ tweet_id: '42', include_scenes: true }, FAST);
    assert(same(tweetSubmits().pop().data, { tweet_id: '42', include_scenes: true }), 'tweetStatement sends include_scenes: true', JSON.stringify(tweetSubmits().pop().data));
    assert(withScenes instanceof sdk.TweetStatement && withScenes.frames_analyzed === 23, 'tweetStatement with include_scenes: result.frames_analyzed');
    assert(withScenes.scenes_error === undefined, 'tweetStatement with include_scenes: no scenes_error when the picture was read');

    // Blocking call, include_scenes: false is not sent.
    api.plan([{ task_status: 'completed', result: { final_statement: 'A claim' } }]);
    const withoutScenes = await client.tweetStatement({ tweet_id: '43', include_scenes: false }, FAST);
    assert(same(tweetSubmits().pop().data, { tweet_id: '43' }), 'tweetStatement leaves include_scenes: false out of the body', JSON.stringify(tweetSubmits().pop().data));
    assert(withoutScenes.frames_analyzed === undefined, 'tweetStatement without include_scenes: no frames_analyzed');

    // .submit, include_scenes: true, with the other options passed through.
    api.plan([{ task_status: 'completed', result: { ...scenesResult, frames_analyzed: 0, scenes_error: { error: 'frames_not_available', message: 'This video has no picture we can read.' } } }]);
    const tweetJob = await client.tweetStatement.submit({ tweet_id: '44', include_scenes: true, webhook_url: 'https://example.com/hook' });
    assert(
      same(tweetSubmits().pop().data, { tweet_id: '44', webhook_url: 'https://example.com/hook', include_scenes: true }),
      'tweetStatement.submit sends include_scenes: true and webhook_url',
      JSON.stringify(tweetSubmits().pop().data)
    );
    assert(tweetJob instanceof sdk.Job && tweetJob.job_type === 'tweet_statement', 'tweetStatement.submit returns a Job (job_type tweet_statement)');
    const noPicture = await tweetJob.result(FAST);
    assert(noPicture.scenes_error.error === 'frames_not_available' && noPicture.frames_analyzed === 0, 'tweetStatement.submit result: scenes_error when a video\'s picture could not be read');

    // .submit, include_scenes: false is not sent.
    api.plan([{ task_status: 'completed', result: { final_statement: 'A claim' } }]);
    await client.tweetStatement.submit({ tweet_id: '45', include_scenes: false });
    assert(same(tweetSubmits().pop().data, { tweet_id: '45' }), 'tweetStatement.submit leaves include_scenes: false out of the body', JSON.stringify(tweetSubmits().pop().data));

    // getTweetStatement takes include_scenes the same way.
    api.plan([{ task_status: 'completed', result: scenesResult }]);
    const viaPayload = await client.getTweetStatement({ tweet_id: '46', include_scenes: true }, FAST);
    assert(same(tweetSubmits().pop().data, { tweet_id: '46', include_scenes: true }) && viaPayload.frames_analyzed === 23, 'getTweetStatement sends include_scenes: true');
    api.plan([{ task_status: 'completed', result: { final_statement: 'A claim' } }]);
    await client.getTweetStatement({ tweet_id: '47', include_scenes: false }, FAST);
    assert(same(tweetSubmits().pop().data, { tweet_id: '47' }), 'getTweetStatement leaves include_scenes: false out of the body');

    assert(tweetSubmits().every((c) => c.data.include_usage === undefined), 'tweetStatement never sends include_usage on submit');
  }

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

  // ── tiktokLiveSearch ──
  const room = (id) => ({ id, url: `https://www.tiktok.com/@u${id}/live`, stats: { viewers: 10 },
    stream_urls: { default_quality: 'hd', flv: { hd: `https://x/${id}_hd.flv` }, hls: {}, audio_only: null, expires_at: null } });
  api.plan([{ task_status: 'processing', pages: [[room('a')], [room('b')]] }, { task_status: 'completed', pages: [[room('a')], [room('b')]], country: 'gb' }]);
  const live = await client.tiktokLiveSearch({ query: 'music', country: 'gb', max_results: 20 }, { ...FAST, include_usage: true });
  const liveSubmit = api.calls.filter((c) => c.url === '/tiktok/live/search').pop();
  assert(liveSubmit.method === 'POST' && liveSubmit.data.country === 'gb' && liveSubmit.data.max_results === 20, 'tiktokLiveSearch passes options through');
  assert(!('include_stream_urls' in liveSubmit.data), 'tiktokLiveSearch leaves include_stream_urls to the API default');
  assert(live instanceof sdk.TikTokLiveSearchTask && live.results.map((x) => x.id).join('') === 'ab', 'tiktokLiveSearch collects rooms from every page');
  assert(live.results[0] instanceof sdk.TikTokLiveRoom && live.results[0].stream_urls.flv.hd === 'https://x/a_hd.flv', 'tiktokLiveSearch rooms parsed');
  assert(live.usage instanceof sdk.UsageBlock, 'tiktokLiveSearch result.usage');
  const livePolls = api.calls.filter((c) => c.method === 'GET' && c.url.startsWith('/tiktok/live/search/'));
  assert(livePolls.length > 0 && livePolls.every((c) => c.url.startsWith('/tiktok/live/search/tiktok_live_search-')), 'tiktokLiveSearch polls /tiktok/live/search/{task_id}');

  api.plan([{ task_status: 'completed', pages: [[room('z')]] }]);
  const liveJob = await client.tiktokLiveSearch.submit({ query: 'gaming', include_stream_urls: false, webhook_url: 'https://example.com/hook' });
  assert(liveJob.job_type === 'tiktok_live_search' && liveJob.webhook_url === 'https://example.com/hook', 'tiktokLiveSearch.submit returns a Job with webhook_url');
  assert(api.calls.filter((c) => c.url === '/tiktok/live/search').pop().data.include_stream_urls === false, 'tiktokLiveSearch sends include_stream_urls: false');
  assert((await client.tiktokLiveSearch.resume(liveJob.task_id).result(FAST)).results[0].id === 'z', 'tiktokLiveSearch.resume(task_id).result()');

  api.plan([{ task_status: 'completed', pages: [[room('q')]] }]);
  await client.tiktokLiveSearch('cooking', FAST);
  assert(api.calls.filter((c) => c.url === '/tiktok/live/search').pop().data.query === 'cooking', 'tiktokLiveSearch(query) sends query');

  // ── tiktokSearch country ──
  api.plan([{ task_status: 'completed', pages: [[result('fr1')]], country: 'fr' }]);
  const frSearch = await client.tiktokSearch({ query: 'football', country: 'fr' }, FAST);
  assert(api.calls.filter((c) => c.url === '/tiktok/search').pop().data.country === 'fr', 'tiktokSearch passes country through');
  assert(frSearch.country === 'fr', 'tiktokSearch result.country');
}

async function runWatchTests() {
  const client = new sdk.VidNavigatorClient({ apiKey: 'test-key' });
  const api = makeFakeApi(client);
  const url = 'https://www.tiktok.com/@nasa/video/7300000000000000000';
  const hook = 'https://example.com/hooks/vidnavigator';
  const scenes = [
    { start: 0, end: 4, description: 'A presenter stands in front of a world map and points at Europe.', on_screen_text: 'BREAKING NEWS' },
    { start: 4, end: 12.5, description: 'Aerial view of a harbour at dusk.', on_screen_text: '' },
  ];
  const watched = {
    video_info: { title: 'Evening news', duration: 12.5, url },
    transcript: [{ text: 'Good evening.', start: 0.4, end: 1.6 }],
    scenes,
    frames_analyzed: 9,
  };
  // The credit amounts are placeholders: the tests read the quantities.
  const usage = {
    charges: [
      { service_type: 'standard_request', quantity: 1, credits: 1 },
      { service_type: 'frame_analysis', quantity: 9, credits: 1 },
    ],
    total_credits: 2,
  };
  const submits = () => api.calls.filter((c) => c.url === '/watch/async');
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  // ── watch: blocking one-liner ──
  api.plan([{ task_status: 'processing' }, { task_status: 'completed', result: watched, usage }]);
  const res = await client.watch(url, { ...FAST, include_usage: true });
  assert(submits().length === 1 && submits()[0].method === 'POST', 'watch submits POST /watch/async');
  assert(same(submits()[0].data, { video_url: url }), 'watch(url) sends video_url only (detail is left to the API default)', JSON.stringify(submits()[0].data));
  assert(api.last().method === 'GET' && api.last().url === '/watch/watch-1', 'watch polls GET /watch/{task_id}');
  assert(api.last().params.include_usage === 'true', 'watch sends include_usage on the poll');
  assert(api.pollsOf('watch-1') === 2, 'watch polls until completed');
  assert(res instanceof sdk.WatchResult, 'watch result is a WatchResult');
  assert(res.video_info instanceof sdk.VideoInfo && res.video_info.title === 'Evening news', 'watch result.video_info is VideoInfo');
  assert(res.transcript[0] instanceof sdk.TranscriptSegment && res.transcript[0].text === 'Good evening.', 'watch result.transcript parsed');
  assert(res.transcript_error === undefined, 'watch result has no transcript_error when there is a transcript');
  assert(res.scenes.length === 2 && res.scenes.every((s) => s instanceof sdk.VideoScene), 'watch result.scenes are VideoScene');
  assert(res.scenes.map((s) => `${s.start}-${s.end}`).join(',') === '0-4,4-12.5', 'watch scenes keep start / end');
  assert(res.scenes[0].on_screen_text === 'BREAKING NEWS' && res.scenes[1].on_screen_text === '', 'watch scenes on_screen_text');
  assert(res.frames_analyzed === 9, 'watch result.frames_analyzed');
  assert(res.usage instanceof sdk.UsageBlock && res.usage.total_credits === 2, 'watch result.usage');
  assert(res.usage.charge_for('frame_analysis').quantity === 9, 'watch usage has the frame_analysis charge');

  // ── every option is passed through; .submit returns a handle ──
  api.plan([{ task_status: 'processing' }, { task_status: 'completed', result: { video_info: { title: 'T' }, scenes, frames_analyzed: 4 } }]);
  const before = api.calls.length;
  const job = await client.watch.submit({
    video_url: url, detail: 'high', include_transcript: false, transcript_text: true, webhook_url: hook,
  });
  assert(api.calls.length === before + 1, 'watch.submit makes exactly one request');
  assert(
    same(api.last().data, { video_url: url, detail: 'high', include_transcript: false, transcript_text: true, webhook_url: hook }),
    'watch.submit passes detail / include_transcript / transcript_text / webhook_url through',
    JSON.stringify(api.last().data)
  );
  assert(job instanceof sdk.Job && job.job_type === 'watch' && job.task_id === 'watch-2', 'watch.submit returns a Job (job_type watch)');
  assert(job.check_status_url === '/v1/watch/watch-2', 'watch Job.check_status_url');
  assert(job.webhook_url === hook, 'watch Job.webhook_url echoes the submit response');
  const snapshot = await job.refresh();
  assert(snapshot instanceof sdk.AsyncJob && snapshot.task_status === 'processing' && snapshot.result === null, 'watch Job.refresh() returns the task, without a result while processing');
  assert(api.last().params === undefined, 'watch polls send no include_usage unless requested');
  const scenesOnly = await job.result(FAST);
  assert(scenesOnly.transcript === undefined, 'watch with include_transcript: false has no transcript');
  assert(scenesOnly.scenes.length === 2 && scenesOnly.frames_analyzed === 4, 'watch with include_transcript: false returns the scenes');
  assert(scenesOnly.usage === undefined, 'watch result has no usage unless requested');
  const done = await job.wait(FAST);
  assert(done.task_status === 'completed' && done.result instanceof sdk.WatchResult, 'watch Job.wait() returns the completed task with a WatchResult');

  // An empty webhook_url (opt out of the account default) reaches the API.
  api.plan([{ task_status: 'completed', result: watched }]);
  await client.watch.submit({ video_url: url, webhook_url: '' });
  assert(api.last().data.webhook_url === '', 'watch passes an empty webhook_url through');

  // ── resume by task_id ──
  api.addTask('saved-watch', [{ task_status: 'completed', result: watched, usage }]);
  const beforeResume = api.calls.length;
  const resumed = client.watch.resume('saved-watch', { include_usage: true });
  assert(api.calls.length === beforeResume, 'watch.resume() makes no request');
  assert(resumed instanceof sdk.Job && resumed.job_type === 'watch' && resumed.task_id === 'saved-watch', 'watch.resume() returns a Job for the task_id');
  const resumedResult = await resumed.result(FAST);
  assert(resumedResult instanceof sdk.WatchResult && resumedResult.usage.charge_for('frame_analysis').quantity === 9, 'resumed watch Job.result() with usage');

  // ── a video without a transcript is not an error ──
  api.plan([{
    task_status: 'completed',
    result: {
      video_info: { title: 'Silent clip' },
      transcript: [],
      transcript_error: { error: 'transcript_not_available', message: 'No transcript found for this video.' },
      scenes,
      frames_analyzed: 4,
    },
  }]);
  const silent = await client.watch(url, FAST);
  assert(Array.isArray(silent.transcript) && silent.transcript.length === 0, 'watch without speech: transcript is empty');
  assert(silent.transcript_error.error === 'transcript_not_available', 'watch without speech: transcript_error says why');
  assert(silent.scenes.length === 2, 'watch without speech: the scenes are returned');

  // ── transcript_text: one string ──
  api.plan([{ task_status: 'completed', result: { ...watched, transcript: 'Good evening.' } }]);
  const asText = await client.watch({ video_url: url, transcript_text: true }, FAST);
  assert(asText.transcript === 'Good evening.', 'watch transcript_text returns one string');

  // ── watchVideo: the blocking method, include_usage in the payload ──
  api.plan([{ task_status: 'processing' }, { task_status: 'completed', result: watched, usage }]);
  const viaMethod = await client.watchVideo({ video_url: url, detail: 'low', include_usage: true }, FAST);
  assert(same(submits().pop().data, { video_url: url, detail: 'low' }), 'watchVideo submits to /watch/async without include_usage', JSON.stringify(submits().pop().data));
  assert(api.last().params.include_usage === 'true', 'watchVideo include_usage is read from the poll');
  assert(viaMethod instanceof sdk.WatchResult && viaMethod.usage instanceof sdk.UsageBlock, 'watchVideo returns a WatchResult with usage');

  api.plan([{ task_status: 'completed', result: watched }]);
  const plain = await client.watchVideo({ video_url: url }, FAST);
  assert(plain.scenes.length === 2 && plain.usage === undefined, 'watchVideo without include_usage has no usage');

  // ── failures carry the API's error code, class and the task_id ──
  const failures = [
    [{ error: 'frames_not_available', message: 'No picture to read', http_status: 404 }, sdk.NotFoundError],
    [{ error: 'video_too_long', message: 'Too long', http_status: 400 }, sdk.BadRequestError],
    [{ error: 'limit_exceeded', message: 'Out of credits mid-job', http_status: 402 }, sdk.InsufficientCreditsError],
  ];
  for (const [error, Cls] of failures) {
    api.plan([{ task_status: 'processing' }, { task_status: 'failed', result: null, error }]);
    const e = await client.watch(url, FAST).catch((err) => err);
    assert(e instanceof Cls, `failed watch job (${error.http_status} ${error.error}) throws ${Cls.name}`, e && `${e.name}: ${e.message}`);
    assert(e.error_code === error.error && e.status_code === error.http_status, `failed watch job ${error.error} carries error / http_status`);
    assert(typeof e.task_id === 'string' && e.task_id.startsWith('watch-'), `failed watch job ${error.error} error carries task_id`);
  }

  // ── the synchronous endpoint is never called ──
  assert(!api.calls.some((c) => c.url === '/watch'), 'watch never calls the synchronous POST /watch');
  assert(submits().every((c) => c.data.include_usage === undefined), 'watch never sends include_usage on submit');
}

async function runScenesTests() {
  const fx = require('./fixtures/scenes');
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const allScenes = (list) => Array.isArray(list) && list.length > 0 && list.every((s) => s instanceof sdk.VideoScene);
  const sceneKeys = ['scenes', 'frames_analyzed', 'scenes_error', 'transcript_error'];
  const hasNoSceneFields = (result) => sceneKeys.every((key) => !(key in result));

  const client = new sdk.VidNavigatorClient({ apiKey: 'test-key' });
  const http = makeHttpStub(client);

  // ── extraction of a video with include_scenes, on the generic fake of the job API ──
  {
    const jobs = new sdk.VidNavigatorClient({ apiKey: 'test-key' });
    const api = makeFakeApi(jobs);
    const exSubmits = () => api.calls.filter((c) => c.url === '/extract/video/async');
    api.plan([{ task_status: 'processing' }, { task_status: 'completed', result: fx.extractedRecipe, video_info: fx.videoInfo, frames_analyzed: 30, usage: fx.extractVideoUsage }]);
    const extracted = await jobs.extractVideoData({ video_url: fx.VIDEO_URL, schema: fx.recipeSchema, include_scenes: true, include_usage: true }, FAST);
    assert(exSubmits().pop().data.include_scenes === true && exSubmits().pop().data.include_usage === undefined, 'extractVideoData sends include_scenes on submit');
    assert(extracted.data.ingredients[0].quantity === '500 g' && extracted.video_info instanceof sdk.VideoInfo, 'extraction with scenes: data and video_info');
    assert(extracted.frames_analyzed === 30, 'extraction with scenes: frames_analyzed beside data');
    assert(!('scenes_error' in extracted) && !('transcript_error' in extracted), 'extraction with scenes: no scenes_error / transcript_error when both were read');
    assert(extracted.usage.charge_for('frame_analysis').quantity === 30, 'extraction with scenes: usage has the frame_analysis charge');

    api.plan([{ task_status: 'completed', result: fx.extractedRecipe, video_info: fx.videoInfo, frames_analyzed: 0, scenes_error: { error: 'frames_not_available', message: 'This video has no picture we can read.' } }]);
    const fromTranscript = await jobs.extractVideo({ video_url: fx.VIDEO_URL, schema: fx.recipeSchema, include_scenes: true }, FAST);
    assert(fromTranscript.scenes_error.error === 'frames_not_available' && fromTranscript.frames_analyzed === 0, 'extractVideo: scenes_error when the picture could not be read');

    api.plan([{ task_status: 'completed', result: fx.extractedRecipe, video_info: fx.videoInfo, frames_analyzed: 30, transcript_error: { error: 'transcript_not_available', message: 'No transcript found for this video.' } }]);
    const fromScenes = await jobs.extractVideo({ video_url: fx.VIDEO_URL, schema: fx.recipeSchema, include_scenes: true }, FAST);
    assert(fromScenes.transcript_error.error === 'transcript_not_available' && fromScenes.frames_analyzed === 30, 'extractVideo: transcript_error when there is no transcript');

    api.plan([{ task_status: 'completed', result: fx.extractedRecipe, video_info: fx.videoInfo }]);
    const noScenes = await jobs.extractVideo({ video_url: fx.VIDEO_URL, schema: fx.recipeSchema }, FAST);
    assert(!('include_scenes' in exSubmits().pop().data), 'extractVideo leaves include_scenes to the API default');
    assert(sceneKeys.every((key) => !(key in noScenes)), 'extractVideo without include_scenes has no scene fields', Object.keys(noScenes).join(','));

    const schemaPath = path.join(__dirname, 'tmp-scenes-extraction-schema.json');
    fs.writeFileSync(schemaPath, JSON.stringify(fx.recipeSchema));
    try {
      api.plan([{ task_status: 'completed', result: fx.extractedRecipe, frames_analyzed: 30 }]);
      const fromFile = await jobs.extractVideo({ video_url: fx.VIDEO_URL, schemaFilePath: schemaPath, include_scenes: true }, FAST);
      const form = exSubmits().pop().data;
      assert(typeof form.getHeaders === 'function' && formFieldValue(form, 'include_scenes') === 'true', 'extractVideo multipart sends include_scenes as "true"');
      assert(fromFile.frames_analyzed === 30, 'extractVideo multipart result: frames_analyzed');
    } finally {
      fs.unlinkSync(schemaPath);
    }
  }

  // A failed extraction job asked with include_scenes.
  http.on('POST /extract/video/async', [202, fx.extractAsyncSubmit]);
  http.on(`GET /extract/video/${fx.EXTRACT_TASK_ID}`, [200, fx.extractAsyncFailed]);
  const tooLarge = await client.extractVideo({ video_url: fx.VIDEO_URL, schema: fx.recipeSchema, include_scenes: true }, FAST).catch((err) => err);
  assert(tooLarge instanceof sdk.BadRequestError && tooLarge.error_code === 'input_too_large', 'failed extraction job with scenes throws BadRequestError (input_too_large)', tooLarge && `${tooLarge.name}: ${tooLarge.message}`);
  assert(tooLarge.task_id === fx.EXTRACT_TASK_ID, 'failed extraction job error carries task_id');

  // ── upload with include_scenes ──
  http.on('POST /upload/file', [201, fx.uploadWithScenes]);
  const uploaded = await client.uploadFile({ filePath: __filename, include_scenes: true });
  assert(http.last().url === '/upload/file' && formFieldValue(http.last().data, 'include_scenes') === 'true', 'uploadFile sends include_scenes as "true"');
  assert(http.last().headers['content-type'].startsWith('multipart/form-data'), 'uploadFile sends multipart form-data');
  assert(uploaded.status === 'success' && uploaded.file_status === 'processing', 'uploadFile with scenes: status / file_status');
  assert(uploaded.file_info instanceof sdk.FileInfo && uploaded.file_info.scenes_status === 'processing', 'uploadFile with scenes: file_info.scenes_status is processing');

  http.on('POST /upload/file', [201, fx.uploadWithoutScenes]);
  const uploadedPlain = await client.uploadFile({ filePath: __filename, wait_for_completion: true });
  assert(!formFieldNames(http.last().data).includes('include_scenes'), 'uploadFile leaves include_scenes to the API default');
  assert(formFieldValue(http.last().data, 'wait_for_completion') === 'true', 'uploadFile still sends wait_for_completion');
  assert(uploadedPlain.file_info.scenes_status === 'none' && uploadedPlain.file_info.scenes_error === undefined, 'uploadFile without scenes: file_info.scenes_status is none');
  await client.uploadFile({ filePath: __filename, include_scenes: false });
  assert(formFieldValue(http.last().data, 'include_scenes') === 'false', 'uploadFile sends include_scenes: false as "false"');

  http.on('POST /upload/file', [201, fx.uploadAudioWithScenes]);
  const uploadedAudio = await client.uploadFile({ filePath: __filename, wait_for_completion: true, include_scenes: true });
  assert(uploadedAudio.file_info.scenes_status === 'failed', 'uploadFile of an audio file with scenes: scenes_status is failed');
  assert(same(uploadedAudio.file_info.scenes_error, fx.NO_PICTURE), 'uploadFile of an audio file with scenes: scenes_error is frames_not_available');

  // ── getFile: scenes_status, and the scenes once completed ──
  http.on(`GET /file/${fx.AUDIO_FILE_ID}`, [200, fx.getAudioFile]);
  const audio = await client.getFile(fx.AUDIO_FILE_ID);
  assert(audio.file_info.scenes_status === 'failed' && audio.file_info.scenes_error.error === 'frames_not_available', 'getFile: scenes_status failed with scenes_error');
  assert(!('scenes' in audio) && audio.transcript[0] instanceof sdk.TranscriptSegment, 'getFile: no scenes unless completed, transcript parsed');

  http.on(`GET /file/${fx.FILE_ID}`, [200, fx.getFileWithScenes]);
  const file = await client.getFile(fx.FILE_ID, { transcript_text: false });
  assert(http.last().method === 'GET' && http.last().params.transcript_text === false, 'getFile passes its query through');
  assert(file.file_info.scenes_status === 'completed' && file.file_info.frames_analyzed === 30, 'getFile: scenes_status completed with frames_analyzed');
  assert(allScenes(file.scenes) && file.scenes.length === fx.fileScenes.length, 'getFile: scenes are VideoScene once completed');
  assert(file.scenes[3].on_screen_text === 'FRANGO DESFIADO COZIDO 500 g', 'getFile: scene on_screen_text');

  // ── analyzeFileScenes ──
  const scenesUrl = `/file/${fx.FILE_ID}/scenes`;
  http.on(`POST ${scenesUrl}`, [202, fx.fileScenesStarted], [200, fx.fileScenesAlreadyThere]);
  const started = await client.analyzeFileScenes(fx.FILE_ID);
  assert(http.last().method === 'POST' && http.last().url === scenesUrl && http.last().data === undefined, 'analyzeFileScenes posts /file/{file_id}/scenes without a body');
  assert(same(started, { file_id: fx.FILE_ID, scenes_status: 'processing', message: 'Scene analysis started.' }), 'analyzeFileScenes: started (202)', JSON.stringify(started));
  const already = await client.analyzeFileScenes(fx.FILE_ID);
  assert(already.scenes_status === 'completed' && already.file_id === fx.FILE_ID, 'analyzeFileScenes: already there (200)');

  http.on(`POST /file/${fx.AUDIO_FILE_ID}/scenes`, [400, fx.fileScenesNoPicture]);
  const refused = await client.analyzeFileScenes(fx.AUDIO_FILE_ID).catch((err) => err);
  assert(refused instanceof sdk.BadRequestError && refused.status_code === 400, 'analyzeFileScenes on an audio file throws BadRequestError', refused && `${refused.name}: ${refused.message}`);
  assert(refused.error_code === 'frames_not_available' && refused.message.includes('no picture'), 'analyzeFileScenes on an audio file: error_code frames_not_available');

  // ── extractFileData with include_scenes: 409 until the file has its scenes ──
  http.on('POST /extract/file', [409, fx.scenesNotAvailable]);
  const notYet = await client.extractFileData({ file_id: fx.FILE_ID, what_to_extract: fx.WHAT_TO_EXTRACT, include_scenes: true }).catch((err) => err);
  assert(notYet instanceof sdk.ScenesNotAvailableError && notYet instanceof sdk.VidNavigatorError, 'extractFileData with scenes on a file without scenes throws ScenesNotAvailableError', notYet && `${notYet.name}: ${notYet.message}`);
  assert(notYet.name === 'ScenesNotAvailableError' && notYet.status_code === 409 && notYet.error_code === 'scenes_not_available', 'ScenesNotAvailableError carries status_code 409 / error_code');
  assert(notYet.scenes_status === 'none' && notYet.scenes_error === undefined, 'ScenesNotAvailableError.scenes_status is none when the scenes were never asked for');
  assert(notYet.error_message === fx.scenesNotAvailable.message && notYet.message.includes('This file has no scenes yet'), 'ScenesNotAvailableError carries the API message');
  assert(notYet.details.scenes_status === 'none', 'ScenesNotAvailableError.details is the response body');

  http.on('POST /extract/file', [409, fx.scenesStillProcessing]);
  const running = await client.extractFileData({ file_id: fx.FILE_ID, what_to_extract: fx.WHAT_TO_EXTRACT, include_scenes: true }).catch((err) => err);
  assert(running instanceof sdk.ScenesNotAvailableError && running.scenes_status === 'processing', 'ScenesNotAvailableError.scenes_status is processing while the scenes are analyzed');

  http.on('POST /extract/file', [409, fx.scenesFailed]);
  const failedScenes = await client.extractFileData({ file_id: fx.AUDIO_FILE_ID, what_to_extract: fx.WHAT_TO_EXTRACT, include_scenes: true }).catch((err) => err);
  assert(failedScenes instanceof sdk.ScenesNotAvailableError && failedScenes.scenes_status === 'failed', 'ScenesNotAvailableError.scenes_status is failed after a failed scene analysis');
  assert(same(failedScenes.scenes_error, fx.NO_PICTURE), 'ScenesNotAvailableError.scenes_error says why the scene analysis failed');

  http.on('POST /extract/file', [409, { status: 'error', error: 'conflict', message: 'Something else' }]);
  const other409 = await client.extractFileData({ file_id: fx.FILE_ID, what_to_extract: fx.WHAT_TO_EXTRACT }).catch((err) => err);
  assert(other409.constructor === sdk.VidNavigatorError && other409.status_code === 409 && other409.error_code === 'conflict', 'another 409 stays a plain VidNavigatorError');

  // ── extractFileData with include_scenes, once the file has its scenes ──
  http.on('POST /extract/file', [200, fx.extractFileWithScenes]);
  const fileExtraction = await client.extractFileData({ file_id: fx.FILE_ID, schema: fx.recipeSchema, include_scenes: true, include_usage: true });
  assert(http.last().data.include_scenes === true && http.last().data.file_id === fx.FILE_ID, 'extractFileData sends include_scenes in the body');
  assert(fileExtraction.data.dish === 'PATÊ DE FRANGO CREMOSO' && fileExtraction.data.ingredients.length === 3, 'extractFileData with scenes: data');
  assert(fileExtraction.frames_analyzed === 30, 'extractFileData with scenes: frames_analyzed beside data');
  assert(fileExtraction.file_info instanceof sdk.FileInfo && fileExtraction.file_info.scenes_status === 'completed', 'extractFileData with scenes: file_info.scenes_status');
  assert(!('scenes_error' in fileExtraction) && !('transcript_error' in fileExtraction), 'extractFileData with scenes: no scenes_error / transcript_error when both were read');
  assert(fileExtraction.usage.analysis_tokens.total_tokens === 2148 && fileExtraction.usage.charge_for('frame_analysis') === undefined, 'extractFileData with scenes: the frames of a file are not charged by the extraction');

  http.on('POST /extract/file', [200, { status: 'success', data: { dish: 'Soup' }, file_info: fx.fileInfoWithoutScenes }]);
  const exPlain = await client.extractFileData({ file_id: fx.FILE_ID, schema: fx.recipeSchema });
  assert(!('include_scenes' in http.last().data) && hasNoSceneFields(exPlain), 'extractFileData without include_scenes has no scene fields', Object.keys(exPlain).join(','));
  assert(exPlain.file_info instanceof sdk.FileInfo && exPlain.file_info.scenes_status === undefined, 'extractFileData without include_scenes: file_info as before');

  const fileSchemaPath = path.join(__dirname, 'tmp-scenes-file-schema.json');
  fs.writeFileSync(fileSchemaPath, JSON.stringify(fx.recipeSchema));
  try {
    http.on('POST /extract/file', [200, fx.extractFileWithScenes]);
    const viaForm = await client.extractFileData({ file_id: fx.FILE_ID, schemaFilePath: fileSchemaPath, include_scenes: true });
    const form = http.last().data;
    assert(typeof form.getHeaders === 'function' && formFieldValue(form, 'include_scenes') === 'true', 'extractFileData multipart sends include_scenes as "true"');
    assert(http.last().headers['content-type'].startsWith('multipart/form-data'), 'extractFileData multipart content type');
    assert(!formFieldNames(form).includes('include_usage'), 'extractFileData multipart omits undefined fields');
    assert(viaForm.frames_analyzed === 30, 'extractFileData multipart result: frames_analyzed');
  } finally {
    fs.unlinkSync(fileSchemaPath);
  }
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
    ['watch submit 402', () => client.watch('https://x.com/v'), 402, limit402, sdk.InsufficientCreditsError],
    ['watch.submit 429', () => client.watch.submit('https://x.com/v'), 429, jobs429, sdk.TooManyActiveJobsError],
    ['watch submit 400 (unknown detail)', () => client.watch({ video_url: 'https://x.com/v', detail: 'extreme' }), 400, { status: 'error', error: 'invalid_parameter', message: 'detail must be one of: low, auto, high' }, sdk.BadRequestError],
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
  assert(partial.error_code === 'insufficient_credits_video_search' && partial.query === 'q', 'searchYouTube partial result carries error_code and query');

  nextError = axiosError(402, { status: 'error', error: 'limit_exceeded', error_code: 'insufficient_credits', message: 'Not enough credits.' });
  const noCredits = await client.searchYouTube({ query: 'q' }).catch((err) => err);
  assert(noCredits instanceof sdk.PaymentRequiredError, 'searchYouTube 402 with status error still throws PaymentRequiredError');

  nextError = axiosError(503, { status: 'error', error: 'system_overload', message: 'Busy', retry_after_seconds: 12 });
  const overload = await client.tiktokSearch('ai').catch((err) => err);
  assert(overload.retry_after_seconds === 12, 'SystemOverloadError.retry_after_seconds from response');

  nextError = new Error('socket hang up');
  const network = await client.transcribe('https://x.com/v').catch((err) => err);
  assert(network instanceof sdk.VidNavigatorError && network.status_code === undefined, 'network errors surface as VidNavigatorError');
  assert(network.task_id === undefined, 'submit errors have no task_id (no task was created)');
}

async function runLiveRoomTests() {
  const client = new sdk.VidNavigatorClient({ apiKey: 'test-key', axiosConfig: { timeout: 30000 } });
  const calls = [];
  const roomJSON = {
    id: '7705498471838665494', title: 'Night stream', url: 'https://www.tiktok.com/@streamer/live',
    status: 'live', ended_at: null, share_url: 'https://m.tiktok.com/share/live/7705498471838665494',
    started_at: '2026-11-07T16:00:00Z',
    author: { unique_id: 'streamer', followers: 18867, bio: 'Live every night', following: 9011 },
    stats: { viewers: 936, total_viewers: 4005, new_followers: 12 },
    hashtags: ['fr'], age_restricted: false, subscribers_only: false, chat_enabled: true, products: 2,
  };
  let reply = null;
  client.request = async (method, url, data, params, extraHeaders, minTimeoutMs) => {
    calls.push({ method, url, data, minTimeoutMs });
    return reply;
  };

  reply = {
    status: 'success',
    data: {
      room: roomJSON,
      comments: [{ id: '3', text: 'hello', language: 'fr', created_at: '2026-11-07T16:46:42.500Z',
                   author: { unique_id: 'bob', followers: 5 }, author_is_follower: true,
                   author_is_moderator: false, author_is_subscriber: false }],
      pinned_comment: null,
      intro: 'Welcome',
      top_viewers: [{ rank: 1, score: 300, user: { unique_id: 'bob' } }],
    },
    usage: { charges: [{ service_type: 'residential_request', quantity: 2, credits: 0.01 }], total_credits: 0.01 },
  };
  const res = await client.getTikTokLiveRoom({ room_id: '7705498471838665494', include_comments: true, comments_limit: 10, include_usage: true });
  const call = calls.pop();
  assert(call.method === 'POST' && call.url === '/tiktok/live/room', 'getTikTokLiveRoom posts /tiktok/live/room');
  assert(call.data.room_id === '7705498471838665494' && call.data.include_comments === true && call.data.comments_limit === 10, 'getTikTokLiveRoom passes the request through');
  assert(call.minTimeoutMs === 120000, 'getTikTokLiveRoom asks for a 120 s minimum timeout');
  assert(res.room instanceof sdk.TikTokLiveRoomDetail && res.room instanceof sdk.TikTokLiveRoom, 'room parsed as TikTokLiveRoomDetail');
  assert(res.room.isLive && res.room.ended_at === null, 'TikTokLiveRoomDetail.isLive / ended_at');
  assert(res.room.stats.viewers === 936 && res.room.stats.total_viewers === 4005 && res.room.stats.new_followers === 12, 'TikTokLiveRoomDetail.stats');
  assert(!('likes' in res.room.stats) && !('shares' in res.room.stats), 'room stats carry no likes / shares');
  assert(res.room.author.bio === 'Live every night' && res.room.author.following === 9011, 'TikTokLiveRoomDetail.author bio / following');
  assert(res.room.chat_enabled === true && res.room.products === 2 && res.room.share_url.includes('/share/live/'), 'TikTokLiveRoomDetail details');
  assert(res.comments[0].created_at instanceof Date && res.comments[0].created_at.toISOString() === '2026-11-07T16:46:42.500Z', 'comment created_at Date');
  assert(res.comments[0].author.unique_id === 'bob' && res.comments[0].author_is_follower === true, 'comment author');
  assert(res.pinned_comment === null && res.intro === 'Welcome' && res.top_viewers[0].user.unique_id === 'bob', 'pinned_comment / intro / top_viewers');
  assert(res.usage instanceof sdk.UsageBlock, 'getTikTokLiveRoom result.usage');

  reply = { status: 'success', data: { room: { ...roomJSON, status: 'ended', ended_at: '2026-11-07T18:51:31Z' } } };
  const ended = await client.getTikTokLiveRoom({ username: '@streamer' });
  assert(!ended.room.isLive && ended.room.ended_at.toISOString() === '2026-11-07T18:51:31.000Z', 'ended room');
  assert(ended.comments === undefined && ended.top_viewers === undefined && ended.usage === undefined, 'no chat fields without include_comments');

  calls.length = 0;
  for (const bad of [{}, { room_id: '1', username: 'a' }, { username: 'a', url: 'https://www.tiktok.com/@a/live' }]) {
    const err = await client.getTikTokLiveRoom(bad).catch((e) => e);
    assert(err instanceof sdk.VidNavigatorError && err.message.includes('exactly one'), `getTikTokLiveRoom refuses ${JSON.stringify(bad)}`);
  }
  const unsafe = await client.getTikTokLiveRoom({ room_id: 7705498471838665494 }).catch((e) => e);
  assert(unsafe instanceof sdk.VidNavigatorError && unsafe.message.includes('string'), 'getTikTokLiveRoom refuses a room_id number past 2^53');
  assert(calls.length === 0, 'refused calls never reach the API');
  await client.getTikTokLiveRoom({ room_id: 123 });
  assert(calls.pop().data.room_id === '123', 'getTikTokLiveRoom sends a small numeric room_id as a string');

  // The timeout is raised for this call only, and never lowered.
  const seen = [];
  const real = new sdk.VidNavigatorClient({ apiKey: 'k', axiosConfig: { timeout: 30000 } });
  real.client.request = async (config) => { seen.push(config.timeout); return { data: reply }; };
  await real.getTikTokLiveRoom({ url: 'https://www.tiktok.com/@streamer/live' });
  real.client.defaults.timeout = 300000;
  await real.getTikTokLiveRoom({ url: 'https://www.tiktok.com/@streamer/live' });
  real.client.defaults.timeout = 0;
  await real.getTikTokLiveRoom({ url: 'https://www.tiktok.com/@streamer/live' });
  assert(seen[0] === 120000 && seen[1] === 300000 && seen[2] === undefined, `LIVE room timeout raised, never lowered (${seen})`);
}

async function runUsageTests() {
  const client = new sdk.VidNavigatorClient({ apiKey: 'test-key' });
  client.request = async (method, url) => {
    assert(method === 'GET' && url === '/usage', 'getUsage calls GET /usage');
    return {
      status: 'success',
      data: { ...USAGE_DATA_JSON, usage_period: { start: null, end: null }, billing_period: { start: null, end: null, interval: null } },
    };
  };
  const usage = await client.getUsage();
  assert(usage.usage.sceneAnalysisHour.used === 0.25 && usage.usage.frameAnalysis.used === 120, 'getUsage returns frameAnalysis and sceneAnalysisHour');
  assert(usage.usagePeriod.start === undefined && usage.billingPeriod.end === undefined, 'getUsage: null period dates are undefined');
}

runClientMethodTests()
  .then(runUsageTests)
  .then(runLiveRoomTests)
  .then(runOperationTests)
  .then(runWatchTests)
  .then(runScenesTests)
  .then(runPollingTests)
  .then(runErrorMappingTests)
  .then(() => process.exit(summary()))
  .catch((e) => {
    fail('client method tests', e.stack || e.message);
    process.exit(summary());
  });
