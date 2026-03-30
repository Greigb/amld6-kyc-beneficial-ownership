# LLM-to-DMN Extraction Demo

Interactive React application demonstrating the LLM-assisted regulatory extraction and human validation workflow.

## Quick Start

```bash
cd demo
npm install
cp .env.example .env   # Add your Anthropic API key
npm run dev
```

The app opens at `http://localhost:5173`.

## How It Works

1. **Input** — Paste any regulatory text (pre-loaded with AMLR Article 19)
2. **Extract** — Calls Claude API to extract rules as structured JSON
3. **Validate** — Approve, flag, or reject each rule; expand for conditions; add validation notes
4. **Export** — Generates a validation report with accuracy statistics and downloads a Camunda-compatible `.dmn` file

## Without an API Key

Click **Load Sample Data** to skip the LLM extraction step and work with pre-extracted rules from Article 19. The validation and DMN export workflow works identically.

## Tech Stack

- React 18 + Vite
- Anthropic Claude API (optional — falls back to sample data)
- No additional dependencies
