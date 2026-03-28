# Test Scenarios — KYC Beneficial Ownership Re-screening

> Six worked examples showing how different client profiles flow through the three linked DMN decision tables and into the BPMN process routing.

---

## How to Read These Scenarios

Each scenario provides:
1. **Client profile** — the input data
2. **DMN 1 result** — Beneficial Ownership Assessment
3. **DMN 2 result** — Risk Tier Classification
4. **DMN 3 result** — EDD Requirements (only if HIGH risk)
5. **BPMN path** — which route the process takes

---

## Scenario 1: Straightforward Low-Risk Corporate

### Client Profile

| Field | Value |
|---|---|
| Client Name | MünchenTech GmbH |
| Entity Type | Corporate |
| Jurisdiction | Germany (EU) |
| Ownership | Single founder holds 80% directly |
| High-Risk Sector (Delegated Act) | No |
| Control Via Other Means | No (ownership is clear) |
| PEP Flag | No |
| High-Risk Jurisdiction | No |
| Complex Structure | No |
| Asset Value | EUR 1,200,000 |
| Customer Net Worth | EUR 3,500,000 |
| Correspondent Banking | No |

### Decision Chain

**DMN 1 — BO Assessment**
→ Rule 2 fires: ownership ≥ 25%, standard sector
→ Output: `uboIdentified = true`, `identificationMethod = "ownership_standard"`, `applicableThreshold = 25`

**DMN 2 — Risk Tier**
→ Rule L1 fires: UBO identified via ownership, no PEP, no high-risk jurisdiction, no complex structure, below both value thresholds
→ Output: `riskTier = "LOW"`, `cddLevel = "SIMPLIFIED"`, `riskRationale = "Low-risk profile — simplified due diligence applicable"`

**DMN 3 — EDD Requirements**
→ Not invoked (only fires for HIGH risk)

**BPMN Path:** Risk gateway → LOW → Auto-Approve (Simplified CDD) → Update KYC Record → Configure Monitoring (annual review) → End

---

## Scenario 2: PEP-Connected High-Value Client

### Client Profile

| Field | Value |
|---|---|
| Client Name | Meridian Holdings Ltd |
| Entity Type | Corporate |
| Jurisdiction | Luxembourg |
| Ownership | Family trust holds 40% via two intermediate SPVs |
| High-Risk Sector (Delegated Act) | No |
| Control Via Other Means | No (ownership above threshold) |
| PEP Flag | Yes — UBO's spouse is a current EU government minister |
| High-Risk Jurisdiction | No |
| Complex Structure | Yes — multi-layered cross-jurisdictional holding |
| Asset Value | EUR 28,000,000 |
| Customer Net Worth | EUR 120,000,000 |
| Correspondent Banking | No |

### Decision Chain

**DMN 1 — BO Assessment**
→ Rule 2 fires: ownership ≥ 25% (40% indirect via trust), standard sector
→ Output: `uboIdentified = true`, `identificationMethod = "ownership_standard"`, `applicableThreshold = 25`

**DMN 2 — Risk Tier**
→ Multiple HIGH rules match. PRIORITY hit policy returns highest severity.
→ Rule H1 (PEP), H3 (assets ≥ EUR 5M), H4 (net worth ≥ EUR 50M) all fire
→ Output: `riskTier = "HIGH"`, `cddLevel = "ENHANCED"`, `riskRationale = "PEP involvement — mandatory EDD per AMLR"`

**DMN 3 — EDD Requirements (COLLECT — all matching rules fire)**

