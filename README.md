# KYC Beneficial Ownership Re-screening — EU AML Package (AMLR / AMLD6)

> A Camunda BPMN + DMN showcase modelling how a CIB bank would operationalise the EU's 2024 Anti-Money Laundering regulatory overhaul into executable decision logic and process automation — including an LLM-to-DMN extraction proof of concept demonstrating how regulatory text can be semi-automatically decomposed into validated decision tables.

---

## Why This Project Exists

On 31 May 2024, the EU adopted a comprehensive overhaul of its AML/CFT framework — replacing the directive-based approach with a directly applicable regulation for the first time. For Commercial & Investment Banking, this means every existing client relationship must be re-evaluated against updated beneficial ownership rules, new CDD thresholds, and harmonised EDD triggers before the **10 July 2027** application date.

This project models that re-screening process end-to-end: from regulatory change trigger through to updated KYC records and ongoing monitoring schedules. It demonstrates how regulatory language can be decomposed into **structured, auditable, executable decision logic** using DMN, orchestrated by a BPMN process.

The project also includes an **LLM-to-DMN extraction proof of concept** — showing how an LLM agent can pre-extract decision rules from regulatory text, with a DMN Modeller validating and correcting the output. This reflects the emerging workflow where LLM-assisted extraction scales regulatory encoding across large policy landscapes, with human expertise as the quality gate.

---

## Regulatory Scope

The model implements rules from three instruments in the EU AML Package:

| Instrument | Reference | Applies From |
|---|---|---|
| **AMLR** — Anti-Money Laundering Regulation | Regulation (EU) 2024/1624 | 10 July 2027 |
| **AMLD6** — Sixth Anti-Money Laundering Directive | Directive (EU) 2024/1640 | Transposition by 10 July 2027 |
| **AMLA** — EU AML Authority Regulation | Regulation (EU) 2024/1620 | Operational from 1 July 2025 |

### Key Rule Changes Modelled

**Beneficial Ownership — Dual-Test Framework**
- Standard ownership threshold retained at **25%** (direct or indirect)
- European Commission empowered to lower to **15%** for high-risk sectors via delegated act
- Mandatory parallel **control-via-other-means** test (veto rights, director appointment, dominant influence)
- **Senior managing official fallback** where neither test identifies a UBO, with full audit trail requirement

**Customer Due Diligence Thresholds**
- Occasional transaction CDD trigger lowered from EUR 15,000 to **EUR 10,000**
- New limited CDD for cash transactions ≥ **EUR 3,000**
- EU-wide cash payment cap of **EUR 10,000**

**Enhanced Due Diligence Triggers**
- Business relationships with assets ≥ **EUR 5 million**
- Customer net worth ≥ **EUR 50 million**
- PEP obligations extended **12 months post-function** (expanded definition includes regional/local authority heads)
- Mandatory **BO register cross-checking** with discrepancy reporting

For the full regulatory analysis, see [`docs/amld6-regulatory-summary.md`](docs/amld6-regulatory-summary.md).

---

## Architecture

### Decision Requirement Diagram (DRD)

The three DMN decision tables are linked in a chain — each table's output feeds the next:

```
┌─────────────────────┐     ┌─────────────────────┐
│   Customer Data     │     │  Control Indicators  │
│ (ownership %, type, │     │ (veto, appointments, │
│  jurisdiction)      │     │  dominant influence)  │
└────────┬────────────┘     └──────────┬───────────┘
         │                             │
         └──────────┬──────────────────┘
                    ▼
   ┌────────────────────────────────┐
   │  1. Beneficial Ownership       │  Hit Policy: FIRST
   │     Assessment                 │  7 rules
   │                                │
   │  Ownership test → Control test │
   │  → Senior mgmt fallback       │
   └───────────────┬────────────────┘
                   │  uboIdentified
                   │  identificationMethod
                   │  applicableThreshold
                   ▼
   ┌────────────────────────────────┐     ┌──────────────────┐
   │  2. Risk Tier                  │◄────│  Risk Factors    │
   │     Classification             │     │  (PEP, jurisd.,  │
   │                                │     │   assets, struct) │
   │  Annex III risk factor eval    │     └──────────────────┘
   │  HIGH / MEDIUM / LOW           │  Hit Policy: PRIORITY
   └───────────────┬────────────────┘  8 rules
                   │  riskTier
                   │  cddLevel
                   │  riskRationale
                   ▼
   ┌────────────────────────────────┐     ┌──────────────────┐
   │  3. EDD Requirements           │◄────│  Relationship    │
   │     Determination              │     │  Data            │
   │                                │     │  (corresp. bank, │
   │  Collects all applicable EDD   │     │   product type)  │
   │  measures for HIGH-risk clients│     └──────────────────┘
   └────────────────────────────────┘
      Hit Policy: COLLECT — 12 rules
      Outputs list of measures with
      categories + review frequencies
```

