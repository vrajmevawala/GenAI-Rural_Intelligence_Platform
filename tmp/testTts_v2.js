const https = require('https');
const fs = require('fs');
const path = require('path');

// Basic env loading
const envPath = path.join(__dirname, '../backend/.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals) env[key.trim()] = vals.join('=').trim().replace(/^"(.*)"$/, '$1');
});

const key = env.AZURE_TRANSLATOR_KEY;
const region = env.AZURE_TRANSLATOR_REGION;

async function testTts() {
  const text = 'નમસ્તે, હું ખેડૂતમિત્ર છું.';
  const voice = 'gu-IN-DhwaniNeural';
  const endpoint = `${region}.tts.speech.microsoft.com`;
  const path = `/cognitiveservices/v1`;

  const ssml = `
    <speak version='1.0' xml:lang='gu-IN'>
      <voice xml:lang='gu-IN' xml:gender='Female' name='${voice}'>
        ${text}
      </voice>
    </speak>
  `;

  console.log('Testing Azure TTS with Key:', key?.substring(0, 5) + '...');
  console.log('Region:', region);

  const options = {
    hostname: endpoint,
    port: 443,
    path: path,
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
      'User-Agent': 'KhedutMitraBackend'
    }
  };

  const req = https.request(options, (res) => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', res.headers);

    let data = [];
    res.on('data', (chunk) => data.push(chunk));
    res.on('end', () => {
      const buffer = Buffer.concat(data);
      if (res.statusCode === 200) {
        console.log('Success! Audio buffer length:', buffer.byteLength);
      } else {
        console.log('Error Data:', buffer.toString());
      }
    });
  });

  req.on('error', (e) => {
    console.error('Request Error:', e.message);
  });

  req.write(ssml);
  req.end();
}

testTts();
