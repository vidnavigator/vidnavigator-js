/**
 * File lifecycle tests — upload, poll, get, analyze, extract, URL, delete.
 * Uses media/video-test.mp4.
 * Requires VIDNAVIGATOR_API_KEY in .env.
 * Run: node tests/files.test.js
 */
const fs = require('fs');
const {
  sdk, makeClient, requireApiKey, withTimeout,
  assert, pass, fail, summary,
  TEST_VIDEO_FILE,
} = require('./helpers');

requireApiKey();
const client = makeClient();

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForCompletion(fileId, timeoutMs = 300000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { file_info } = await client.getFile(fileId);
    if (file_info.status === 'completed') return file_info;
    if (file_info.status === 'failed') throw new Error(`File ${fileId} failed: ${file_info.error_message}`);
    if (file_info.status === 'cancelled') throw new Error(`File ${fileId} was cancelled`);
    console.log(`    polling ${fileId}: ${file_info.status} (${Math.round((Date.now() - start) / 1000)}s)`);
    await sleep(5000);
  }
  throw new Error(`Timed out waiting for file ${fileId} to complete`);
}

async function run() {
  console.log('=== File Lifecycle Tests ===\n');

  if (!fs.existsSync(TEST_VIDEO_FILE)) {
    console.error('Test file not found:', TEST_VIDEO_FILE);
    console.error('Place a video file at media/video-test.mp4 and re-run.');
    process.exit(1);
  }
  console.log('Using test file:', TEST_VIDEO_FILE);
  console.log('Size:', (fs.statSync(TEST_VIDEO_FILE).size / 1024 / 1024).toFixed(2), 'MB\n');

  let uploadedFileId;

  // ── Upload ──
  console.log('--- uploadFile ---');
  try {
    const result = await withTimeout(
      client.uploadFile({ filePath: TEST_VIDEO_FILE, wait_for_completion: false }),
      120000, 'uploadFile'
    );
    assert(typeof result.file_id === 'string' && result.file_id.length > 0, 'uploadFile returns file_id');
    assert(typeof result.file_name === 'string', 'uploadFile returns file_name');
    assert(typeof result.file_status === 'string', 'uploadFile returns file_status');
    assert(typeof result.message === 'string', 'uploadFile returns message');
    if (result.status === 'success') {
      assert(result.file_info instanceof sdk.FileInfo, 'uploadFile success has file_info');
    } else {
      pass('uploadFile accepted (202): ' + result.message);
    }
    uploadedFileId = result.file_id;
    console.log('  file_id:', uploadedFileId, '  status:', result.file_status);
  } catch (e) {
    if (e instanceof sdk.ServerError) {
      console.log('  SKIP  uploadFile: server returned 500 — API may be under load. Skipping file lifecycle tests.');
      console.log('  Error:', e.error_message);
      process.exit(summary());
    }
    fail('uploadFile', e.message);
  }

  if (!uploadedFileId) {
    console.log('\nUpload failed — skipping remaining file tests.');
    process.exit(summary());
  }

  // ── Wait for processing ──
  console.log('--- wait for processing ---');
  let completedFile;
  try {
    completedFile = await waitForCompletion(uploadedFileId);
    assert(completedFile.status === 'completed', 'file reached completed status');
    assert(completedFile.has_transcript === true, 'file has transcript');
    console.log('  completed:', completedFile.name, completedFile.duration + 's');
  } catch (e) { fail('waitForCompletion', e.message); }

  // ── getFile ──
  console.log('--- getFile ---');
  try {
    const { file_info, transcript } = await client.getFile(uploadedFileId);
    assert(file_info instanceof sdk.FileInfo, 'getFile returns FileInfo');
    assert(file_info.id === uploadedFileId, 'getFile correct id');
    if (file_info.has_transcript) {
      assert(transcript !== undefined, 'getFile includes transcript');
    }
  } catch (e) { fail('getFile', e.message); }

  // ── getFile with transcript_text ──
  console.log('--- getFile (transcript_text=true) ---');
  try {
    const { transcript } = await client.getFile(uploadedFileId, { transcript_text: true });
    assert(typeof transcript === 'string' && transcript.length > 0, 'getFile transcript_text returns string');
  } catch (e) { fail('getFile transcript_text', e.message); }

  // ── getFileUrl ──
  console.log('--- getFileUrl ---');
  try {
    const { file_id, file_url } = await client.getFileUrl(uploadedFileId);
    assert(file_id === uploadedFileId, 'getFileUrl echoed id');
    assert(typeof file_url === 'string' && file_url.startsWith('http'), 'getFileUrl returns URL');
  } catch (e) { fail('getFileUrl', e.message); }

  // ── analyzeFile ──
  console.log('--- analyzeFile ---');
  try {
    const { file_info, transcript, transcript_analysis } = await withTimeout(
      client.analyzeFile({ file_id: uploadedFileId, query: 'What is discussed?' }),
      120000, 'analyzeFile'
    );
    assert(file_info instanceof sdk.FileInfo, 'analyzeFile FileInfo');
    assert(transcript_analysis instanceof sdk.AnalysisResult, 'analyzeFile AnalysisResult');
    assert(typeof transcript_analysis.summary === 'string', 'analyzeFile summary');
    console.log('  summary:', (transcript_analysis.summary || '').slice(0, 120) + '...');
  } catch (e) { fail('analyzeFile', e.message); }

  // ── extractFileData ──
  console.log('--- extractFileData ---');
  try {
    const result = await withTimeout(
      client.extractFileData({
        file_id: uploadedFileId,
        schema: {
          summary_line: { type: 'String', description: 'One sentence summary of the file content' },
          language: { type: 'String', description: 'Primary spoken language (ISO code)' },
        },
        what_to_extract: 'Extract a one-line summary and the primary language.',
        include_usage: true,
      }),
      120000, 'extractFileData'
    );
    assert(result.data && typeof result.data.summary_line === 'string', 'extractFileData data.summary_line');
    assert(result.data && typeof result.data.language === 'string', 'extractFileData data.language');
    assert(result.usage instanceof sdk.ExtractionTokenUsage, 'extractFileData usage');
    console.log('  data:', result.data);
    console.log('  tokens:', result.usage.total_tokens);
  } catch (e) { fail('extractFileData', e.message); }

  // ── deleteFile ──
  console.log('--- deleteFile ---');
  try {
    const del = await client.deleteFile(uploadedFileId);
    assert(typeof del.file_id === 'string', 'deleteFile returns file_id');
    assert(typeof del.file_name === 'string', 'deleteFile returns file_name');
    assert(typeof del.message === 'string', 'deleteFile returns message');
    console.log('  deleted:', del.file_id, del.file_name);
  } catch (e) { fail('deleteFile', e.message); }

  // ── Verify deleted ──
  console.log('--- verify deleted ---');
  try {
    await client.getFile(uploadedFileId);
    fail('getFile after delete should throw NotFoundError');
  } catch (e) {
    assert(e instanceof sdk.NotFoundError, 'getFile after delete throws NotFoundError');
  }

  process.exit(summary());
}

run().catch((e) => { console.error('Fatal:', e); process.exit(1); });
