const dotenv = require('dotenv');
const axios = require('axios');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const key = process.env.AZURE_TRANSLATOR_KEY;
const region = process.env.AZURE_TRANSLATOR_REGION;

async function testTts() {
  const text = 'નમસ્તે, હું ખેડૂતમિત્ર છું.';
  const voice = 'gu-IN-DhwaniNeural';
  const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

  const ssml = `
    <speak version='1.0' xml:lang='gu-IN'>
      <voice xml:lang='gu-IN' xml:gender='Female' name='${voice}'>
        ${text}
      </voice>
    </speak>
  `;

  console.log('Testing Azure TTS with Key:', key?.substring(0, 5) + '...');
  console.log('Region:', region);
  console.log('SSML:', ssml);

  try {
    const response = await axios({
      method: 'post',
      url: endpoint,
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
        'User-Agent': 'KhedutMitraBackend'
      },
      data: ssml,
      responseType: 'arraybuffer'
    });

    console.log('Success! Audio buffer length:', response.data.byteLength);
  } catch (err) {
    console.error('Error Details:', {
      message: err.message,
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data?.toString()
    });
  }
}

testTts();
