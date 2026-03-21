# processBotReply

## Location
- Source: whatsapp/whatsapp.service.js
- Lines: 305-363

## Signature
```js
processBotReply(conv, userInput)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.
- Calls external services/integrations during processing.

## Parameters
- conv
- userInput

## Implementation Snapshot
```js
async function processBotReply(conv, userInput) {
  const stage = conv.current_stage
  const language = conv.language || 'gu'

  if (['menu', 'મેનુ', '0'].includes(userInput)) {
    return await handleMainMenu(conv, userInput, language)
  }

  // Handle language switch commands in any stage
  if (['gujarati', 'gu', 'guj'].includes(userInput)) {
    await pool.query(
      'UPDATE whatsapp_conversations SET language = $1 WHERE id = $2',
      ['gu', conv.id]
    )
    return { message: getLanguageSwitchConfirmation('gu'), nextStage: stage }
  }
  if (['hindi', 'hi'].includes(userInput)) {
    await pool.query(
      'UPDATE whatsapp_conversations SET language = $1 WHERE id = $2',
      ['hi', conv.id]
    )
    return { message: getLanguageSwitchConfirmation('hi'), nextStage: stage }
  }
  if (['english', 'en'].includes(userInput)) {
    await pool.query(
      'UPDATE whatsapp_conversations SET language = $1 WHERE id = $2',
      ['en', conv.id]
    )
    return { message: getLanguageSwitchConfirmation('en'), nextStage: stage }
  }
```