| # | EDD Measure | Category | Frequency |
|---|---|---|---|
| 1 | Source of funds verification | SOURCE_OF_FUNDS | Annual |
| 2 | Source of wealth verification | SOURCE_OF_WEALTH | Annual |
| 3 | Senior management approval | SENIOR_MGMT_APPROVAL | At onboarding + annual |
| 4 | Enhanced transaction monitoring | ENHANCED_MONITORING | Quarterly |
| 5 | PEP deep screening (incl. family/associates) | PEP_SCREENING | Quarterly |
| 6 | Post-function monitoring flag (min. 12 months) | PEP_POST_FUNCTION_MONITORING | Quarterly |
| 8 | Ownership chain mapping (complex structure) | OWNERSHIP_CHAIN_MAPPING | Annual |
| 9 | Enhanced financial scrutiny (high value) | HIGH_VALUE_SCRUTINY | Quarterly |
| 12 | BO register cross-check | REGISTER_CROSS_CHECK | Annual |

→ 9 EDD measures collected

**BPMN Path:** Risk gateway → HIGH → EDD Requirements (DMN 3) → EDD Sub-process (SoF → SoW → PEP Deep Screen → Ownership Chain Analysis → Compile Package) → Senior Management Approval → Approved → Update KYC Record → Configure Monitoring (quarterly) → End

---

## Scenario 3: High-Risk Sector — Delegated Act Threshold

### Client Profile

| Field | Value |
|---|---|
| Client Name | CryptoVault AG |
| Entity Type | Corporate |
| Jurisdiction | Estonia |
| Ownership | Three co-founders each hold 18% (54% combined); rest held by VC fund |
| High-Risk Sector (Delegated Act) | Yes — European Commission delegated act applies to crypto-asset sector |
| Control Via Other Means | No |
| PEP Flag | No |
| High-Risk Jurisdiction | No |
| Complex Structure | No |
| Asset Value | EUR 800,000 |
| Customer Net Worth | EUR 4,200,000 |
| Correspondent Banking | No |

### Decision Chain

**DMN 1 — BO Assessment**
→ Rule 1 fires: ownership ≥ 15% (each founder holds 18%), high-risk sector = true
→ All three co-founders identified as UBOs under the delegated act threshold
→ Output: `uboIdentified = true`, `identificationMethod = "ownership_delegated_act"`, `applicableThreshold = 15`

**DMN 2 — Risk Tier**
→ Rule L1 fires: UBO identified via ownership (delegated act), no PEP, no high-risk jurisdiction, no complex structure, below value thresholds
→ Output: `riskTier = "LOW"`, `cddLevel = "SIMPLIFIED"`

**Key Insight:** The delegated act threshold caught UBOs that the standard 25% test would have missed (each founder holds only 18%). However, because no other risk indicators are present, the client still classifies as LOW risk. The threshold is about *identification completeness*, not automatic risk escalation.

**BPMN Path:** LOW → Auto-Approve → Update KYC Record → End

---

## Scenario 4: Opaque Structure — Senior Management Fallback

### Client Profile

| Field | Value |
|---|---|
| Client Name | Seaview Trading Corp |
| Entity Type | Corporate |
| Jurisdiction | British Virgin Islands (via UK branch) |
| Ownership | 100% held by a Panamanian foundation; foundation's beneficial interests distributed to a discretionary class with no named individuals holding ≥ 25% |
| High-Risk Sector (Delegated Act) | No |
| Control Via Other Means | No — no single natural person has veto, appointment rights, or dominant influence identifiable from available documentation |
| PEP Flag | No |
| High-Risk Jurisdiction | Yes — BVI is on EU high-risk third country list |
| Complex Structure | Yes — multi-jurisdictional, foundation → corporate chain |
| Asset Value | EUR 12,000,000 |
| Customer Net Worth | Unknown (foundation structure obscures) |
| Correspondent Banking | No |
| All ID Steps Exhausted | Yes |

### Decision Chain

**DMN 1 — BO Assessment**
→ Rule 6 fires: ownership < 25%, control via other means = false, entity type ≠ trust, all steps exhausted = true
→ Output: `uboIdentified = false`, `identificationMethod = "senior_management_fallback"`, `applicableThreshold = 25`

