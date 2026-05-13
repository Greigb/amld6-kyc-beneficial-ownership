# README — Scaling the Extraction Pipeline (Interview Prep)

**Date:** 2026-05-13
**Author:** Greig Bradley
**Context:** Follow-up interview on 2026-05-14. The portfolio project will come up. The goal is to (a) tighten the existing README and (b) fold in four architectural concepts from `~/Downloads/regulation-llm-concepts.html` that extend the LLM-to-DMN extraction PoC.

---

## Goals

1. Add a new README section that shows how the LLM-to-DMN extraction PoC scales into a production pipeline, using four stacked techniques (Hierarchical RAG → Graph RAG → Multi-Agent Review → Self-Sustaining Loop).
2. Tighten the README opener and the "Why This Project Exists" paragraphs so the lead reads with rhythm and points forward to the new architecture section.
3. Resolve the unstaged change in `diagrams/kyc-bo-rescreening.bpmn` cleanly before any new commits.

## Non-goals

- No new docs files, no hosted HTML page, no GitHub Pages setup.
- No new mermaid renders to SVG/PNG — GitHub's native mermaid rendering is sufficient.
- No edits to the BPMN/DMN files themselves, the demo app, or the existing docs in `docs/`.
- No claim that the four-layer pipeline is implemented. The section is explicitly an architectural sketch.

## Scope of changes

Three files are touched:

| File | Change |
|---|---|
| `README.md` | Tighten opener + "Why" paragraphs; insert new section between "LLM-to-DMN Extraction" and "Extending This Project". |
| `diagrams/kyc-bo-rescreening.bpmn` | Revert (discard the unstaged Modeler re-save) after diff sanity check. |
| `docs/superpowers/specs/2026-05-13-readme-scaling-extraction-pipeline-design.md` | This spec. |

## Design

### 1. BPMN file: revert the unstaged Modeler re-save

The unstaged diff (504 lines changed, 184 insertions / 320 deletions) is a Camunda Modeler v5.20 → v5.44 re-save that stripped explanatory XML comments and collapsed whitespace. The `<bpmn:documentation>` tags inside each task are intact, so there is no semantic loss to the model — but the phase-marker comments (`PHASE 1: TRIGGER`, `PHASE 2: DATA EXTRACTION`, etc.) that make the raw XML legible to anyone opening the file directly are gone.

**Action:** Run `git checkout diagrams/kyc-bo-rescreening.bpmn` to restore the commented version. Before doing so, scan the full diff once more to confirm no semantic edits are hiding among the cosmetic noise.

**Rationale:** An interviewer may open the raw XML. The phase markers and the file-header comment block are reading aids that have value. The cleanup buys nothing.

### 2. README opener tighten

The current blurb is 60 words in one sentence. Replace with two shorter sentences that also forecast the new architecture section.

**Before** (README.md line 3):

> A Camunda BPMN + DMN showcase modelling how a CIB bank would operationalise the EU's 2024 Anti-Money Laundering regulatory overhaul into executable decision logic and process automation — including an LLM-to-DMN extraction proof of concept demonstrating how regulatory text can be semi-automatically decomposed into validated decision tables.

**After:**

> A Camunda BPMN + DMN showcase modelling how a CIB bank operationalises the EU's 2024 Anti-Money Laundering overhaul (AMLR / AMLD6) into executable decision logic. Includes an LLM-to-DMN extraction proof of concept — and an architectural sketch of how that pipeline scales across a regulation portfolio.

### 3. "Why This Project Exists" tighten

Paragraph 1 stays (it anchors the date, scope, and 10 July 2027 deadline). Collapse paragraphs 2 and 3 into a single paragraph that ends with a forward pointer to the new section.

**Replacement for paras 2-3:**

> The project models that re-screening process end-to-end: from regulatory change trigger to updated KYC records and ongoing monitoring schedule, with three linked DMN tables encoding the rules and a BPMN process orchestrating the work. It also includes an LLM-to-DMN extraction proof of concept showing how regulatory text can be semi-automatically decomposed into validated decision tables — with the DMN Modeller as the quality gate, not the bottleneck. The four-layer architecture below extends that PoC into a pipeline that can keep up with a regulation portfolio as it evolves.

