/**
 * Answers of the API for the scene features, saved from real calls (a 79-second recipe video, and
 * the same video uploaded as a file) and used by the mocked unit tests.
 *
 * What was changed: the long arrays are cut (30 scenes in the full answers, hence
 * `frames_analyzed: 30`), long texts are shortened, the ids are replaced, and the credit amounts
 * are placeholders: the tests read the quantities. Where the name says "assembled", no saved
 * answer was at hand and the body is put together from the OpenAPI spec.
 */

const VIDEO_URL = 'https://www.dailymotion.com/video/x84243e';
const WHAT_TO_EXTRACT = 'Every ingredient with its quantity';
const FILE_ID = '64a1b2c3d4e5f67890abcdef';
const AUDIO_FILE_ID = '64a1b2c3d4e5f67890abcd00';
const NAMESPACE_ID = '64a1b2c3d4e5f67890abc001';
const EXTRACT_TASK_ID = '550e8400-e29b-41d4-a716-446655440001';

const NO_PICTURE = {
  error: 'frames_not_available',
  message: 'This file has no picture we can read (an audio file, or a video without a video track).',
};

const videoInfo = {
  title: 'Patê de frango cremoso — Receitas TudoGostoso',
  description: 'Perfeito para um lanchinho da tarde ou para ser servido com torradinhas em uma entrada!',
  thumbnail: 'https://s1.dmcdn.net/v/TFIKw1f0z1DrEHVFH/x1080',
  duration: 79,
  views: 122092202,
  likes: 0,
  published_date: '2021-09-09',
  keywords: [],
};

const recipeSchema = {
  type: 'object',
  properties: {
    dish: { type: 'string', description: 'Name of the dish' },
    ingredients: {
      type: 'array',
      description: 'Every ingredient with its quantity',
      items: {
        type: 'object',
        description: 'One ingredient',
        properties: {
          name: { type: 'string', description: 'Name of the ingredient' },
          quantity: { type: 'string', description: 'Quantity, as shown or said' },
        },
      },
    },
  },
};

/** The `data` of POST /extract with include_scenes: the quantities are only written on screen. */
const extractedRecipe = {
  dish: 'PATÊ DE FRANGO CREAMOSO',
  ingredients: [
    { name: 'FRANGO DESFIADO COZIDO', quantity: '500 g' },
    { name: 'MAIONESE', quantity: '300 g' },
    { name: 'REQUEIJÃO', quantity: '250 g' },
  ],
};

/** The `usage` of that extraction. */
const extractVideoUsage = {
  charges: [
    { service_type: 'standard_request', quantity: 1, credits: 1 },
    { service_type: 'transcription_hour', quantity: 0.02194444444, credits: 1 },
    // 79 s of video: two started minutes, in hours.
    { service_type: 'watch_hour', quantity: 0.0333, credits: 1 },
    { service_type: 'analysis_request', quantity: 1, credits: 1, tokens: { prompt_tokens: 1483, completion_tokens: 790, total_tokens: 2273 } },
  ],
  total_credits: 4,
};

/** POST /extract/async (202). */
const extractAsyncSubmit = {
  status: 'success',
  data: {
    task_id: EXTRACT_TASK_ID,
    task_status: 'processing',
    job_type: 'extract_video',
    expires_at: '2026-11-16T14:13:44.387431+00:00',
    check_status_url: `/v1/extract/${EXTRACT_TASK_ID}`,
    webhook_url: null,
    message: 'Job started. Poll check_status_url for the result.',
    docs_url: 'https://docs.vidnavigator.com/guides/async-jobs',
  },
};

/** GET /extract/{task_id} of an extraction with include_scenes that failed. */
const extractAsyncFailed = {
  status: 'success',
  data: {
    task_id: EXTRACT_TASK_ID,
    task_status: 'failed',
    job_type: 'extract_video',
    request: {
      video_url: 'https://www.youtube.com/watch?v=P-4LwAuTw7k',
      include_scenes: true,
      schema: { type: 'object', properties: { narration: { type: 'array', description: 'Every sentence of the narration', items: { type: 'string' } } } },
    },
    created_at: '2026-11-16T13:13:44.387000',
    started_at: '2026-11-16T13:13:44.391000',
    completed_at: '2026-11-16T13:13:53.209000',
    expires_at: '2026-11-16T14:13:53.209000',
    check_status_url: `/v1/extract/${EXTRACT_TASK_ID}`,
    webhook: null,
    error: { error: 'input_too_large', message: 'Video transcript is too long to process.', http_status: 400 },
  },
};

const namespaces = [{ id: NAMESPACE_ID, name: 'default' }];