**DMN 2 — Risk Tier**
→ Multiple HIGH rules match:
→ Rule H2 (high-risk jurisdiction — BVI), H3 (assets ≥ EUR 5M), H5 (senior management fallback)
→ Output: `riskTier = "HIGH"`, `cddLevel = "ENHANCED"`, `riskRationale = "High-risk third country jurisdiction"`

**DMN 3 — EDD Requirements (COLLECT)**

| # | EDD Measure | Category | Frequency |
|---|---|---|---|
| 1 | Source of funds verification | SOURCE_OF_FUNDS | Annual |
| 2 | Source of wealth verification | SOURCE_OF_WEALTH | Annual |
| 3 | Senior management approval | SENIOR_MGMT_APPROVAL | At onboarding + annual |
| 4 | Enhanced transaction monitoring | ENHANCED_MONITORING | Quarterly |
| 7 | Additional jurisdiction risk review | HIGH_RISK_JURISDICTION_REVIEW | Semi-annual |
| 8 | Ownership chain mapping | OWNERSHIP_CHAIN_MAPPING | Annual |
| 9 | Enhanced financial scrutiny | HIGH_VALUE_SCRUTINY | Quarterly |
| 11 | UBO fallback audit trail documentation | UBO_FALLBACK_DOCUMENTATION | Semi-annual |
| 12 | BO register cross-check | REGISTER_CROSS_CHECK | Annual |

→ 9 EDD measures collected

**Key Insight:** This is exactly the kind of client the AMLR is designed to catch. The opaque foundation structure defeats the ownership test, no identifiable controlling person defeats the control test, the fallback kicks in, and the combination of fallback + high-risk jurisdiction + high value creates a dense EDD package. Senior management may well decide to exit this relationship.

**BPMN Path:** HIGH → EDD Sub-process → Senior Management Approval → likely EXIT path → Initiate Client Relationship Exit → End (Relationship Exited)

---

## Scenario 5: Medium Risk — Analyst Escalation to HIGH

### Client Profile

| Field | Value |
|---|---|
| Client Name | Nordic Shipping Partners KS |
| Entity Type | Partnership |
| Jurisdiction | Norway (EEA) |
| Ownership | Managing partner holds 15% direct ownership |
| High-Risk Sector (Delegated Act) | No |
| Control Via Other Means | Yes — managing partner has sole authority to bind the partnership, appoint/remove limited partners, and veto major transactions |
| PEP Flag | No |
| High-Risk Jurisdiction | No |
| Complex Structure | No |
| Asset Value | EUR 3,400,000 |
| Customer Net Worth | EUR 8,000,000 |
| Correspondent Banking | No |

### Decision Chain

**DMN 1 — BO Assessment**
→ Rule 4 fires: ownership < 25%, standard sector, but control via other means = true
→ Output: `uboIdentified = true`, `identificationMethod = "control_other_means"`, `applicableThreshold = 25`

**DMN 2 — Risk Tier**
→ Rule M2 fires: UBO identified, method = control_other_means, no PEP, no high-risk jurisdiction, no complex structure, below value thresholds
→ Output: `riskTier = "MEDIUM"`, `cddLevel = "STANDARD"`, `riskRationale = "UBO via control test only — warrants closer scrutiny"`

**BPMN Path:** MEDIUM → KYC Analyst Manual Review

**Analyst finds:** During manual review, the analyst discovers adverse media indicating the managing partner is under investigation by Norwegian financial authorities for suspected trade-based money laundering. This information was not captured in the automated inputs.

**Analyst decision:** ESCALATE to HIGH

**Escalated Path:** Analyst escalation → EDD Requirements (DMN 3 now fires) → EDD Sub-process → Senior Management Approval → Decision

**Key Insight:** This scenario demonstrates why the MEDIUM → analyst → escalate path exists. Automated decision tables work on structured data, but real-world KYC requires human judgment for unstructured risk signals like adverse media. The BPMN process design accommodates this deliberately.

---

## Scenario 6: Correspondent Banking Relationship

