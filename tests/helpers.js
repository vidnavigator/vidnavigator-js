/**
 * Shared test helpers used by unit, integration, and file test suites.
 */
const path = require('path');

const usePackedInstall =
  process.env.VIDNAVIGATOR_TEST_PACK === '1' ||
  process.env.VIDNAVIGATOR_TEST_PACK === 'true';

if (usePackedInstall) {
  console.log(
    '[tests] Using packed SDK: require("vidnavigator") via NODE_PATH\n'
  );
}

const sdk = usePackedInstall ? require('vidnavigator') : require('../vidnavigator');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const MEDIA_DIR = path.resolve(__dirname, 'media');
const TEST_VIDEO_FILE = path.join(MEDIA_DIR, 'video-test.mp4');
const TEST_YOUTUBE_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const TEST_INSTAGRAM_REEL = 'https://www.instagram.com/reel/C86ZvEaqRmo/';

function makeClient(apiKey) {
  return new sdk.VidNavigatorClient({
    apiKey: apiKey || process.env.VIDNAVIGATOR_API_KEY,
  });
}

function requireApiKey() {
  if (!process.env.VIDNAVIGATOR_API_KEY) {
    console.error('Error: VIDNAVIGATOR_API_KEY not set in .env');
    process.exit(1);
  }
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label || 'call'} timed out after ${ms / 1000}s`)),
        ms
      )
    ),
  ]);
}

function logTranscriptPreview(transcript, label, maxSegments = 3) {
  console.log(label || 'Transcript:');
  if (typeof transcript === 'string') {
    console.log(
      `  (plain text, ${transcript.length} chars)`,
      transcript.slice(0, 200) + (transcript.length > 200 ? '...' : '')
    );
  } else if (Array.isArray(transcript)) {
    transcript.slice(0, maxSegments).forEach((seg, i) => {
      console.log(`  ${i + 1}. [${seg.start.toFixed(2)}s - ${seg.end.toFixed(2)}s]: ${seg.text}`);
    });
  }
}

let passCount = 0;
let failCount = 0;

function pass(label) {
  passCount++;
  console.log(`  PASS  ${label}`);
}
function fail(label, detail) {
  failCount++;
  console.error(`  FAIL  ${label}`, detail || '');
}
function assert(cond, label, detail) {
  if (cond) pass(label);
  else fail(label, detail);
}
function summary() {
  console.log(`\n${passCount} passed, ${failCount} failed`);
  return failCount;
}

module.exports = {
  sdk,
  makeClient,
  requireApiKey,
  withTimeout,
  logTranscriptPreview,
  pass,
  fail,
  assert,
  summary,
  MEDIA_DIR,
  TEST_VIDEO_FILE,
  TEST_YOUTUBE_URL,
  TEST_INSTAGRAM_REEL,
};
