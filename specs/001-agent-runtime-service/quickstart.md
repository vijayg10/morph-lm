# Quickstart: Agent Runtime Service

## Prerequisites

- Node.js 22+
- At least one AI CLI agent installed (gemini, claude, or aider)
- An API key configured

## Setup

```bash
# Clone and install
git clone <repo-url> morph-lm
cd morph-lm
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings
```

## Environment Configuration

```env
HOST=0.0.0.0
PORT=3000
API_KEY=your-secret-key
WORKSPACES=/repos,/projects
LOG_LEVEL=info
ENABLE_GEMINI=true
ENABLE_CLAUDE=true
ENABLE_AIDER=true
AGENT_TIMEOUT_MS=300000
AGENT_CONCURRENCY_LIMIT=5
```

## Run

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Verify

```bash
# Health check
curl http://localhost:3000/health

# List models
curl http://localhost:3000/v1/models \
  -H "Authorization: Bearer your-secret-key"

# Chat completion
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini:mlm",
    "messages": [{"role": "user", "content": "Hello"}]
  }'

# Streaming
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini:mlm",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'
```

## Docker

```bash
docker compose up -d
```

## Use with LLM Gateway

Point LLM Gateway to this service as a custom provider:

```
Provider URL: http://localhost:3000/v1
API Key: your-secret-key
```

## Use with OpenAI SDK (Python)

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/v1",
    api_key="your-secret-key"
)

response = client.chat.completions.create(
    model="gemini:mlm",
    messages=[{"role": "user", "content": "Hello"}]
)
print(response.choices[0].message.content)
```

## Use with OpenAI SDK (TypeScript)

```typescript
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "http://localhost:3000/v1",
  apiKey: "your-secret-key",
});

const completion = await client.chat.completions.create({
  model: "gemini:mlm",
  messages: [{ role: "user", content: "Hello" }],
});
console.log(completion.choices[0].message.content);
```
