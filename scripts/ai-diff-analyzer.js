// ============================================================================
// IMPORTS & MODULE INITIALIZATION
// ============================================================================
// Import official Google Gen AI SDK client class for multimodal model interaction
const { GoogleGenAI } = require('@google/genai');

// Import Node.js built-in filesystem module to read snapshot image buffers from disk
const fs = require('fs');

// Import Sharp high-performance image processing library for screenshot downscaling & compression
const sharp = require('sharp');

// ============================================================================
// CONFIGURATION & CANDIDATE MODELS
// ============================================================================
/**
 * Priority list of Gemini vision models to attempt sequentially.
 * Starts with the latest 3.0 generation for maximum reasoning accuracy,
 * with fallbacks to high-capacity 1.5 and 2.0 models if rate limits occur.
 */
const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite', // Fastest / lowest token cost
  'gemini-3.6-flash',      // All-around Flash workhorse
  'gemini-3.1-pro',        // Advanced reasoning fallback
  'gemini-1.5-flash',      // Stable high-quota legacy fallback
];

/**
 * Cooldown duration in milliseconds to pause execution between model retries.
 * Gives the Google Cloud free-tier per-minute rate-limit bucket time to reset (429 mitigation).
 */
const RATE_LIMIT_COOLDOWN_MS = 8000; // 8 seconds

// ============================================================================
// HELPER FUNCTION: IMAGE COMPRESSION & DOWNSCALING
// ============================================================================
/**
 * Downscales and compresses full-resolution desktop PNG screenshots into lightweight JPEGs.
 * 
 * WHY THIS IS CRITICAL:
 * Uncompressed 1080p desktop PNGs can consume tens of thousands of vision tokens per API call.
 * Downscaling to max 800px width with 80% JPEG quality reduces token consumption by ~80%,
 * completely preventing free-tier `429 Quota Exceeded` errors.
 * 
 * @param {Buffer} rawBuffer - The raw uncompressed PNG image buffer from disk.
 * @returns {Promise<Buffer>} - Resized and compressed JPEG image buffer.
 */
async function compressImageBuffer(rawBuffer) {
  return await sharp(rawBuffer)
    .resize({
      width: 800,                  // Target max width of 800px (preserves aspect ratio)
      fit: 'inside',              // Ensures image is scaled down proportionally
      withoutEnlargement: true,   // Never upscale smaller images
    })
    .jpeg({ quality: 80 })        // Compress to JPEG with 80% visual quality
    .toBuffer();
}

// ============================================================================
// MAIN AI DIFF ANALYZER FUNCTION
// ============================================================================
/**
 * Compares Playwright's baseline expected screenshot with the actual failure screenshot
 * using Google Gemini's vision models, returning a formatted text summary for Slack.
 * 
 * @param {string} baselinePath - Absolute path to the expected baseline snapshot PNG.
 * @param {string} actualPath - Absolute path to the actual test execution failure PNG.
 * @returns {Promise<string>} - Markdown-formatted visual diff summary or error string.
 */
async function analyzeVisualDiff(baselinePath, actualPath) {
  // --------------------------------------------------------------------------
  // STEP 1: VALIDATE API KEY ENVIRONMENT VARIABLE
  // --------------------------------------------------------------------------
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('❌ [AI-Diff] GEMINI_API_KEY environment variable is missing.');
    return '⚠️ *AI Diff Summary Unavailable:* `GEMINI_API_KEY` is not set in environment variables.';
  }

  // Instantiate the Google Gen AI client with the loaded API key
  const ai = new GoogleGenAI({ apiKey });

  // --------------------------------------------------------------------------
  // STEP 2: LOAD & COMPRESS SCREENSHOT ARTIFACTS FROM DISK
  // --------------------------------------------------------------------------
  let baselineBuffer;
  let actualBuffer;

  try {
    console.log('🖼️ [AI-Diff] Loading raw screenshot files from disk...');
    const rawBaseline = fs.readFileSync(baselinePath);
    const rawActual = fs.readFileSync(actualPath);

    console.log('📉 [AI-Diff] Downscaling and compressing screenshots (800px JPEG) to optimize token usage...');
    baselineBuffer = await compressImageBuffer(rawBaseline);
    actualBuffer = await compressImageBuffer(rawActual);

    console.log('✅ [AI-Diff] Screenshot compression complete. Token footprint optimized.');
  } catch (fileError) {
    console.error('❌ [AI-Diff] Failed during image loading or compression:', fileError.message);
    return `⚠️ *AI Diff Summary Unavailable:* Could not read or process image files. Details: ${fileError.message}`;
  }

