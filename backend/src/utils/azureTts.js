const axios = require('axios');
const logger = require('./logger');

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&"']/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      case "'": return '&apos;';
      default: return c;
    }
  });
}

/**
 * Generates an MP3 audio buffer from text using Azure Speech Service.
 * @param {string} text - The text to convert to speech.
 * @param {string} language - Language code ('gu', 'hi', 'en').
 * @returns {Promise<Buffer>} - Audio data buffer.
 */
async function generateAzureTts(text, language = 'gu') {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;

  if (!key || !region) {
    throw new Error('Azure Speech configuration missing (Key/Region)');
  }

  // Voice mapping
  // Dhvani is the high-quality neural voice for Hindi.
  // Dhwani or Niranjan for Gujarati.
  const voices = {
    gu: 'gu-IN-DhwaniNeural',
    hi: 'hi-IN-DhvaniNeural',
    hin: 'hi-IN-DhvaniNeural',
    en: 'en-IN-NeerjaNeural'
  };

  const selectedVoice = voices[language] || voices.gu;
  const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

  const ssml = `
    <speak version='1.0' xml:lang='${selectedVoice.substring(0, 5)}'>
      <voice xml:lang='${selectedVoice.substring(0, 5)}' xml:gender='Female' name='${selectedVoice}'>
        ${escapeXml(text)}
      </voice>
    </speak>
  `;

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

    return Buffer.from(response.data);
  } catch (err) {
    logger.error('Azure TTS Error:', {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data?.toString()
    });
    throw new Error(`Azure TTS failed: ${err.message}`);
  }
}

module.exports = { generateAzureTts };
