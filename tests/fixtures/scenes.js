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
const QUESTION = 'What are the ingredients and their quantities?';
const FILE_ID = '64a1b2c3d4e5f67890abcdef';
const AUDIO_FILE_ID = '64a1b2c3d4e5f67890abcd00';
const NAMESPACE_ID = '64a1b2c3d4e5f67890abc001';
const ANALYZE_TASK_ID = '550e8400-e29b-41d4-a716-446655440000';
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

const videoTranscript = [
  { text: 'Música', start: 0, end: 0.62 },
  { text: 'Música', start: 30, end: 57.42 },
  { text: '¡Suscríbete', start: 60, end: 75.92 },
  { text: 'al canal!', start: 75.92, end: 76.46 },
];

const videoScenes = [
  { start: 0, end: 2, description: 'A wooden table holds a small green bowl of crackers, a larger green bowl filled with a creamy mixture, and an orange bowl of olives.', on_screen_text: 'PATÊ DE FRANGO\nCREMOSO' },
  { start: 2, end: 4, description: 'The same green bowl of crackers, the same green bowl of creamy mixture, and the same orange bowl of olives are visible on the wooden table.', on_screen_text: 'PATÊ DE FRANGO\nCREMOSO' },
  { start: 4, end: 6, description: 'The scene is blurred as the camera moves quickly across the wooden table.', on_screen_text: '' },
  { start: 6, end: 8, description: 'A hand holds a red and white patterned container over a clear glass bowl containing shredded chicken.', on_screen_text: 'FRANGO DESFIADO COZIDO\n500 g' },
];

const videoAnalysis = {
  summary: 'The video demonstrates how to make a creamy chicken pâté (Patê de Frango Cremoso).',
  people: [],
  places: [],
  key_subjects: ['Patê de Frango Cremoso', 'shredded chicken', 'mayonnaise'],
  timestamp: 6,
  relevant_text: '[Picture] A hand holds a red and white patterned container over a clear glass bowl containing shredded chicken.\nOn screen: FRANGO DESFIADO COZIDO\n500 g',
  query_answer: {
    answer: 'Chicken (shredded, cooked) – 500 g; Mayonnaise – 300 g; Requeijão (cream cheese) – 250 g; Grated carrots – 2; Corn (green) – 250 g; Green olives – 250 g; Green herbs – to taste; Crackers (served on side).',
    best_segment_index: 5,
    relevant_segments: ['5:6', '9', '13', '14', '16:18'],
  },
};

const videoAnalysisUsage = {
  charges: [
    { service_type: 'standard_request', quantity: 1, credits: 1 },
    { service_type: 'frame_analysis', quantity: 30, credits: 1 },
    { service_type: 'analysis_request', quantity: 1, credits: 1, tokens: { prompt_tokens: 3382, completion_tokens: 1354, total_tokens: 4736 } },
  ],
  total_credits: 3,
};

/** POST /analyze/video with include_scenes and a query. */
const analyzeVideoWithScenes = {
  status: 'success',
  data: {
    video_info: videoInfo,
    transcript: videoTranscript,
    transcript_analysis: videoAnalysis,
    scenes: videoScenes,
    frames_analyzed: 30,
  },
  usage: videoAnalysisUsage,
};

/** POST /analyze/video without include_scenes. */
const analyzeVideoPlain = {
  status: 'success',
  data: {
    video_info: videoInfo,
    transcript: videoTranscript,
    transcript_analysis: {
      summary: 'The video consists of background music and a brief prompt urging viewers to subscribe to the channel.',
      people: [],
      places: [],
      key_subjects: ['Music', 'Subscribe'],
      timestamp: 0,
      relevant_text: null,
      query_answer: null,
    },
  },
  usage: {
    charges: [
      { service_type: 'standard_request', quantity: 1, credits: 1 },
      { service_type: 'analysis_request', quantity: 1, credits: 1, tokens: { prompt_tokens: 1339, completion_tokens: 426, total_tokens: 1765 } },
    ],
    total_credits: 2,
  },
};