/** POST /upload/file, wait_for_completion, without include_scenes. */
const uploadWithoutScenes = {
  status: 'success',
  file_id: FILE_ID,
  file_name: 'test-scenes-recipe.mp4',
  file_status: 'completed',
  message: 'File uploaded and processed successfully.',
  data: {
    file_info: {
      id: FILE_ID,
      name: 'test-scenes-recipe.mp4',
      size: 8492486,
      type: 'video/mp4',
      duration: 78.421433,
      status: 'completed',
      created_at: '2026-11-16T12:38:21.203Z',
      updated_at: '2026-11-16T12:38:38.829Z',
      has_transcript: true,
      namespace_ids: [NAMESPACE_ID],
      scenes_status: 'none',
      namespaces,
    },
  },
};

/** POST /upload/file with include_scenes, answered while the file is processed. */
const uploadWithScenes = {
  status: 'success',
  file_id: FILE_ID,
  file_name: 'test-scenes-recipe-4k.mp4',
  file_status: 'processing',
  message: 'File uploaded successfully. Processing in progress...',
  data: {
    file_info: {
      id: FILE_ID,
      name: 'test-scenes-recipe-4k.mp4',
      size: 102125767,
      type: 'video/mp4',
      status: 'processing',
      created_at: '2026-11-16T12:40:09.655Z',
      updated_at: '2026-11-16T12:40:09.662Z',
      has_transcript: false,
      namespace_ids: [NAMESPACE_ID],
      scenes_status: 'processing',
      namespaces,
    },
  },
};

const audioFileInfo = {
  id: AUDIO_FILE_ID,
  name: 'test-scenes-recipe-audio.mp3',
  size: 1254859,
  type: 'audio/mp3',
  duration: 78.344127,
  status: 'completed',
  created_at: '2026-11-16T12:40:56.339Z',
  updated_at: '2026-11-16T12:41:10.352Z',
  has_transcript: true,
  namespace_ids: [NAMESPACE_ID],
  scenes_status: 'failed',
  scenes_error: NO_PICTURE,
  namespaces,
};

/** POST /upload/file of an audio file with include_scenes, wait_for_completion. */
const uploadAudioWithScenes = {
  status: 'success',
  file_id: AUDIO_FILE_ID,
  file_name: 'test-scenes-recipe-audio.mp3',
  file_status: 'completed',
  message: 'File uploaded and processed successfully.',
  data: { file_info: audioFileInfo },
};

/** GET /file/{file_id} of that audio file. */
const getAudioFile = {
  status: 'success',
  data: {
    file_info: audioFileInfo,
    transcript: [
      { text: "I'm", start: 0.0, end: 28.86 },
      { text: 'a little bit tired Thank you.', start: 28.86, end: 31.86 },
      { text: 'Thank you.', start: 60.0, end: 61.14 },
    ],
  },
};

/** The `file_info` of the video file once its scenes are analyzed, as extraction returns it. */
const fileInfoWithScenes = {
  id: FILE_ID,
  name: 'test-scenes-recipe.mp4',
  size: 8492486,
  type: 'video/mp4',
  duration: 78.421433,
  status: 'completed',
  created_at: '2026-11-16T12:38:21.203Z',
  updated_at: '2026-11-16T12:38:49.307Z',
  has_transcript: true,
  namespace_ids: [NAMESPACE_ID],
  scenes_status: 'completed',
  frames_analyzed: 30,
};

const fileTranscript = [
  { text: 'Music', start: 0.02, end: 0.66 },
  { text: 'Thank you.', start: 30.02, end: 32.68 },
  { text: 'Thank you.', start: 60, end: 61.14 },
];

const fileScenes = [
  { start: 0, end: 2, description: 'A small green bowl filled with crackers sits on an orange napkin on a wooden table. In the background, a larger green bowl contains a creamy chicken salad.', on_screen_text: 'PATÊ DE FRANGO CREMOSO' },
  { start: 2, end: 4, description: 'The same small green bowl of crackers and the same larger green bowl of chicken salad are visible on the wooden table.', on_screen_text: 'PATÊ DE FRANGO CREMOSO' },
  { start: 4, end: 6, description: 'A clear glass bowl is seen from above on the wooden table.', on_screen_text: '' },
  { start: 6, end: 8, description: 'A hand pours shredded cooked chicken from a red and white patterned bowl into the clear glass bowl.', on_screen_text: 'FRANGO DESFIADO COZIDO 500 g' },
];

/** Assembled: GET /file/{file_id} once `scenes_status` is `completed` (the scenes are in `data.scenes`). */
const getFileWithScenes = {
  status: 'success',
  data: {
    file_info: { ...fileInfoWithScenes, namespaces },
    transcript: fileTranscript,
    scenes: fileScenes,
  },
};

