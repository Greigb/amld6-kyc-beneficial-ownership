# EU AML Package: Beneficial Ownership & KYC Impact Assessment

## Regulatory Context

### What Changed

On 31 May 2024, the EU adopted a comprehensive overhaul of its Anti-Money Laundering framework, replacing the directive-based approach (AMLD4/AMLD5) with a directly applicable regulation. The package consists of three instruments:

| Instrument | Reference | Key Date |
|---|---|---|
| **AMLR** — Anti-Money Laundering Regulation | Regulation (EU) 2024/1624 | Applies 10 July 2027 |
| **AMLD6** — Sixth Anti-Money Laundering Directive | Directive (EU) 2024/1640 | Transposition by 10 July 2027 |
| **AMLA Regulation** — EU AML Authority | Regulation (EU) 2024/1620 | Operational from 1 July 2025; direct supervision from 2028 |

The shift from directive to regulation is itself the headline change: for the first time, AML/CFT rules apply identically across all EU Member States with no national transposition buffer.

### Why This Matters for CIB

Commercial and Investment Banking clients — corporates, funds, SPVs, trusts, multi-jurisdictional holding structures — are precisely where beneficial ownership complexity is highest. The new framework directly impacts:

- **Client onboarding** (new and existing)
- **Periodic KYC reviews** (now moving toward perpetual/event-driven models)
- **Correspondent banking** and cross-border relationships
- **Trade finance** and complex product origination

---

## Beneficial Ownership: Key Rule Changes

### 1. Harmonised Dual-Test Framework

Under the new AMLR, beneficial ownership identification is based on **two mandatory components** that must both be analysed:

**Ownership Test:**
- Standard threshold: natural person holding **25% or more** direct or indirect ownership
- The European Commission may adopt a **delegated act to lower this to 15%** for higher-risk categories of legal entities, where justified by sector risk profile

**Control Test:**
- Identify natural persons exercising control through **other means**, including:
  - Veto rights over key decisions
  - Right to appoint or remove directors
  - Dominant influence through agreements or other arrangements
  - Control via nominee structures

### 2. Fallback: Senior Managing Official

If, after exhausting both the ownership and control tests, **no natural person qualifies as a UBO**, the obliged entity must:
- Identify the **senior managing official(s)** instead
- Record that this is a fallback identification, **not** a beneficial owner designation
- Maintain a **full audit trail** of what due diligence was performed, what was checked, and why no UBO could be identified

### 3. Enhanced Register Cross-Checking

Obliged entities must now:
- **Cross-check** client-provided information against national or EU central beneficial ownership registers
- **Report discrepancies** between client declarations and register data
- Registers themselves are subject to enhanced verification powers, including on-site inspections
- Registers will be **interconnected** across Member States via the European Central Platform (by 2029)

---

## Customer Due Diligence: Key Rule Changes

### CDD Threshold Changes

| Scenario | Previous (AMLD4) | New (AMLR) |
|---|---|---|
| Occasional transactions requiring CDD | EUR 15,000 | **EUR 10,000** |
| Cash transactions requiring limited CDD | — | **EUR 3,000** |
| EU-wide cash payment cap | Varied by Member State | **EUR 10,000** |

### Enhanced Due Diligence Triggers

The AMLR introduces harmonised EDD triggers relevant to CIB:

- **High-value relationships:** assets ≥ EUR 5 million, or customer net worth ≥ EUR 50 million
- **Politically Exposed Persons (PEPs):** EDD obligations now extend **at least 12 months** after the individual leaves a prominent public function; expanded definition includes heads of regional/local authorities
- **High-risk third countries:** as designated by the European Commission
- **Complex ownership structures:** multi-layered, cross-jurisdictional, or involving nominee arrangements
- **Correspondent banking relationships:** subject to specific EDD requirements

### Risk Assessment Framework

The draft Regulatory Technical Standards introduce a structured approach:

| Layer | Determined By |
|---|---|
| **Inherent Risk** | Customer type, product, channel, geography |
| **Control Effectiveness** | Governance, monitoring, escalation arrangements |
| **Residual Risk** | Drives supervisory attention and internal resourcing |

---

## Supervision: AMLA

The new Anti-Money Laundering Authority (AMLA), headquartered in Frankfurt:
- Became operational on **1 July 2025**
- Will begin **direct supervision** of up to 40 selected high-risk, cross-border obliged entities from **2028**
- Issues binding guidelines, technical standards, and can initiate cross-border investigations
- Coordinates national FIUs and ensures consistent enforcement

---

## Project Scope: What This Model Demonstrates

This Camunda project models the **operational impact** of the EU AML Package on a CIB bank's KYC processes. Specifically:

### BPMN Process
The re-screening workflow that a bank must execute when the new AMLR framework takes effect — evaluating its existing client portfolio against the updated beneficial ownership and CDD requirements.

### DMN Decision Tables
Three linked decision tables (forming a Decision Requirement Diagram) that automate the key regulatory determinations:

1. **Beneficial Ownership Assessment** — Apply the dual ownership + control test, including jurisdiction-specific threshold variations and the 15% delegated act provision
2. **Risk Tier Classification** — Assess inherent risk based on PEP status, jurisdiction risk, ownership complexity, and asset thresholds to determine CDD level (Standard / Simplified / Enhanced)
3. **EDD Requirements Determination** — For clients classified as high-risk, determine the specific Enhanced Due Diligence measures required

### Why DMN is the Right Tool

Regulatory rules like these are ideal candidates for DMN because:
- They are **deterministic** — given the same inputs, the same outcome should always result
- They are **auditable** — regulators expect to see the logic, not a black box
- They **change frequently** — new thresholds, new jurisdictions, new risk factors can be updated in the table without changing the process
- They **bridge business and tech** — compliance SMEs can read and validate DMN tables directly, unlike code

---

## Sources

- Regulation (EU) 2024/1624 (AMLR) — Official Journal, 19 June 2024
- Directive (EU) 2024/1640 (AMLD6) — Official Journal, 19 June 2024
- DLA Piper, "The New Anti-Money Laundering Rules: What You Need to Know" (December 2024)
- A&L Goodbody, "European Parliament adopts EU AML package" (2024)
- EY, "How EU leaders can stay ahead of AMLA and AMLR" (2026)
- Accountancy Europe, "Navigating the EU Anti-Money Laundering Regulation" (December 2024)
