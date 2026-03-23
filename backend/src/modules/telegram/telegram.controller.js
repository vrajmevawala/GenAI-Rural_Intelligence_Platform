const { successResponse, errorResponse } = require("../../utils/apiResponse");
const service = require("./telegram.service");

async function handleWebhook(req, res, next) {
  try {
    const data = await service.processTelegramUpdate(req.body);
    return res.status(200).json(successResponse(data, "Telegram update handled"));
  } catch (err) {
    next(err);
  }
}

async function listModels(req, res, next) {
  try {
    const models = await service.listVisionModels();
    return res.status(200).json(successResponse({ modelInUse: service.MODEL_ID, availableVisionModels: models }, "Vision models listed"));
  } catch (err) {
    next(err);
  }
}

async function setWebhook(req, res) {
  try {
    const webhookUrl = req.body?.webhookUrl || process.env.TELEGRAM_WEBHOOK_URL;
    const result = await service.setTelegramWebhook(webhookUrl);
    return res.status(200).json(successResponse(result, "Telegram webhook set"));
  } catch (err) {
    return res.status(400).json(errorResponse("TELEGRAM_WEBHOOK_ERROR", err.message));
  }
}

module.exports = {
  handleWebhook,
  listModels,
  setWebhook
};
