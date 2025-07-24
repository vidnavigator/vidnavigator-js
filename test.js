const {
  VidNavigatorClient,
  VideoInfo,
  FileInfo,
  TranscriptSegment,
  AuthenticationError,
  NotFoundError,
  BadRequestError
} = require('./vidnavigator');
require('dotenv').config(); // Load environment variables from .env file

async function main() {
  // Check if API key is provided
  if (!process.env.VIDNAVIGATOR_API_KEY) {
    console.error('❌ Error: Please set your VIDNAVIGATOR_API_KEY in a .env file');
    console.log('Create a .env file in the root directory with:');
    console.log('VIDNAVIGATOR_API_KEY=your_actual_api_key_here');
    process.exit(1);
  }

  // Initialize the SDK
  const client = new VidNavigatorClient({
    apiKey: process.env.VIDNAVIGATOR_API_KEY,
  });

  console.log('🚀 Starting VidNavigator SDK Test\n');

  try {
    // Test 1: Health Check
    console.log('--- 1. Health Check ---');
    const health = await client.healthCheck();
    console.log('✅ API Status:', health.status);
    console.log('📝 Message:', health.message);
    console.log('🔢 Version:', health.version);
    console.log();

    // Test 2: Get Usage Statistics
    console.log('--- 2. Usage Statistics ---');
    try {
      const usage = await client.getUsage();
      console.log('✅ Usage data retrieved:', usage);
    } catch (error) {
      console.log('⚠️  Could not retrieve usage data:', error.message);
    }
    // Test for AuthenticationError
    try {
        console.log('🧪 Testing for AuthenticationError...');
        const badClient = new VidNavigatorClient({ apiKey: 'invalid-api-key' });
        await badClient.getUsage();
    } catch (error) {
        if (error instanceof AuthenticationError) {
            console.log('✅ Correctly caught AuthenticationError:');
            console.log(`   Status: ${error.status_code}, Message: ${error.error_message}`);
        } else {
            console.error('❌ Failed to catch AuthenticationError. Got:', error);
        }
    }
    console.log();

    // Test 3: Get Video Transcript
    console.log('--- 3. Video Transcript Test ---');
    const testVideoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Rick Astley - Never Gonna Give You Up
    console.log(`📺 Getting transcript for: ${testVideoUrl}`);
    
    try {
      const { video_info, transcript } = await client.getTranscript({
        video_url: testVideoUrl,
        language: 'en' // Optional: specify language
      });

      console.log('✅ Video Info Retrieved:');
      console.log(`  📛 Title: ${video_info.title}`);
      console.log(`  📺 Channel: ${video_info.channel}`);
      console.log(`  ⏱️  Duration: ${video_info.duration} seconds`);
      console.log(`  👀 Views: ${video_info.views?.toLocaleString() || 'N/A'}`);
      console.log(`  🎯 Is VideoInfo instance?`, video_info instanceof VideoInfo);
      
      console.log('\n📝 First 3 transcript segments:');
      transcript.slice(0, 3).forEach((segment, index) => {
        console.log(`  ${index + 1}. [${segment.start.toFixed(2)}s - ${segment.end.toFixed(2)}s]: ${segment.text}`);
        console.log(`     🎯 Is TranscriptSegment instance?`, segment instanceof TranscriptSegment);
      });
    } catch (error) {
      console.log('❌ Transcript error:', error.message);
    }

    // Test 4: Analyze Video
    console.log('--- 4. Video Analysis Test ---');
    try {
      const analysis = await client.analyzeVideo({
        video_url: testVideoUrl,
        query: 'What is the main message of this song?' // Optional analysis question
      });

      console.log('✅ Analysis completed:');
      console.log(`📝 Summary: ${analysis.transcript_analysis.summary?.substring(0, 200)}...`);
      
      if (analysis.transcript_analysis.people && analysis.transcript_analysis.people.length > 0) {
        console.log(`👥 People mentioned: ${analysis.transcript_analysis.people.map(p => p.name).join(', ')}`);
      }
      
      if (analysis.transcript_analysis.query_answer) {
        console.log(`💡 Query Answer: ${analysis.transcript_analysis.query_answer.answer}`);
      }
    } catch (error) {
      console.log('❌ Analysis error:', error.response?.data?.message || error.message);
    }
    console.log();

    // Test 5: List Files
    console.log('--- 5. List Uploaded Files ---');
    try {
      const files = await client.getFiles({ limit: 5 });
      console.log('✅ Files retrieved:');
      console.log(`📊 Total files: ${files.total_count}`);
      console.log(`📁 Files returned: ${files.files.length}`);
      
      if (files.files.length > 0) {
        console.log('\n📄 Recent files:');
        files.files.forEach((file, index) => {
          console.log(`  ${index + 1}. ${file.name} (${file.status})`);
          console.log(`     🎯 Is FileInfo instance?`, file instanceof FileInfo);
          console.log(`     📊 Size: ${file.size ? (file.size / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}`);
        });
      } else {
        console.log('📭 No files uploaded yet');
      }
    } catch (error) {
      console.log('❌ Files list error:', error.message);
    }
    // Test for NotFoundError
    try {
        console.log('🧪 Testing for NotFoundError...');
        await client.getFile('non-existent-file-id');
    } catch (error) {
        if (error instanceof NotFoundError) {
            console.log('✅ Correctly caught NotFoundError:');
            console.log(`   Status: ${error.status_code}, Message: ${error.error_message}`);
        } else {
            console.error('❌ Failed to catch NotFoundError. Got:', error);
        }
    }

    console.log('\n🎉 SDK Test completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('  - Try uploading a file with: sdk.uploadFile({ filePath: "./your-file.mp4" })');
    console.log('  - Search through your files with: sdk.searchFiles({ query: "your search term" })');
    console.log('  - Analyze uploaded files with: sdk.analyzeFile({ file_id: "your-file-id" })');

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the test
main().catch(console.error); 