### BPMN Process Flow

```
 ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
 │ Reg      │    │ Extract  │    │ Cross-   │    │ Report   │
 │ Change   │───▶│ Client   │───▶│ Check BO │─?─▶│ Discrep- │
 │ Signal   │    │ Data     │    │ Registers│    │ ancy     │
 └──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                       │
                 ┌──────────┐    ┌──────────┐          │
                 │ Assess   │    │ Classify │◄─────────┘
                 │ BO       │───▶│ Risk     │
                 │ (DMN 1)  │    │ (DMN 2)  │
                 └──────────┘    └────┬─────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                  │
                    ▼                 ▼                  ▼
               ┌─────────┐    ┌───────────┐     ┌────────────┐
               │  HIGH   │    │  MEDIUM   │     │    LOW     │
               └────┬────┘    └─────┬─────┘     └──────┬─────┘
                    │               │                   │
                    ▼               ▼                   ▼
              ┌──────────┐   ┌───────────┐      ┌────────────┐
              │ EDD Reqs │   │ Analyst   │      │ Auto-      │
              │ (DMN 3)  │   │ Review    │      │ Approve    │
              └────┬─────┘   └─────┬─────┘      │ (Simpl.CDD)│
                   │               │             └──────┬─────┘
                   ▼          Approve/                  │
            ┌─────────────┐  Escalate to HIGH           │
            │ EDD Sub-    │        │                    │
            │ process     │        │                    │
            │ ┌─────────┐ │       │                    │
            │ │SoF→SoW→ │ │       │                    │
            │ │PEP→Chain│ │       │                    │
            │ │→Compile │ │       │                    │
            │ └─────────┘ │       │                    │
            └──────┬──────┘       │                    │
                   ▼              │                    │
            ┌─────────────┐       │                    │
            │ Senior Mgmt │       │                    │
            │ Approval    │       │                    │
            └──────┬──────┘       │                    │
                   │              │                    │
           Approve/Remediate/     │                    │
           Exit    │              │                    │
                   ▼              ▼                    ▼
              ┌──────────────────────────────────────────┐
              │              Merge Approved               │
              └────────────────────┬─────────────────────┘
                                   │
                    ┌──────────┐   │   ┌──────────┐   ┌─────┐
                    │ Update   │◄──┘   │Configure │   │     │
                    │ KYC      │──────▶│Monitoring│──▶│ End │
                    │ Record   │       │Schedule  │   │     │
                    └──────────┘       └──────────┘   └─────┘
```

---

## Project Structure

```
amld6-kyc-beneficial-ownership/
│
├── README.md                                 ← You are here
│
├── diagrams/
│   ├── kyc-bo-rescreening-drd.dmn           ← DRD: Links all 3 decisions with input data nodes
│   ├── bo-assessment.dmn                     ← DMN 1: Beneficial ownership dual-test (FIRST, 7 rules)
│   ├── risk-tier-classification.dmn          ← DMN 2: Risk tier & CDD level (PRIORITY, 8 rules)
│   ├── edd-requirements.dmn                  ← DMN 3: EDD measures list (COLLECT, 12 rules)
│   └── kyc-bo-rescreening.bpmn              ← BPMN: Full re-screening process (17 tasks, 4 gateways)
│
├── docs/
│   ├── amld6-regulatory-summary.md           ← Detailed regulatory analysis with source references
│   ├── test-scenarios.md                     ← 6 worked examples showing end-to-end decision chain
│   └── llm-to-dmn-extraction-poc.md          ← LLM extraction pipeline PoC with validation analysis
│
└── llm-to-dmn-demo.jsx                       ← Interactive React demo of the extraction & validation UI
```