// --------------------------------------------------------------------------
  // STEP 3: CONSTRUCT MULTIMODAL PROMPT FOR QA REVIEW
  // --------------------------------------------------------------------------
  const prompt = `
You are a Lead QA Automation Engineer reviewing a Visual Regression Test Failure.
Compare Image 1 (Expected Baseline Snapshot) with Image 2 (Actual Test Failure Result).

Format your output into EXACTLY 3 bullet points using Slack mrkdwn syntax (single asterisks for bolding):
* *Visual Mismatch:* <Explain the exact visual discrepancy between Image 1 and Image 2>
* *Likely Root Cause:* <Identify potential root cause like navigation error, CSS bug, or base URL mismatch>
* *Impact:* <State severity level and recommended action step>

Rules:
- CRITICAL: Use SINGLE asterisks for bold headers (*Visual Mismatch:*, *Likely Root Cause:*, *Impact:*). Do NOT use double asterisks.
- Keep each point direct, concise, and formatted for Slack.
- Do NOT wrap output in markdown code fences.
`;

  // --------------------------------------------------------------------------
  // STEP 4: MODEL RETRY LOOP WITH AUTOMATIC BACKOFF
  // --------------------------------------------------------------------------
  // Sequentially iterate through candidate models until one successfully returns an analysis
  for (let i = 0; i < CANDIDATE_MODELS.length; i++) {
    const modelName = CANDIDATE_MODELS[i];

    try {
      console.log(`🤖 [AI-Diff] Attempting visual analysis with model (${i + 1}/${CANDIDATE_MODELS.length}): ${modelName}...`);

      // Execute multimodal request passing prompt text and compressed JPEG base64 image buffers
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: 'image/jpeg', // Updated to image/jpeg matching Sharp output
                  data: baselineBuffer.toString('base64'),
                },
              },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: actualBuffer.toString('base64'),
                },
              },
            ],
          },
        ],
      });

      console.log(`✅ [AI-Diff] Visual diff analysis successfully generated using model: ${modelName}`);
      
      // Return generated text summary immediately upon success, breaking out of the function loop
      return response.text;

    } catch (error) {
      // Extract error status code or message details
      const errorMessage = error.message || error.toString();
      console.warn(`⚠️ [AI-Diff] Model '${modelName}' failed with error: ${errorMessage}`);

      // Check if there are remaining models to attempt
      if (i < CANDIDATE_MODELS.length - 1) {
        console.log(`⏳ [AI-Diff] Pausing for ${RATE_LIMIT_COOLDOWN_MS / 1000}s to allow rate-limit buckets to reset before trying next model...`);
        
        // Asynchronous delay to allow rate-limit windows (429 quota errors) to clear
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_COOLDOWN_MS));
      }
    }
  }

  // --------------------------------------------------------------------------
  // STEP 5: FALLBACK IF ALL CANDIDATE MODELS EXHAUSTED
  // --------------------------------------------------------------------------
  console.error('❌ [AI-Diff] All candidate Gemini models failed or exceeded API rate limits.');
  return '⚠️ *AI Diff Summary Unavailable:* All candidate Gemini models exceeded API rate limits or were temporarily unavailable.';
}

// Export function as Node.js CommonJS module for slack-reporter.ts integration
module.exports = { analyzeVisualDiff };