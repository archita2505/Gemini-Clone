async function main(prompt, previousInteractionId, image) {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      previousInteractionId,
      image: image ? { data: image.base64, mimeType: image.mimeType } : undefined,
    }),
  });

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('The server returned an invalid response. Please try again.');
  }

  if (!response.ok) {
    throw new Error(data.error || 'The request failed. Please try again.');
  }

  if (typeof data.text !== 'string' || !data.text.trim() || typeof data.interactionId !== 'string') {
    throw new Error('Gemini returned an empty response. Please try again.');
  }

  return { text: data.text, interactionId: data.interactionId };
}

export default main;