---

## How to Open

### Prerequisites

- [Camunda Modeler](https://camunda.com/download/modeler/) (v5.x+ recommended — free download)

### Viewing the Diagrams

1. Clone or download this repository
2. Open Camunda Modeler
3. **Start with the DRD:** Open `diagrams/kyc-bo-rescreening-drd.dmn` to see how the three decisions connect
4. **Explore individual tables:** Double-click any decision in the DRD, or open each `.dmn` file directly to inspect the full rule sets
5. **View the process:** Open `diagrams/kyc-bo-rescreening.bpmn` to see the end-to-end BPMN workflow — expand the EDD sub-process to see the internal steps

### What to Look For

- **DRD:** The decision chain flows bottom-to-top — input data feeds BO Assessment, which feeds Risk Tier, which feeds EDD Requirements
- **DMN tables:** Each rule has a `<description>` annotation referencing the specific AMLR provision it implements
- **BPMN:** Every task has detailed `<documentation>` explaining the regulatory rationale — click any task in the Modeler to read it
- **Hit policies:** FIRST (BO Assessment — first matching rule wins), PRIORITY (Risk Tier — highest severity wins), COLLECT (EDD — all matching rules fire)
- **Test scenarios:** Read `docs/test-scenarios.md` to see 6 client profiles traced through the full decision chain — useful for validating the logic in Camunda Modeler
- **LLM extraction PoC:** Read `docs/llm-to-dmn-extraction-poc.md` for the full pipeline walkthrough, or open `llm-to-dmn-demo.jsx` as a React component to interact with the extraction and validation UI

---

## DMN Decision Logic Summary

### Table 1: Beneficial Ownership Assessment

| # | Ownership % | High-Risk Sector | Control Other Means | Entity Type | Steps Exhausted | → UBO Identified | → Method |
|---|---|---|---|---|---|---|---|
| 1 | ≥ 15% | Yes | — | — | — | Yes | Ownership (delegated act) |
| 2 | ≥ 25% | No | — | — | — | Yes | Ownership (standard) |
| 3 | < 15% | Yes | Yes | — | — | Yes | Control other means |
| 4 | < 25% | No | Yes | — | — | Yes | Control other means |
| 5 | < 25% | — | No | Trust | Yes | No | Senior mgmt fallback |
| 6 | < 25% | — | No | Not trust | Yes | No | Senior mgmt fallback |
| 7 | — | — | — | — | No | No | Investigation required |

### Table 2: Risk Tier Classification

| Trigger | → Risk Tier | → CDD Level |
|---|---|---|
| PEP involvement | HIGH | Enhanced |
| High-risk third country | HIGH | Enhanced |
| Assets ≥ EUR 5M | HIGH | Enhanced |
| Net worth ≥ EUR 50M | HIGH | Enhanced |
| UBO fallback (no UBO found) | HIGH | Enhanced |
| Complex structure (no other HIGH flags) | MEDIUM | Standard |
| Control-only UBO (no other HIGH flags) | MEDIUM | Standard |
| BO assessment incomplete | MEDIUM | Standard |
| Clear ownership, no flags, below thresholds | LOW | Simplified |

### Table 3: EDD Requirements (COLLECT — all matching rules fire)

| Trigger | EDD Measure | Review Freq. |
|---|---|---|
| All HIGH | Source of funds verification | Annual |
| All HIGH | Source of wealth verification | Annual |
| All HIGH | Senior management approval | At onboarding + annual |
| All HIGH | Enhanced transaction monitoring | Quarterly |
| All HIGH | BO register cross-check | Annual |
| PEP | PEP deep screening (incl. family/associates) | Quarterly |
| PEP | Post-function monitoring (min. 12 months) | Quarterly |
| High-risk jurisdiction | Additional jurisdiction risk review | Semi-annual |
| Complex structure | Full ownership chain mapping | Annual |
| High value (≥ EUR 5M) | Enhanced financial scrutiny | Quarterly |
| Correspondent banking | Respondent institution AML assessment | Annual |
| UBO fallback | Detailed audit trail of ID attempts | Semi-annual |

---

## BPMN Process Highlights

### Task Types Used

| Type | Count | Purpose |
|---|---|---|
| Signal Start Event | 1 | Regulatory change trigger |
| Service Tasks | 9 | Automated data extraction, register checks, approvals |
| Business Rule Tasks | 3 | DMN decision table invocations |
| User Tasks | 3 | Manual analyst review, senior management approval, remediation |
| Sub-Process | 1 | EDD execution (5 internal service tasks) |
| Exclusive Gateways | 4 | Discrepancy check, risk routing, compliance decision, analyst decision |
| End Events | 2 | Re-screening complete, client relationship exited |

### Design Decisions

**Why a Signal Start Event?** The re-screening is triggered by an external regulatory change, not by a single client event. A signal allows the process to be initiated for each client in the portfolio when the regulation takes effect.

**Why an EDD Sub-Process?** EDD measures are variable — the COLLECT hit policy means different clients may require different combinations. Encapsulating EDD in a sub-process keeps the main process clean and allows the sub-process to be independently versioned as AMLA guidance evolves.

**Why a Remediation Loop?** In practice, senior compliance managers rarely make a binary approve/reject decision. The loop back through remediation reflects the real-world back-and-forth where additional documentation or client action is needed before a final decision.

**Why an Escalation Path from MEDIUM?** Risk classification isn't always definitive. An analyst reviewing a MEDIUM-risk client may discover factors that the automated DMN tables didn't capture (e.g., adverse media), warranting escalation to the full EDD path.

---

## FEEL Expressions Used

The DMN tables use FEEL (Friendly Enough Expression Language) for input expressions and conditions:

```
// Jurisdiction-aware threshold (BO Assessment)
>= 15                          // Delegated act threshold
>= 25                          // Standard threshold

// List membership (Risk Tier — accepted identification methods)
"ownership_standard","ownership_delegated_act"

// Negation (BO Assessment — non-trust entities)
not("trust")

// Comparison (Risk Tier — value thresholds)
>= 5000000                     // EUR 5M asset threshold
>= 50000000                    // EUR 50M net worth threshold
< 5000000                      // Below asset threshold

// Process variables (BPMN gateway conditions)
${riskTier == 'HIGH'}
${complianceDecision == 'APPROVED'}
${registerDiscrepancyFound == true}
```

---

## Test Scenarios

Six worked examples in [`docs/test-scenarios.md`](docs/test-scenarios.md) show how different client profiles flow through the full decision chain. Each scenario traces the inputs through all three DMN tables and into the BPMN process routing.

| # | Client | DMN 1 Method | DMN 2 Tier | DMN 3 Measures | BPMN Path |
|---|---|---|---|---|---|
| 1 | MünchenTech GmbH — simple German corporate | Ownership (standard) | LOW | — | Auto-approve |
| 2 | Meridian Holdings — PEP-connected, high-value | Ownership (standard) | HIGH | 9 measures | EDD → Senior approval |
| 3 | CryptoVault AG — delegated act sector | Ownership (delegated act) | LOW | — | Auto-approve |
| 4 | Seaview Trading — opaque BVI/Panama structure | Senior mgmt fallback | HIGH | 9 measures | EDD → likely EXIT |
| 5 | Nordic Shipping — analyst escalation | Control other means | MEDIUM → HIGH | Escalated | Analyst → Escalate → EDD |
| 6 | Atlas Commercial Bank — correspondent banking | Senior mgmt fallback | HIGH | 9 measures (incl. corresp.) | EDD → Senior approval |

Key scenarios to highlight: **Scenario 3** shows the delegated act threshold catching UBOs at 18% that the standard 25% test would miss. **Scenario 5** demonstrates analyst escalation from MEDIUM to HIGH based on adverse media — proving why human judgment remains essential alongside automated DMN logic.

---

## LLM-to-DMN Extraction

This project includes a proof of concept for semi-automated regulatory extraction — relevant to any programme that aims to encode regulations at scale (such as HSBC's Codify initiative).

### Documentation PoC

[`docs/llm-to-dmn-extraction-poc.md`](docs/llm-to-dmn-extraction-poc.md) walks through the full pipeline using AMLR Article 19 (CDD trigger conditions) as the source text:

1. **Raw regulatory text** — the source article
2. **LLM extraction prompt** — structured prompt design for rule extraction
3. **LLM raw output** — 8 rules extracted as structured JSON
4. **Validation analysis** — 5 specific errors/gaps identified:
   - Missing implicit below-threshold CASP obligation
   - Operator precision ("amounting to" vs "exceeding")
   - CDD level qualification pending AMLA RTS
   - Missing change detection from prior regime
   - No hit policy recommendation
5. **Corrected DMN table** — 9 validated rules ready for production
6. **Accuracy assessment** — ~63% of LLM output was production-ready without human review

### Interactive Demo

[`llm-to-dmn-demo.jsx`](llm-to-dmn-demo.jsx) is a working React application that demonstrates the extraction and validation workflow:

- **Input** — Paste any regulatory text (pre-loaded with Article 19)
- **Extract** — Calls Claude API to extract rules as structured JSON
- **Validate** — Approve ✓, flag ⚠, or reject ✕ each rule; expand for conditions; add validation notes
- **Export** — Generates a validation report with accuracy statistics and a DMN-ready table

### Why This Matters

The LLM gets you ~60-70% of the way to production-ready DMN. The remaining 30-40% — missing implicit rules, operator precision, hit policy selection, cross-reference handling, edge cases — is precisely where DMN Modeller expertise adds irreplaceable value. The pipeline scales regulatory encoding; the human expert makes it trustworthy.

---

## Extending This Project

This model covers the core re-screening workflow and extraction pipeline. Natural extensions include:

- **Event-driven KYC triggers** — Add intermediate message events for adverse media hits, sanctions list updates, or material transaction pattern changes
- **Parallel multi-entity processing** — Use a multi-instance sub-process to re-screen an entire client portfolio concurrently
- **SAR filing integration** — Add a conditional path from the EDD sub-process to suspicious activity reporting where indicators are found
- **AMLA RTS integration** — As AMLA publishes Regulatory Technical Standards (expected by July 2026/2027), update the DMN tables with granular thresholds
- **Sanctions screening** — Add a parallel BPMN lane for real-time sanctions list checking (OFSI / OFAC / EU consolidated list)
- **Second regulatory model** — Apply the same approach to a different regulation (e.g., MiFID II client categorisation) to demonstrate that the methodology generalises
- **Camunda 8 deployment** — Deploy the process and DMN tables to Camunda 8 SaaS (free trial) for live execution and testing

---

## Regulatory Sources

- Regulation (EU) 2024/1624 (AMLR) — [Official Journal, 19 June 2024](https://eur-lex.europa.eu/eli/reg/2024/1624)
- Directive (EU) 2024/1640 (AMLD6) — [Official Journal, 19 June 2024](https://eur-lex.europa.eu/eli/dir/2024/1640)
- Regulation (EU) 2024/1620 (AMLA) — [Official Journal, 19 June 2024](https://eur-lex.europa.eu/eli/reg/2024/1620)

---

## Author

Built as a demonstration of decomposing financial regulation into executable DMN decision logic and BPMN process automation — bridging the gap between compliance policy and technology implementation. Includes a proof of concept for LLM-assisted regulatory extraction with human validation, reflecting the emerging workflow for encoding regulations at scale.

## License

MIT