/** POST /analyze/video/async (202). */
const analyzeAsyncSubmit = {
  status: 'success',
  data: {
    task_id: ANALYZE_TASK_ID,
    task_status: 'processing',
    job_type: 'analyze_video',
    expires_at: '2026-11-16T13:35:54.473122+00:00',
    check_status_url: `/v1/analyze/video/${ANALYZE_TASK_ID}`,
    webhook_url: null,
    message: 'Job started. Poll check_status_url for the result.',
    docs_url: 'https://docs.vidnavigator.com/guides/async-jobs',
  },
};

/** GET /analyze/video/{task_id}?include_usage=true once the job is completed. */
const analyzeAsyncCompleted = {
  status: 'success',
  data: {
    task_id: ANALYZE_TASK_ID,
    task_status: 'completed',
    job_type: 'analyze_video',
    request: { video_url: VIDEO_URL, include_scenes: true, query: QUESTION },
    created_at: '2026-11-16T12:35:54.473000',
    started_at: '2026-11-16T12:35:54.481000',
    completed_at: '2026-11-16T12:35:57.729000',
    expires_at: '2026-11-16T13:35:57.729000',
    check_status_url: `/v1/analyze/video/${ANALYZE_TASK_ID}`,
    webhook: null,
    result: {
      video_info: videoInfo,
      transcript: videoTranscript,
      transcript_analysis: {
        ...videoAnalysis,
        query_answer: {
          answer: 'Frango desfiado cozido – 500 g; Maionese – 300 g; Requeijão – 250 g; Cenoura ralada – 2 unidades; Milho verde – 250 g; Azeitona verde – 250 g; Cheiro‑verde – a gosto.',
          best_segment_index: 5,
          relevant_segments: ['5:6', '9', '13:14', '16', '18'],
        },
      },
      scenes: videoScenes,
      frames_analyzed: 30,
    },
  },
  usage: videoAnalysisUsage,
};

/** Assembled: the same task while it runs. */
const analyzeAsyncProcessing = {
  status: 'success',
  data: {
    task_id: ANALYZE_TASK_ID,
    task_status: 'processing',
    job_type: 'analyze_video',
    request: { video_url: VIDEO_URL, include_scenes: true, query: QUESTION },
    created_at: '2026-11-16T12:35:54.473000',
    started_at: '2026-11-16T12:35:54.481000',
    completed_at: null,
    expires_at: '2026-11-16T13:35:54.473000',
    check_status_url: `/v1/analyze/video/${ANALYZE_TASK_ID}`,
    webhook: null,
  },
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

/** The `data` of POST /extract/video with include_scenes: the quantities are only written on screen. */
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
    { service_type: 'frame_analysis', quantity: 30, credits: 1 },
    { service_type: 'analysis_request', quantity: 1, credits: 1, tokens: { prompt_tokens: 1483, completion_tokens: 790, total_tokens: 2273 } },
  ],
  total_credits: 4,
};

/** POST /extract/video/async (202). */
const extractAsyncSubmit = {
  status: 'success',
  data: {
    task_id: EXTRACT_TASK_ID,
    task_status: 'processing',
    job_type: 'extract_video',
    expires_at: '2026-11-16T14:13:44.387431+00:00',
    check_status_url: `/v1/extract/video/${EXTRACT_TASK_ID}`,
    webhook_url: null,
    message: 'Job started. Poll check_status_url for the result.',
    docs_url: 'https://docs.vidnavigator.com/guides/async-jobs',
  },
};

/** GET /extract/video/{task_id} of an extraction with include_scenes that failed. */
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
    check_status_url: `/v1/extract/video/${EXTRACT_TASK_ID}`,
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

/** The `file_info` of the video file once its scenes are analyzed, as analyze and extract return it. */
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

/** POST /file/{file_id}/scenes (202): the analysis was started. */
const fileScenesStarted = {
  status: 'success',
  data: { file_id: FILE_ID, scenes_status: 'processing', message: 'Scene analysis started.' },
};