### Client Profile

| Field | Value |
|---|---|
| Client Name | Atlas Commercial Bank (respondent institution) |
| Entity Type | Corporate (credit institution) |
| Jurisdiction | Turkey |
| Ownership | Publicly listed — no single shareholder above 10% |
| High-Risk Sector (Delegated Act) | No |
| Control Via Other Means | No — dispersed public ownership |
| PEP Flag | No |
| High-Risk Jurisdiction | Yes — Turkey is on the EU high-risk third country list |
| Complex Structure | No |
| Asset Value | EUR 250,000,000 (correspondent banking exposure) |
| Customer Net Worth | N/A (institutional) |
| Correspondent Banking | Yes |
| All ID Steps Exhausted | Yes |

### Decision Chain

**DMN 1 — BO Assessment**
→ Rule 6 fires: no shareholder ≥ 25%, no control via other means (dispersed public), all steps exhausted
→ Output: `uboIdentified = false`, `identificationMethod = "senior_management_fallback"`, `applicableThreshold = 25`

**DMN 2 — Risk Tier**
→ Multiple HIGH rules: H2 (high-risk jurisdiction), H3 (assets ≥ EUR 5M), H5 (senior management fallback)
→ Output: `riskTier = "HIGH"`, `cddLevel = "ENHANCED"`

**DMN 3 — EDD Requirements (COLLECT)**

| # | EDD Measure | Category | Frequency |
|---|---|---|---|
| 1 | Source of funds verification | SOURCE_OF_FUNDS | Annual |
| 2 | Source of wealth verification | SOURCE_OF_WEALTH | Annual |
| 3 | Senior management approval | SENIOR_MGMT_APPROVAL | At onboarding + annual |
| 4 | Enhanced transaction monitoring | ENHANCED_MONITORING | Quarterly |
| 7 | Additional jurisdiction risk review | HIGH_RISK_JURISDICTION_REVIEW | Semi-annual |
| 9 | Enhanced financial scrutiny | HIGH_VALUE_SCRUTINY | Quarterly |
| 10 | Respondent institution AML assessment | CORRESPONDENT_BANKING_EDD | Annual |
| 11 | UBO fallback audit trail | UBO_FALLBACK_DOCUMENTATION | Semi-annual |
| 12 | BO register cross-check | REGISTER_CROSS_CHECK | Annual |

→ 9 EDD measures collected — note the **correspondent banking-specific** rule (EDD-10) that only fires for this relationship type

**Key Insight:** Correspondent banking is called out specifically in the AMLR as requiring dedicated EDD. The COLLECT hit policy means the correspondent banking measure stacks on top of all the other applicable EDD measures. This scenario also shows the senior management fallback applying correctly to a publicly listed institution — it's not a risk signal per se (dispersed ownership is normal for listed banks), but the regulation still requires the fallback documentation.

**BPMN Path:** HIGH → EDD Sub-process → Senior Management Approval → Approved (with conditions) → Update KYC Record → Configure Monitoring (quarterly) → End

---

## Scenario Summary Matrix

| # | Client | DMN 1 Method | DMN 2 Tier | DMN 3 Measures | BPMN Path |
|---|---|---|---|---|---|
| 1 | MünchenTech GmbH | Ownership (standard) | LOW | — | Auto-approve |
| 2 | Meridian Holdings | Ownership (standard) | HIGH | 9 measures | EDD → Senior approval |
| 3 | CryptoVault AG | Ownership (delegated act) | LOW | — | Auto-approve |
| 4 | Seaview Trading | Senior mgmt fallback | HIGH | 9 measures | EDD → likely EXIT |
| 5 | Nordic Shipping | Control other means | MEDIUM → HIGH | Escalated | Analyst → Escalate → EDD |
| 6 | Atlas Commercial Bank | Senior mgmt fallback | HIGH | 9 measures (incl. corresp.) | EDD → Senior approval |
