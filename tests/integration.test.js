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

  // ── YouTube transcript ──
  console.log('--- getYouTubeTranscript ---');
  try {
    const { video_info, transcript } = await client.getYouTubeTranscript({
      video_url: TEST_YOUTUBE_URL,
      language: 'en',
    });
    assert(video_info instanceof sdk.VideoInfo, 'getYouTubeTranscript VideoInfo');
    assert(Array.isArray(transcript) && transcript.length > 0, 'getYouTubeTranscript segments');
    assert(transcript[0] instanceof sdk.TranscriptSegment, 'getYouTubeTranscript segment type');
  } catch (e) { fail('getYouTubeTranscript', e.message); }

  // ── YouTube transcript_text ──
  console.log('--- getYouTubeTranscript (transcript_text) ---');
  try {
    const { transcript } = await client.getYouTubeTranscript({
      video_url: TEST_YOUTUBE_URL,
      transcript_text: true,
    });
    assert(typeof transcript === 'string' && transcript.length > 0, 'transcript_text returns string');
  } catch (e) { fail('transcript_text', e.message); }

  // ── BadRequest on YouTube endpoint ──
  console.log('--- BadRequestError (YouTube) ---');
  try {
    await client.getYouTubeTranscript({ video_url: 'not-a-url' });
    fail('BadRequestError thrown');
  } catch (e) {
    assert(e instanceof sdk.BadRequestError, 'BadRequestError thrown');
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

  // ── Extract video ──
  console.log('--- extractVideoData ---');
  try {
    const extraction = await client.extractVideoData({
      video_url: TEST_YOUTUBE_URL,
      schema: {
        topic: { type: 'String', description: 'Main topic in a few words' },
      },
      include_usage: true,
    });
    assert(extraction.data && typeof extraction.data.topic === 'string', 'extractVideoData data.topic');
    assert(extraction.video_info instanceof sdk.VideoInfo, 'extractVideoData video_info');
    assert(extraction.usage instanceof sdk.ExtractionTokenUsage, 'extractVideoData usage');
    assert(typeof extraction.usage.total_tokens === 'number', 'extractVideoData total_tokens');
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

  // ── Optional TikTok profile scrape ──
  if (process.env.TEST_TIKTOK_PROFILE_URL) {
    console.log('--- submitTikTokProfileScrape / getTikTokProfileScrape ---');
    try {
      await withTimeout((async () => {
        const submitted = await client.submitTikTokProfileScrape({
          profile_url: process.env.TEST_TIKTOK_PROFILE_URL,
          max_posts: 2,
        });
        assert(submitted instanceof sdk.TikTokProfileScrapeSubmission, 'submitTikTokProfileScrape response type');
        assert(typeof submitted.task_id === 'string' && submitted.task_id.length > 0, 'submitTikTokProfileScrape task_id');

        let scrape = await client.getTikTokProfileScrape(submitted.task_id, { limit: 1 });
        assert(scrape instanceof sdk.TikTokProfileTask, 'getTikTokProfileScrape response type');

        const started = Date.now();
        while (scrape.task_status === 'processing') {
          console.log(`    polling TikTok scrape ${submitted.task_id}: processing (${Math.round((Date.now() - started) / 1000)}s)`);
          await sleep(5000);
          scrape = await client.getTikTokProfileScrape(submitted.task_id, { limit: 1 });
        }

        assert(scrape.task_status === 'completed', 'TikTok scrape completed');
        assert(Array.isArray(scrape.videos), 'getTikTokProfileScrape videos array');
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
  } else {
    console.log('--- TikTok profile scrape skipped (TEST_TIKTOK_PROFILE_URL not set) ---');
  }

  // ── Optional tweet statement extraction ──
  if (process.env.TEST_TWEET_ID) {
    console.log('--- getTweetStatement ---');
    try {
      const statement = await client.getTweetStatement({ tweet_id: process.env.TEST_TWEET_ID });
      assert(statement instanceof sdk.TweetStatement, 'getTweetStatement response type');
      assert(typeof statement.final_statement === 'string', 'getTweetStatement final_statement');
      assert(typeof statement.statement_query === 'string', 'getTweetStatement statement_query');
    } catch (e) { fail('getTweetStatement', e.message); }
  } else {
    console.log('--- getTweetStatement skipped (TEST_TWEET_ID not set) ---');
  }

  // ── Search videos (with timeout) ──
  console.log('--- searchVideos ---');
  try {
    const sr = await withTimeout(
      client.searchVideos({ query: 'nodejs tip' }),
      60000, 'searchVideos'
    );
    assert(typeof sr.query === 'string', 'searchVideos echoed query');
    assert(typeof sr.total_found === 'number', 'searchVideos total_found');
    assert(Array.isArray(sr.results), 'searchVideos results array');
    if (sr.results.length > 0) {
      assert(sr.results[0] instanceof sdk.VideoSearchResult, 'searchVideos result type');
    }
  } catch (e) { fail('searchVideos', e.message); }

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
