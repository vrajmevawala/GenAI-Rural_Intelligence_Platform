# translateBatch

## Location
- Source: translation/translation.service.js
- Lines: 9-47

## Signature
```js
translateBatch(texts, to)
```

## How It Works (Actual Flow)
- Validates state and throws typed errors for failure cases.
- Calls external services/integrations during processing.
- Transforms result sets before returning data to caller/UI.

## Parameters
- texts
- to

## Implementation Snapshot
```js
async function translateBatch(texts, to) {
  const key = process.env.AZURE_TRANSLATOR_KEY;
  const region = process.env.AZURE_TRANSLATOR_REGION;

  if (!key || !region) {
    throw new AppError("Azure Translator credentials not configured", 500);
  }

  const endpoint = "https://api.cognitive.microsofttranslator.com/translate?api-version=3.0";
  const url = `${endpoint}&to=${to}`;

  const body = texts.map(text => ({ text }));

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Ocp-Apim-Subscription-Region": region,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errBody = await response.text();
      error("Azure Translator API error", { status: response.status, body: errBody });
      throw new Error(`Azure API error: ${response.status}`);
    }

```