/** POST /file/{file_id}/scenes (200): the scenes are already there. */
const fileScenesAlreadyThere = {
  status: 'success',
  data: { file_id: FILE_ID, scenes_status: 'completed', message: 'The scenes of this file are already available.' },
};

/** Assembled: POST /file/{file_id}/scenes on an audio file (400). */
const fileScenesNoPicture = { status: 'error', error_code: NO_PICTURE.error, ...NO_PICTURE };

/** POST /analyze/file or /extract/file with include_scenes on a file whose scenes were never asked for (409). */
const scenesNotAvailable = {
  status: 'error',
  error: 'scenes_not_available',
  error_code: 'scenes_not_available',
  message: `This file has no scenes yet. Start their analysis with POST /v1/file/${FILE_ID}/scenes, or upload with include_scenes, then call again.`,
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
  message: `This file has no scenes yet. Start their analysis with POST /v1/file/${AUDIO_FILE_ID}/scenes, or upload with include_scenes, then call again.`,
  scenes_status: 'failed',
  scenes_error: NO_PICTURE,
};

const fileAnalysisUsage = {
  charges: [
    { service_type: 'analysis_request', quantity: 1, credits: 1, tokens: { prompt_tokens: 3487, completion_tokens: 1306, total_tokens: 4793 } },
  ],
  total_credits: 1,
};

/** POST /analyze/file with include_scenes and a query, once the file has its scenes. */
const analyzeFileWithScenes = {
  status: 'success',
  data: {
    file_info: fileInfoWithScenes,
    transcript: fileTranscript,
    scenes: fileScenes,
    frames_analyzed: 30,
    transcript_analysis: {
      summary: 'The video demonstrates how to make a creamy chicken salad (Patê de Frango Cremoso) by mixing shredded cooked chicken, mayonnaise, requeijão, carrots, corn, green olives, and herbs in a glass bowl.',
      people: [],
      places: [],
      key_subjects: ['Patê de Frango Cremoso', 'creamy chicken salad', 'crackers'],
      timestamp: 6,
      relevant_text: '[Picture] A hand pours shredded cooked chicken from a red and white patterned bowl into the clear glass bowl.\nOn screen: FRANGO DESFIADO COZIDO 500 g',
      query_answer: {
        answer: 'Frango desfiado cozido – 500 g; Maionese – 300 g; Requeijão – 250 g; Cenoura ralada – 2 cenouras; Milho verde – 250 g; Azeitona verde – 250 g; Cheiro‑verde – a gosto.',
        best_segment_index: 5,
        relevant_segments: ['5:6', '9', '13', '14', '16', '18'],
      },
    },
  },
  usage: fileAnalysisUsage,
};

/** POST /analyze/file without include_scenes, before the scenes were asked for. */
const analyzeFilePlain = {
  status: 'success',
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
    },
    transcript: fileTranscript,
    transcript_analysis: {
      summary: 'A brief segment featuring music followed by a thank‑you expression.',
      people: [],
      places: [],
      key_subjects: ['Music'],
      timestamp: 0.0,
      relevant_text: null,
      query_answer: null,
    },
  },
  usage: {
    charges: [
      { service_type: 'analysis_request', quantity: 1, credits: 1, tokens: { prompt_tokens: 812, completion_tokens: 303, total_tokens: 1115 } },
    ],
    total_credits: 1,
  },
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
  QUESTION,
  FILE_ID,
  AUDIO_FILE_ID,
  ANALYZE_TASK_ID,
  EXTRACT_TASK_ID,
  NO_PICTURE,
  videoInfo,
  videoScenes,
  analyzeVideoWithScenes,
  analyzeVideoPlain,
  analyzeAsyncSubmit,
  analyzeAsyncProcessing,
  analyzeAsyncCompleted,
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
  scenesNotAvailable,
  scenesStillProcessing,
  scenesFailed,
  analyzeFileWithScenes,
  analyzeFilePlain,
  extractFileWithScenes,
};
