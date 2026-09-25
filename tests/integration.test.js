/**
 * Integration tests — calls the live API for every online-video endpoint.
 * Requires VIDNAVIGATOR_API_KEY in .env.
 * Run: node tests/integration.test.js
 */
const http = require('http');
const https = require('https');
const {
  sdk, makeClient, requireApiKey, withTimeout, logTranscriptPreview,
  assert, pass, fail, summary,
  TEST_YOUTUBE_URL, TEST_INSTAGRAM_REEL,
} = require('./helpers');

requireApiKey();
const client = makeClient();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getJson(url) {
  const transport = url.startsWith('https:') ? https : http;
  return new Promise((resolve, reject) => {
    const req = transport.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        getJson(res.headers.location).then(resolve, reject);
        return;
      }

      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`GET ${url} failed with status ${res.statusCode}: ${body.slice(0, 200)}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
  });
}

async function run() {
  console.log('=== Integration Tests ===\n');

  // ── Health ──
  console.log('--- healthCheck ---');
  try {
    const h = await client.healthCheck();
    assert(h.status === 'success', 'healthCheck status');
    assert(typeof h.version === 'string', 'healthCheck version');
  } catch (e) { fail('healthCheck', e.message); }

  // ── Usage ──
  console.log('--- getUsage ---');
  try {
    const u = await client.getUsage();
    assert(u instanceof sdk.UsageData, 'getUsage returns UsageData');
    assert(u.credits instanceof sdk.CreditsInfo, 'getUsage credits field');
    const activityCounts = [
      u.usage.standardRequest,
      u.usage.residentialRequest,
      u.usage.searchRequest,
      u.usage.analysisRequest,
      u.usage.transcriptionHour,
      u.usage.videoTranscripts,
      u.usage.youtubeTranscripts,
      u.usage.videoSearches,
      u.usage.videoAnalyses,
      u.usage.videoUploads,
    ].filter(Boolean);
    assert(activityCounts.some((count) => count instanceof sdk.ActivityCount), 'getUsage activity count');
    assert(u.channelsIndexed instanceof sdk.CapacityMetric, 'getUsage channelsIndexed');
  } catch (e) { fail('getUsage', e.message); }

  // ── Auth error ──
  console.log('--- AuthenticationError ---');
  try {
    const bad = makeClient('invalid-key');
    await bad.getUsage();
    fail('AuthenticationError thrown');
  } catch (e) {
    assert(e instanceof sdk.AuthenticationError, 'AuthenticationError thrown');
  }

  // ── Transcript (single /transcript endpoint) ──
  console.log('--- getTranscript ---');
  try {
    const { video_info, transcript } = await client.getTranscript({
      video_url: TEST_YOUTUBE_URL,
      language: 'en',
    });
    assert(video_info instanceof sdk.VideoInfo, 'getTranscript VideoInfo');
    assert(Array.isArray(transcript) && transcript.length > 0, 'getTranscript segments');
    assert(transcript[0] instanceof sdk.TranscriptSegment, 'getTranscript segment type');
  } catch (e) { fail('getTranscript', e.message); }

  // ── Transcript with per-call usage ──
  console.log('--- getTranscript (include_usage) ---');
  try {
    const { transcript, usage } = await client.getTranscript({
      video_url: TEST_YOUTUBE_URL,
      transcript_text: true,
      include_usage: true,
    });
    assert(typeof transcript === 'string' && transcript.length > 0, 'transcript_text returns string');
    assert(usage instanceof sdk.UsageBlock, 'getTranscript usage is UsageBlock');
    assert(Array.isArray(usage.charges) && usage.charges.length > 0, 'getTranscript usage.charges populated');
    assert(typeof usage.total_credits === 'number', 'getTranscript usage.total_credits');
  } catch (e) { fail('getTranscript (include_usage)', e.message); }

  // ── Invalid URL on transcript endpoint ──
  // The single /transcript endpoint auto-detects the platform, so a malformed URL
  // surfaces as a 400 (bad request) or 404 (video unavailable) depending on routing.
  console.log('--- transcript error (invalid URL) ---');
  try {
    await client.getTranscript({ video_url: 'not-a-url' });
    fail('transcript invalid URL throws');
  } catch (e) {
    assert(
      e instanceof sdk.BadRequestError || e instanceof sdk.NotFoundError,
      'transcript invalid URL throws BadRequestError or NotFoundError',
      `got ${e && e.name}`
    );
  }

  // ── Transcribe ──
  console.log('--- transcribeVideo ---');
  try {
    const result = await client.transcribeVideo({ video_url: TEST_INSTAGRAM_REEL });
    if ('videos' in result) {
      assert(Array.isArray(result.videos), 'transcribeVideo carousel');
    } else {
      assert(result.video_info instanceof sdk.VideoInfo, 'transcribeVideo VideoInfo');
      const t = result.transcript;
      assert((typeof t === 'string' && t.length > 0) || (Array.isArray(t) && t.length > 0), 'transcribeVideo transcript');
    }
  } catch (e) { fail('transcribeVideo', e.message); }

  // ── transcribe: blocking one-liner (POST /transcribe/async + polling) ──
  console.log('--- transcribe (blocking) ---');
  try {
    const result = await client.transcribe(TEST_INSTAGRAM_REEL, { include_usage: true, timeoutMs: 300000 });
    if ('videos' in result) {
      assert(Array.isArray(result.videos), 'transcribe carousel');
    } else {
      assert(result.video_info instanceof sdk.VideoInfo, 'transcribe result.video_info');
      const t = result.transcript;
      assert((typeof t === 'string' && t.length > 0) || (Array.isArray(t) && t.length > 0), 'transcribe result.transcript');
    }
    assert(result.usage instanceof sdk.UsageBlock, 'transcribe result.usage (include_usage read on the poll)');
  } catch (e) { fail('transcribe (blocking)', `${e.name}: ${e.message} task_id=${e.task_id}`); }

  // ── transcribe.submit: non-blocking handle ──
  console.log('--- transcribe.submit / Job ---');
  try {
    const job = await client.transcribe.submit(
      { video_url: TEST_INSTAGRAM_REEL, transcript_text: true, webhook_url: '' }, // opt out of any account default webhook
      { include_usage: true }
    );
    assert(job instanceof sdk.Job, 'transcribe.submit returns Job');
    assert(typeof job.task_id === 'string' && job.task_id.length > 0, 'Job.task_id');
    assert(job.job_type === 'transcribe', 'Job.job_type');
    assert(job.webhook_url === null, 'Job.webhook_url null when opted out (polling still works)');
    assert(typeof job.check_status_url === 'string' && job.check_status_url.endsWith(job.task_id), 'Job.check_status_url');
    const status = await job.status();
    assert(['processing', 'completed'].includes(status), 'Job.status() returns a task_status', status);
    const result = await job.result({ timeoutMs: 300000 });
    assert(typeof result.transcript === 'string' && result.transcript.length > 0, 'Job.result() transcript_text string');
    assert(result.usage instanceof sdk.UsageBlock, 'Job.result() usage');

    // Results stay readable: reattach by task_id and read again.
    const resumed = await client.transcribe.resume(job.task_id).result({ timeoutMs: 300000 });
    assert(resumed.transcript === result.transcript, 'resume(task_id).result() re-reads the same result');
  } catch (e) { fail('transcribe.submit', `${e.name}: ${e.message} task_id=${e.task_id}`); }

  // ── Timeout keeps the task_id; the job is recoverable ──
  // Uses an extraction (not a cached transcription) so the first poll is still `processing`.
  console.log('--- timeout → resume ---');
  try {
    let taskId;
    const input = {
      video_url: TEST_YOUTUBE_URL,
      schema: { topic: { type: 'String', description: 'Main topic in a few words' } },
      transcribe: false,
    };
    try {
      await client.extractVideo(input, { timeoutMs: 1 });
      pass('extraction finished before a 1ms timeout; timeout path not exercised this run');
    } catch (e) {
      assert(e instanceof sdk.TaskTimeoutError, 'tiny timeout throws TaskTimeoutError', e && e.name);
      assert(typeof e.task_id === 'string' && e.task_id.length > 0, 'TaskTimeoutError carries task_id');
      taskId = e.task_id;
    }
    if (taskId) {
      const recovered = await client.extractVideo.resume(taskId).result({ timeoutMs: 180000 });
      assert(typeof recovered.data.topic === 'string', 'job resumed from TaskTimeoutError.task_id completes');
    }
  } catch (e) { fail('timeout → resume', `${e.name}: ${e.message}`); }

  console.log('--- resume (unknown task) ---');
  try {
    await client.transcribe.resume('00000000-0000-0000-0000-000000000000').result();
    fail('unknown task throws NotFoundError');
  } catch (e) {
    assert(e instanceof sdk.NotFoundError, 'unknown task throws NotFoundError', e && e.name);
    assert(e.error_code === 'task_not_found', 'unknown task error_code task_not_found', e && e.error_code);
    assert(e.task_id === '00000000-0000-0000-0000-000000000000', 'poll error carries task_id');
  }

  console.log('--- transcribe.submit (private webhook_url rejected) ---');
  try {
    await client.transcribe.submit({ video_url: TEST_INSTAGRAM_REEL, webhook_url: 'http://127.0.0.1/hook' });
    fail('private webhook_url rejected');
  } catch (e) {
    assert(e instanceof sdk.BadRequestError, 'private webhook_url rejected with BadRequestError', e && `${e.name}: ${e.message}`);
    assert(e.task_id === undefined, 'rejected submit has no task_id');
  }

  // ── Analyze video ──
  console.log('--- analyzeVideo ---');
  try {
    const { video_info, transcript, transcript_analysis } = await client.analyzeVideo({
      video_url: TEST_YOUTUBE_URL,
      query: 'What is this video about?',
    });
    assert(video_info instanceof sdk.VideoInfo, 'analyzeVideo VideoInfo');
    assert(transcript_analysis instanceof sdk.AnalysisResult, 'analyzeVideo AnalysisResult');
    assert(typeof transcript_analysis.summary === 'string', 'analyzeVideo summary');
  } catch (e) { fail('analyzeVideo', e.message); }

  // ── Namespaces ──
  console.log('--- getNamespaces ---');
  try {
    const nsList = await client.getNamespaces();
    assert(Array.isArray(nsList), 'getNamespaces returns array');
    if (nsList.length > 0) {
      assert(nsList[0] instanceof sdk.Namespace, 'getNamespaces items are Namespace');
    }
    pass('getNamespaces OK (' + nsList.length + ' found)');
  } catch (e) { fail('getNamespaces', e.message); }

  // ── Extract video with per-call usage (tokens via analysis_tokens) ──
  console.log('--- extractVideoData (include_usage) ---');
  try {
    const extraction = await client.extractVideoData({
      video_url: TEST_YOUTUBE_URL,
      schema: {
        topic: { type: 'String', description: 'Main topic in a few words' },
      },
      include_usage: true,
    });
    assert(extraction.data && typeof extraction.data.topic === 'string', 'extractVideoData data.topic');
    assert(extraction.video_info === undefined, 'extractVideoData has no video_info (async API)');
    assert(extraction.usage instanceof sdk.UsageBlock, 'extractVideoData usage is UsageBlock');
    // Live API returns charges-based usage; tokens live under the analysis_request charge.
    const tokens = extraction.usage.analysis_tokens;
    assert(tokens && typeof tokens.total_tokens === 'number', 'extractVideoData analysis_tokens.total_tokens');
    assert(!!extraction.usage.charge_for('analysis_request'), 'extractVideoData has analysis_request charge');
  } catch (e) { fail('extractVideoData', e.message); }

  // ── Extract video (no usage) ──
  console.log('--- extractVideoData (no usage) ---');
  try {
    const light = await client.extractVideoData({
      video_url: TEST_YOUTUBE_URL,
      schema: { phrase: { type: 'String', description: 'One-word summary' } },
      include_usage: false,
    });
    assert(light.usage === undefined, 'extractVideoData no usage');
  } catch (e) { fail('extractVideoData (no usage)', e.message); }

  // ── extractVideo: blocking + handle ──
  console.log('--- extractVideo ---');
  try {
    const { data, usage } = await client.extractVideo(
      {
        video_url: TEST_YOUTUBE_URL,
        schema: { topic: { type: 'String', description: 'Main topic in a few words' } },
        transcribe: false,
      },
      { include_usage: true, timeoutMs: 180000 }
    );
    assert(data && typeof data.topic === 'string', 'extractVideo data.topic');
    assert(usage instanceof sdk.UsageBlock && !!usage.charge_for('analysis_request'), 'extractVideo usage analysis_request');

    const job = await client.extractVideo.submit({
      video_url: TEST_YOUTUBE_URL,
      schema: { topic: { type: 'String', description: 'Main topic in a few words' } },
      transcribe: false,
      webhook_url: '',
    });
    assert(job.job_type === 'extract_video', 'extractVideo.submit job_type');
    const final = await job.wait({ timeoutMs: 180000 });
    assert(final.task_status === 'completed', 'extractVideo Job.wait() completed');
    assert(final.request && final.request.video_url === TEST_YOUTUBE_URL, 'extractVideo task request echo');
  } catch (e) { fail('extractVideo', `${e.name}: ${e.message} task_id=${e.task_id}`); }

  console.log('--- extractVideo (invalid schema rejected at submit) ---');
  try {
    await client.extractVideo({
      video_url: TEST_YOUTUBE_URL,
      schema: { bad: { type: 'NotAType' } },
      transcribe: false,
    });
    fail('extractVideo invalid schema throws BadRequestError');
  } catch (e) {
    assert(e instanceof sdk.BadRequestError, 'extractVideo invalid schema throws BadRequestError', e && `${e.name}: ${e.message}`);
  }

  // ── Optional TikTok profile scrape ──
  if (process.env.TEST_TIKTOK_PROFILE_URL) {
    console.log('--- submitTikTokProfileScrape / getTikTokProfileScrape ---');
    try {
      await withTimeout((async () => {
        const submitted = await client.submitTikTokProfileScrape({
          profile_url: process.env.TEST_TIKTOK_PROFILE_URL,
          max_posts: 2,
          webhook_url: '',
        });
        assert(submitted instanceof sdk.TikTokProfileScrapeSubmission, 'submitTikTokProfileScrape response type');
        assert(submitted.webhook_url === null || submitted.webhook_url === undefined, 'submitTikTokProfileScrape webhook opt-out');
        assert(typeof submitted.task_id === 'string' && submitted.task_id.length > 0, 'submitTikTokProfileScrape task_id');

        let scrape = await client.getTikTokProfileScrape(submitted.task_id, { limit: 1, include_usage: true });
        assert(scrape instanceof sdk.TikTokProfileTask, 'getTikTokProfileScrape response type');

        const started = Date.now();
        while (scrape.task_status === 'processing') {
          console.log(`    polling TikTok scrape ${submitted.task_id}: processing (${Math.round((Date.now() - started) / 1000)}s)`);
          await sleep(5000);
          scrape = await client.getTikTokProfileScrape(submitted.task_id, { limit: 1, include_usage: true });
        }

        assert(scrape.task_status === 'completed', 'TikTok scrape completed');
        assert(Array.isArray(scrape.videos), 'getTikTokProfileScrape videos array');
        if (scrape.usage) {
          assert(scrape.usage instanceof sdk.UsageBlock, 'getTikTokProfileScrape usage is UsageBlock on completion');
        }
        assert(scrape.pagination && typeof scrape.pagination.total_items === 'number', 'TikTok scrape pagination');
        if (scrape.videos.length > 0) {
          const [video] = scrape.videos;
          assert(video instanceof sdk.TikTokVideo, 'TikTok scrape video type');
          if (video.published_at !== null && video.published_at !== undefined) {
            assert(video.published_at instanceof Date, 'TikTok video published_at Date');
          }
          if (video.views !== null && video.views !== undefined) {
            assert(Number.isInteger(video.views), 'TikTok video views integer');
          }
          if (video.likes !== null && video.likes !== undefined) {
            assert(Number.isInteger(video.likes), 'TikTok video likes integer');
          }
        }

        if (scrape.pagination?.next_cursor) {
          const secondPage = await client.getTikTokProfileScrape(submitted.task_id, {
            limit: 1,
            cursor: scrape.pagination.next_cursor,
          });
          assert(secondPage instanceof sdk.TikTokProfileTask, 'getTikTokProfileScrape cursor page type');
          assert(Array.isArray(secondPage.videos), 'getTikTokProfileScrape cursor page videos');
        }

        if (scrape.download_url) {
          const fullProfile = await getJson(scrape.download_url);
          assert(Array.isArray(fullProfile.videos), 'TikTok download_url videos array');
        } else {
          pass('TikTok download_url not configured; paginated result verified');
        }
      })(), 600000, 'TikTok profile scrape');
    } catch (e) { fail('TikTok profile scrape', e.message); }

    console.log('--- tiktokProfile (blocking, all pages) ---');
    try {
      const task = await client.tiktokProfile(
        { profile_url: process.env.TEST_TIKTOK_PROFILE_URL, max_posts: 3, webhook_url: '' },
        { include_usage: true, timeoutMs: 600000 }
      );
      assert(task instanceof sdk.TikTokProfileTask && task.task_status === 'completed', 'tiktokProfile completed');
      assert(task.videos.length > 0 && task.videos.length <= 3, 'tiktokProfile collected videos', String(task.videos.length));
      assert(task.pagination.has_next === false, 'tiktokProfile merged all pages');
    } catch (e) { fail('tiktokProfile', `${e.name}: ${e.message} task_id=${e.task_id}`); }
  } else {
    console.log('--- TikTok profile scrape skipped (TEST_TIKTOK_PROFILE_URL not set) ---');
  }

  // ── Optional TikTok keyword search ──
  if (process.env.TEST_TIKTOK_SEARCH_QUERY) {
    console.log('--- submitTikTokSearch / getTikTokSearch ---');
    try {
      await withTimeout((async () => {
        const submitted = await client.submitTikTokSearch({
          query: process.env.TEST_TIKTOK_SEARCH_QUERY,
          max_results: 5,
          parallel_search_slices: 1,
          sort_by: 'newest',
          published_within: 'this_month',
          webhook_url: '',
        });
        assert(submitted instanceof sdk.TikTokSearchSubmission, 'submitTikTokSearch response type');
        assert(submitted.webhook_url === null || submitted.webhook_url === undefined, 'submitTikTokSearch webhook opt-out');
        assert(typeof submitted.task_id === 'string' && submitted.task_id.length > 0, 'submitTikTokSearch task_id');

        let search = await client.getTikTokSearch(submitted.task_id, { limit: 2, include_usage: true });
        assert(search instanceof sdk.TikTokSearchTask, 'getTikTokSearch response type');

        const started = Date.now();
        while (search.task_status === 'processing') {
          console.log(`    polling TikTok search ${submitted.task_id}: processing (${Math.round((Date.now() - started) / 1000)}s)`);
          await sleep(5000);
          search = await client.getTikTokSearch(submitted.task_id, { limit: 2, include_usage: true });
        }

        assert(search.task_status === 'completed', 'TikTok search completed');
        if (search.stats && search.stats.sort_by) {
          assert(search.stats.sort_by === 'newest', 'TikTok search stats.sort_by echoes request');
        }
        assert(Array.isArray(search.results), 'getTikTokSearch results array');
        if (search.usage) {
          assert(search.usage instanceof sdk.UsageBlock, 'getTikTokSearch usage is UsageBlock on completion');
        }
        assert(search.pagination && typeof search.pagination.total_items === 'number', 'TikTok search pagination');
        if (search.results.length > 0) {
          const [result] = search.results;
          assert(result instanceof sdk.TikTokSearchResult, 'TikTok search result type');
          if (result.published_at !== null && result.published_at !== undefined) {
            assert(result.published_at instanceof Date, 'TikTok search published_at Date');
          }
        }

        if (search.pagination?.next_cursor) {
          const secondPage = await client.getTikTokSearch(submitted.task_id, {
            limit: 2,
            cursor: search.pagination.next_cursor,
          });
          assert(secondPage instanceof sdk.TikTokSearchTask, 'getTikTokSearch cursor page type');
          assert(Array.isArray(secondPage.results), 'getTikTokSearch cursor page results');
        }

        if (search.download_url) {
          const fullSearch = await getJson(search.download_url);
          assert(Array.isArray(fullSearch.results), 'TikTok search download_url results array');
        } else {
          pass('TikTok search download_url not configured; paginated result verified');
        }
      })(), 600000, 'TikTok keyword search');
    } catch (e) { fail('TikTok keyword search', e.message); }

    console.log('--- tiktokSearch (blocking, all pages) ---');
    try {
      const task = await client.tiktokSearch(
        { query: process.env.TEST_TIKTOK_SEARCH_QUERY, max_results: 5, webhook_url: '' },
        { timeoutMs: 600000 }
      );
      assert(task instanceof sdk.TikTokSearchTask && task.task_status === 'completed', 'tiktokSearch completed');
      assert(Array.isArray(task.results), 'tiktokSearch results array');
      if (task.results.length > 0) assert(task.results[0] instanceof sdk.TikTokSearchResult, 'tiktokSearch result type');
    } catch (e) { fail('tiktokSearch', `${e.name}: ${e.message} task_id=${e.task_id}`); }
  } else {
    console.log('--- TikTok keyword search skipped (TEST_TIKTOK_SEARCH_QUERY not set) ---');
  }

  // ── Optional tweet statement extraction ──
  if (process.env.TEST_TWEET_ID) {
    console.log('--- getTweetStatement ---');
    try {
      const statement = await client.getTweetStatement({ tweet_id: process.env.TEST_TWEET_ID });
      assert(statement instanceof sdk.TweetStatement, 'getTweetStatement response type');
      assert(typeof statement.final_statement === 'string', 'getTweetStatement final_statement');
      assert(typeof statement.detailed_analysis === 'string', 'getTweetStatement detailed_analysis');
    } catch (e) { fail('getTweetStatement', e.message); }

    console.log('--- tweetStatement (handle) ---');
    try {
      const job = await client.tweetStatement.submit({ tweet_id: process.env.TEST_TWEET_ID, webhook_url: '' }, { include_usage: true });
      assert(job.job_type === 'tweet_statement', 'tweetStatement.submit job_type');
      const statement = await job.result({ timeoutMs: 300000 });
      assert(statement instanceof sdk.TweetStatement, 'tweetStatement result is TweetStatement');
      assert(typeof statement.final_statement === 'string', 'tweetStatement final_statement');
      assert(statement.usage instanceof sdk.UsageBlock, 'tweetStatement usage');
    } catch (e) { fail('tweetStatement', `${e.name}: ${e.message} task_id=${e.task_id}`); }
  } else {
    console.log('--- getTweetStatement skipped (TEST_TWEET_ID not set) ---');
  }

  // ── Search YouTube (with max_results + timeout) ──
  console.log('--- searchYouTube ---');
  try {
    const sr = await withTimeout(
      client.searchYouTube({ query: 'nodejs tip', max_results: 2, focus: 'relevance', include_usage: true }),
      120000, 'searchYouTube'
    );
    assert(typeof sr.query === 'string', 'searchYouTube echoed query');
    assert(typeof sr.total_found === 'number', 'searchYouTube total_found');
    assert(Array.isArray(sr.results), 'searchYouTube results array');
    assert(sr.results.length <= 2, 'searchYouTube respects max_results');
    if (sr.results.length > 0) {
      assert(sr.results[0] instanceof sdk.VideoSearchResult, 'searchYouTube result type');
    }
    if (sr.usage) {
      assert(sr.usage instanceof sdk.UsageBlock, 'searchYouTube usage is UsageBlock');
    }
  } catch (e) { fail('searchYouTube', e.message); }

  // ── Search files (with timeout) ──
  console.log('--- searchFiles ---');
  try {
    const sf = await withTimeout(
      client.searchFiles({ query: 'test' }),
      60000, 'searchFiles'
    );
    assert(typeof sf.query === 'string', 'searchFiles echoed query');
    assert(typeof sf.total_found === 'number', 'searchFiles total_found');
    assert(Array.isArray(sf.results), 'searchFiles results array');
  } catch (e) { fail('searchFiles', e.message); }

  // ── NotFoundError ──
  console.log('--- NotFoundError ---');
  try {
    await client.getFile('nonexistent-id');
    fail('NotFoundError thrown');
  } catch (e) {
    assert(e instanceof sdk.NotFoundError, 'NotFoundError thrown');
  }

  // ── Files list ──
  console.log('--- getFiles ---');
  try {
    const fl = await client.getFiles({ limit: 3 });
    assert(typeof fl.total_count === 'number', 'getFiles total_count');
    assert(typeof fl.limit === 'number', 'getFiles limit');
    assert(typeof fl.offset === 'number', 'getFiles offset');
    assert(typeof fl.has_more === 'boolean', 'getFiles has_more');
    assert(Array.isArray(fl.files), 'getFiles files array');
  } catch (e) { fail('getFiles', e.message); }

  process.exit(summary());
}

run().catch((e) => { console.error('Fatal:', e); process.exit(1); });