### 4. New section: `## Scaling the Extraction Pipeline`

Inserted between `## LLM-to-DMN Extraction` and `## Extending This Project`. The "Extending" section is left intact because it covers BPMN/DMN scope expansion, not LLM-pipeline scaling.

#### 4.1 Opening (~3 sentences)

The PoC made five error categories visible: context loss, missing implicit rules, operator imprecision, hit-policy choice, and missing deltas from the prior regime. Each of the four techniques below closes one of those categories. Stacked, they turn one-shot extraction into a pipeline that scales across a regulation portfolio and improves with use.

#### 4.2 The four subsections

Each subsection follows the same shape:

- `### NN · <Theme> — <Concept name>`
- One italic subtitle line (the tagline from the HTML).
- 80–100 words of prose adapted from the HTML.
- A mermaid diagram (copied verbatim from the HTML).
- A two-column markdown table summarising the "Fixes / Doesn't fix" pair (or "Fixes / Implementation" / "Fixes / Bonus" / "Key idea / Feedback loop", matching the HTML).

**Subsection inventory:**

| # | Title | Tagline | Source HTML section |
|---|---|---|---|
| 01 | Retrieval — Hierarchical RAG | Preserves the document's spine. | `<!-- 1. Hierarchical RAG -->` |
| 02 | Structure — Graph RAG | Regulation is a typed graph, not a pile of text. | `<!-- 2. Graph RAG -->` |
| 03 | Specialisation — Multi-Agent Review | One narrow job per agent. | `<!-- 3. Multi-agent -->` |
| 04 | Evolution — The Self-Sustaining Loop | Humans review diffs, not documents. | `<!-- 4. Self-sustaining loop -->` |

#### 4.3 Mermaid diagrams

Copy each mermaid block verbatim from the HTML. Strip the `classDef` color directives — they were tuned for the cream paper theme (`#FBF8F0`, `#B5391A`, etc.) and would render oddly against GitHub's white/dark themes. GitHub mermaid will pick sensible defaults.

Each diagram is wrapped in a fenced ```` ```mermaid ```` block.

#### 4.4 Closing (one short blockquote)

> RAG fixes context. Graph RAG fixes structure. Multi-agent fixes specialisation. The loop fixes time. Each addresses a failure mode the PoC made visible; together they turn extraction into an institution that learns.

### 5. Commit strategy

Two commits, in this order:

1. **`chore: revert unstaged Modeler re-save of BPMN`** — restore the commented v5.20 file.
2. **`docs: tighten README opener and add Scaling the Extraction Pipeline section`** — both the opener/Why tighten and the new section land together because they share a single narrative beat (the opener now points forward to the new section).

## Acceptance criteria

- The unstaged BPMN modification is resolved; `git status` is clean on `diagrams/`.
- README opener is two sentences and mentions both the PoC and the architectural sketch.
- The "Scaling the Extraction Pipeline" section exists, contains four subsections following the shape in §4.2, and renders correctly on GitHub (mermaid blocks display).
- The "Extending This Project" section is unchanged.
- Only `README.md` is modified; the BPMN file is reverted to HEAD; this spec is the only new file.
- Each subsection of the new section explicitly names the PoC error category it addresses.

## Out of scope (deferred)

These came up in brainstorming and were explicitly not chosen:

- Add LICENSE file (README claims MIT but no file).
- Add a "Start Here / 5-minute tour" callout at the top of README.
- Render mermaid diagrams to static SVG/PNG.
- Host the HTML page (as-is or via GitHub Pages).

If any of these come up post-interview, they can be picked up in a separate spec.

## Risks

- **Mermaid rendering on GitHub:** Two of the four diagrams use double-quoted node labels with HTML line breaks (`<br/>`) — GitHub's mermaid renderer supports both, but if any subgraph turns out flaky we can fall back to plain text labels. Verify by previewing the README on a branch before merging.
- **Section length:** The new section will add ~1,000–1,400 words to the README. This was an accepted tradeoff (option A) — the one-to-one PoC-failure-mode mapping is the section's whole point.
