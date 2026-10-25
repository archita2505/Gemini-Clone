# Gemini Clone

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` to a valid Gemini API key from Google AI Studio.
3. Run `npm run dev` and open the Vite URL printed in the terminal (usually `http://localhost:5173`).

The frontend sends prompts to the local API server; the Gemini key stays on the server and is not included in the browser bundle. The API server uses Google's Interactions API with `gemini-3.1-flash-lite` by default, which was verified with the configured key. It stores each interaction with Google so follow-up prompts can use the previous interaction ID; selecting New Chat clears that ID. Review Google's Gemini API data retention policy before using sensitive prompts. To select another model, set `GEMINI_MODEL` in `.env`. If you see a permission or quota error, check the key, model availability, and project limits in Google AI Studio, then restart the server.

`npm run dev` reuses a healthy API server if one is already running. If the default API port is occupied by another program, it selects another available port. Vite may also select another port when `5173` is already occupied; open the exact URL it prints in the terminal.

Use the gallery button to attach a JPEG, PNG, WebP, or GIF image up to 5 MB; add an optional question and send it for Gemini to analyze. The microphone button uses your browser's speech recognition and may require microphone permission; it works only in browsers that support the Web Speech API (typically on localhost or HTTPS).

Open Settings from the sidebar to switch between light and dark appearance; your choice is saved in this browser. You can also clear the recent prompt list there without deleting the current conversation.

For deployment, run the API server with `npm run start:api`, configure `GEMINI_API_KEY` in the server's environment, and route `/api` requests from the frontend host to that server.
