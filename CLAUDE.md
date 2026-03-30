# CLAUDE.md

## Project Overview

This is a portfolio project demonstrating how EU AML Package regulations (AMLR/AMLD6/AMLA) can be decomposed into executable Camunda BPMN + DMN decision logic for KYC beneficial ownership re-screening.

## Structure

- `diagrams/` — Camunda BPMN and DMN files (open with Camunda Modeler)
- `docs/` — Regulatory analysis, test scenarios, and LLM extraction PoC writeup
- `demo/` — React/Vite app demonstrating LLM-to-DMN extraction with human validation

## Key Context

- The DMN tables implement rules from Regulation (EU) 2024/1624 (AMLR), applying from 10 July 2027
- Three DMN tables form a decision chain: BO Assessment (FIRST) -> Risk Tier (PRIORITY) -> EDD Requirements (COLLECT)
- The BPMN process orchestrates the full re-screening workflow with signal start, DMN invocations, and risk-based routing
- The LLM extraction PoC shows ~63% of LLM output is production-ready without human review

## Commands

```bash
# Run the interactive demo
cd demo && npm install && npm run dev
```

## Working With This Repo

- BPMN/DMN files are XML — edit in Camunda Modeler, not by hand
- The demo app works without an API key using sample data (click "Load Sample Data")
- Test scenarios in `docs/test-scenarios.md` trace 6 client profiles through the full decision chain