/** POST /watch/file (202): the analysis was started. Saved from its former path, which answers the same. */
const fileScenesStarted = {
  status: 'success',
  data: { file_id: FILE_ID, scenes_status: 'processing', message: 'Scene analysis started.' },
};

/** POST /watch/file (200): the scenes are already there. */
const fileScenesAlreadyThere = {
  status: 'success',
  data: { file_id: FILE_ID, scenes_status: 'completed', message: 'The scenes of this file are already available.' },
};

/** Assembled: POST /watch/file on an audio file (400). */
const fileScenesNoPicture = { status: 'error', error_code: NO_PICTURE.error, ...NO_PICTURE };

/** Assembled: POST /watch/file on an upload that was cancelled (400). */
const fileScenesCancelled = {
  status: 'error',
  error: 'file_cancelled',
  message: 'This upload was cancelled. Retry it before asking for its scenes.',
};

/** Assembled: POST /watch/file without a file_id (400). */
const watchFileMissingId = { status: 'error', error: 'missing_parameter', message: 'file_id is required' };

/** Assembled: POST /watch/file with an unknown file_id (404). */
const watchFileNotFound = { status: 'error', error: 'file_not_found', message: 'File not found' };

/** POST /extract/file with include_scenes on a file whose scenes were never asked for (409). */
const scenesNotAvailable = {
  status: 'error',
  error: 'scenes_not_available',
  error_code: 'scenes_not_available',
  message: `This file has no scenes yet. Start their analysis with POST /v1/watch/file {"file_id": "${FILE_ID}"}, or upload with include_scenes, then call again.`,
  scenes_status: 'none',
};

/** The same refusal while the scenes are being analyzed (409). */
const scenesStillProcessing = {
  status: 'error',
  error: 'scenes_not_available',
  error_code: 'scenes_not_available',
  message: `The scenes of this file are still being analyzed. Follow \`scenes_status\` on GET /v1/file/${FILE_ID} and call again once it is \`completed\`.`,
  scenes_status: 'processing',
};

/** Assembled: the same refusal once the scene analysis has failed (409). */
const scenesFailed = {
  status: 'error',
  error: 'scenes_not_available',
  error_code: 'scenes_not_available',
  message: `This file has no scenes yet. Start their analysis with POST /v1/watch/file {"file_id": "${AUDIO_FILE_ID}"}, or upload with include_scenes, then call again.`,
  scenes_status: 'failed',
  scenes_error: NO_PICTURE,
};

/** The `file_info` of the video file before its scenes were asked for, as extraction returns it. */
const fileInfoWithoutScenes = {
  id: FILE_ID,
  name: 'test-scenes-recipe.mp4',
  size: 8492486,
  type: 'video/mp4',
  duration: 78.421433,
  status: 'completed',
  created_at: '2026-11-16T12:38:21.203Z',
  updated_at: '2026-11-16T12:38:38.829Z',
  has_transcript: true,
};

/** POST /extract/file with include_scenes, once the file has its scenes. */
const extractFileWithScenes = {
  status: 'success',
  data: {
    dish: 'PATÊ DE FRANGO CREMOSO',
    ingredients: [
      { name: 'FRANGO DESFIADO COZIDO', quantity: '500 g' },
      { name: 'MAIONESE', quantity: '300 g' },
      { name: 'REQUEIJÃO', quantity: '250 g' },
    ],
  },
  file_info: fileInfoWithScenes,
  frames_analyzed: 30,
  usage: {
    charges: [
      { service_type: 'analysis_request', quantity: 1, credits: 1, tokens: { prompt_tokens: 1534, completion_tokens: 614, total_tokens: 2148 } },
    ],
    total_credits: 1,
  },
};

module.exports = {
  VIDEO_URL,
  WHAT_TO_EXTRACT,
  FILE_ID,
  AUDIO_FILE_ID,
  EXTRACT_TASK_ID,
  NO_PICTURE,
  videoInfo,
  recipeSchema,
  extractedRecipe,
  extractVideoUsage,
  extractAsyncSubmit,
  extractAsyncFailed,
  uploadWithoutScenes,
  uploadWithScenes,
  uploadAudioWithScenes,
  getAudioFile,
  getFileWithScenes,
  fileScenes,
  fileScenesStarted,
  fileScenesAlreadyThere,
  fileScenesNoPicture,
  fileScenesCancelled,
  watchFileMissingId,
  watchFileNotFound,
  scenesNotAvailable,
  scenesStillProcessing,
  scenesFailed,
  fileInfoWithoutScenes,
  extractFileWithScenes,
};
