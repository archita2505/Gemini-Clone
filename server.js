import 'dotenv/config';
import { createServer } from 'node:http';
import process from 'node:process';
import { GoogleGenAI } from '@google/genai';

const port = Number(process.env.API_PORT || 3001);
const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const maxRequestSize = 8 * 1024 * 1024;
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function getGeminiErrorMessage(error) {
  const rawMessage = error instanceof Error ? error.message : '';
  let details;

  try {
    details = JSON.parse(rawMessage).error;
  } catch {
    details = undefined;
  }

  const message = details?.message
    || error?.error?.error?.message
    || error?.error?.message
    || rawMessage;
  const code = details?.code || error?.status;

  if (code === 401 || code === 403 || message.includes('PERMISSION_DENIED')) {
    return 'Google rejected this API key. Check that it is valid, has Gemini API access, and is not restricted from using the Gemini API.';
  }
  if (code === 404 || message.includes('NOT_FOUND')) {
    return 'Google could not find the requested Gemini model or API endpoint. Check model availability and make sure the server is using the Interactions API.';
  }
  if (code === 429 || message.includes('RESOURCE_EXHAUSTED') || message.includes('too_many_requests')) {
    if (message.includes('limit: 0 input tokens per minute on Free Tier')) {
      return 'This Gemini model has no free-tier quota for your project. Select a model with available quota in Google AI Studio or upgrade the project plan.';
    }
    return 'The Gemini API quota or rate limit has been reached. Check the project quota and try again later.';
  }
  if (message.includes('API key not valid') || message.includes('API_KEY_INVALID')) {
    return 'This Gemini API key is invalid. Create a valid key in Google AI Studio and update GEMINI_API_KEY in .env.';
  }

  return `Gemini request failed: ${message || 'Unknown server error.'}`;
}

const server = createServer(async (request, response) => {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (request.method === 'GET' && request.url === '/api/health') {
    response.writeHead(200).end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (request.method !== 'POST' || request.url !== '/api/generate') {
    response.writeHead(404).end(JSON.stringify({ error: 'API route not found.' }));
    return;
  }

  let body = '';
  try {
    for await (const chunk of request) {
      body += chunk;
      if (body.length > maxRequestSize) {
        response.writeHead(413).end(JSON.stringify({ error: 'The prompt is too large.' }));
        return;
      }
    }

    const { prompt, previousInteractionId, image } = JSON.parse(body);
    if (typeof prompt !== 'string' || (!prompt.trim() && !image)) {
      response.writeHead(400).end(JSON.stringify({ error: 'Enter a prompt or attach an image before sending.' }));
      return;
    }
    if (image !== undefined && (
      !image
      || typeof image.data !== 'string'
      || !/^[A-Za-z0-9+/]+={0,2}$/.test(image.data)
      || image.data.length > 7_000_000
      || typeof image.mimeType !== 'string'
      || !allowedImageTypes.has(image.mimeType)
    )) {
      response.writeHead(400).end(JSON.stringify({
        error: 'Attach a valid JPEG, PNG, WebP, or GIF image no larger than 5 MB.',
      }));
      return;
    }
    if (previousInteractionId !== undefined && previousInteractionId !== '' && (
      typeof previousInteractionId !== 'string'
      || previousInteractionId.length > 256
      || !/^[\w-]+$/.test(previousInteractionId)
    )) {
      response.writeHead(400).end(JSON.stringify({ error: 'Conversation reference is invalid. Start a new chat and try again.' }));
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      response.writeHead(503).end(JSON.stringify({
        error: 'Gemini is not configured. Add a valid GEMINI_API_KEY to the project .env file and restart the server.',
      }));
      return;
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const input = [];
    if (prompt.trim()) {
      input.push({ type: 'text', text: prompt.trim() });
    } else if (image) {
      input.push({ type: 'text', text: 'Describe this image.' });
    }
    if (image) {
      input.push({ type: 'image', data: image.data, mime_type: image.mimeType });
    }
    const result = await ai.interactions.create({
      model,
      input,
      ...(previousInteractionId ? { previous_interaction_id: previousInteractionId } : {}),
      store: true,
    });

    if (!result.output_text || !result.id) {
      response.writeHead(502).end(JSON.stringify({ error: 'Gemini returned an empty response.' }));
      return;
    }

    response.writeHead(200).end(JSON.stringify({
      text: result.output_text,
      interactionId: result.id,
    }));
  } catch (error) {
    console.error('Gemini request failed:', error);
    response.writeHead(502).end(JSON.stringify({
      error: getGeminiErrorMessage(error),
    }));
  }
});

server.on('error', (error) => {
  console.error(`Gemini API server could not listen on port ${port}: ${error.message}`);
  process.exitCode = 1;
});

server.listen(port, () => {
  console.log(`Gemini API server listening on http://localhost:${port}`);
});
