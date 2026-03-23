const translationService = require("./translation.service");
const { generateAzureTts } = require("../../utils/azureTts");

async function translateData(req, res, next) {
  try {
    const { texts, to } = req.body;
    
    if (!Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({ success: false, message: "texts must be a non-empty array" });
    }

    if (!to) {
      return res.status(400).json({ success: false, message: "target language 'to' is required" });
    }

    const translated = await translationService.translateBatch(texts, to);
    
    res.json({
      success: true,
      data: {
        translations: translated
      }
    });
  } catch (error) {
    next(error);
  }
}

async function generateTts(req, res, next) {
  try {
    const { text, language } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, message: "text is required" });
    }

    const audioBuffer = await generateAzureTts(text, language || 'gu');

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length
    });

    res.send(audioBuffer);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  translateData,
  generateTts
};
