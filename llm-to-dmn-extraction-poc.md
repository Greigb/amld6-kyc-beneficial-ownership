# LLM-to-DMN Extraction — Proof of Concept

> Demonstrating how regulatory text can be semi-automatically decomposed into executable DMN decision tables using an LLM extraction agent, with human validation by a DMN Modeller.

---

## 1. The Problem

Financial regulations are published as natural language legal text. Converting these into executable business rules today requires a compliance SME to manually read, interpret, and encode each clause — a process that is slow, error-prone, and doesn't scale.

HSBC's Codify programme aims to systematically encode bank policies and regulations into machine-executable formats. To do this at the scale of a global CIB operation across thousands of policies, an **LLM-assisted extraction pipeline** is needed — with a **DMN Modeller** validating and correcting the output.

This document walks through the full pipeline using a real regulatory article as input.

---

## 2. The Pipeline

```
┌──────────────────┐
│  REGULATORY TEXT  │  Raw legal language (PDF / HTML / EUR-Lex)
│  (Source of Truth)│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  LLM EXTRACTION  │  Structured prompt → Claude / GPT extracts:
│  AGENT           │  - Conditions (field, operator, value)
│                  │  - Actions / outputs
│                  │  - Exceptions and qualifiers
│                  │  - Source article references
│                  │  → Output: Draft rules as structured JSON
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  JSON → DMN      │  Code layer (Python / JS) transforms
│  TRANSFORMER     │  structured JSON into valid DMN XML:
│                  │  - Input entries with FEEL expressions
│                  │  - Output entries
│                  │  - Hit policy assignment
│                  │  - DRD wiring
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  DMN MODELLER    │  Human expert validates:
│  VALIDATION      │  ✓ Completeness (missing rules?)
│  (YOUR ROLE)     │  ✓ Correctness (thresholds, operators)
│                  │  ✓ Edge cases (linked txns, exemptions)
│                  │  ✓ FEEL syntax
│                  │  ✓ Hit policy selection
│                  │  ✓ DRD integration
│                  │  → Output: Production-ready DMN
└──────────────────┘
```

---

## 3. Worked Example: AMLR Article 19 — CDD Trigger Conditions

### 3.1 Source Regulatory Text

The following is drawn from **Regulation (EU) 2024/1624, Article 19** — the provision that defines when obliged entities must apply Customer Due Diligence measures.

> **Article 19 — Application of customer due diligence measures**
>
> 1. Obliged entities shall apply customer due diligence measures in the following circumstances:
>
>    (a) when establishing a business relationship;
>
>    (b) when carrying out an occasional transaction that amounts to EUR 10 000 or more, whether the transaction is carried out in a single operation or in several operations which appear to be linked;
>
>    (c) when carrying out an occasional transaction that constitutes a transfer of funds as defined in Article 3, point (9) of Regulation (EU) 2023/1113 exceeding EUR 1 000;
>
>    (d) when there is a suspicion of money laundering or terrorist financing, regardless of any derogation, exemption or threshold;
>
>    (e) when there are doubts about the veracity or adequacy of previously obtained customer identification data.
>
> 2. In addition to the circumstances referred to in paragraph 1, credit institutions and financial institutions shall apply customer due diligence measures when carrying out an occasional transaction in cash amounting to EUR 3 000 or more, whether the transaction is carried out in a single operation or in several operations which appear to be linked.
>
> 3. In addition to the circumstances referred to in paragraph 1, providers of gambling services shall apply customer due diligence measures when carrying out an occasional transaction amounting to EUR 2 000 or more, whether the transaction is carried out in a single operation or in several operations which appear to be linked.
>
> 4. In addition to the circumstances referred to in paragraphs 1 and 2, crypto-asset service providers shall apply customer due diligence measures when carrying out an occasional transaction amounting to EUR 1 000 or more, whether the transaction is carried out in a single operation or in several operations which appear to be linked.

*(Note: This is a simplified excerpt for demonstration purposes. The full article contains additional sub-paragraphs and cross-references.)*

---

### 3.2 LLM Extraction Prompt

The following prompt would be sent to the LLM extraction agent:

```
You are a regulatory extraction agent. Your task is to extract all 
decision rules from the following regulatory text and return them as 
a structured JSON array.

For each rule, extract:
- rule_id: A unique identifier (format: "ART19-001")
- source: The specific article and paragraph reference
- description: A plain-English summary of the rule
- conditions: An array of conditions, each with:
  - field: The data field being evaluated
  - operator: The comparison operator (>=, >, ==, !=, IN, etc.)
  - value: The threshold or value
  - unit: The unit of measure (EUR, days, etc.) or null
- qualifiers: Any scope limitations, entity-type restrictions, or 
  exceptions that narrow when this rule applies
- action: The required action when conditions are met, with:
  - cdd_level: The CDD level triggered (FULL, LIMITED, STANDARD, ENHANCED)
  - linked_transactions: Whether linked transactions must be aggregated (boolean)
- priority: Relative priority if rules overlap (1 = highest)

Return ONLY valid JSON. No markdown, no preamble, no explanation.

REGULATORY TEXT:
[Article 19 text inserted here]
```

---

### 3.3 LLM Raw Output

The LLM returns the following structured extraction:

```json
{
  "extraction_metadata": {
    "source_regulation": "Regulation (EU) 2024/1624",
    "article": "Article 19",
    "title": "Application of customer due diligence measures",
    "extraction_timestamp": "2026-03-28T12:00:00Z"
  },
  "rules": [
    {
      "rule_id": "ART19-001",
      "source": "Art. 19(1)(a)",
      "description": "CDD required when establishing any new business relationship",
      "conditions": [
        {
          "field": "transaction_type",
          "operator": "==",
          "value": "business_relationship_establishment",
          "unit": null
        }
      ],
      "qualifiers": ["Applies to all obliged entities"],
      "action": {
        "cdd_level": "STANDARD",
        "linked_transactions": false
      },
      "priority": 1
    },
    {
      "rule_id": "ART19-002",
      "source": "Art. 19(1)(b)",
      "description": "CDD required for occasional transactions >= EUR 10,000",
      "conditions": [
        {
          "field": "transaction_type",
          "operator": "==",
          "value": "occasional",
          "unit": null
        },
        {
          "field": "transaction_value",
          "operator": ">=",
          "value": 10000,
          "unit": "EUR"
        }
      ],
      "qualifiers": [
        "Applies to all obliged entities",
        "Single operation or several linked operations"
      ],
      "action": {
        "cdd_level": "STANDARD",
        "linked_transactions": true
      },
      "priority": 2
    },
    {
      "rule_id": "ART19-003",
      "source": "Art. 19(1)(c)",
      "description": "CDD required for fund transfers exceeding EUR 1,000",
      "conditions": [
        {
          "field": "transaction_type",
          "operator": "==",
          "value": "fund_transfer",
          "unit": null
        },
        {
          "field": "transaction_value",
          "operator": ">",
          "value": 1000,
          "unit": "EUR"
        }
      ],
      "qualifiers": [
        "Applies to all obliged entities",
        "Transfer of funds as defined in Regulation (EU) 2023/1113 Art. 3(9)"
      ],
      "action": {
        "cdd_level": "STANDARD",
        "linked_transactions": false
      },
      "priority": 2
    },
    {
      "rule_id": "ART19-004",
      "source": "Art. 19(1)(d)",
      "description": "CDD required whenever ML/TF suspicion exists",
      "conditions": [
        {
          "field": "ml_tf_suspicion",
          "operator": "==",
          "value": true,
          "unit": null
        }
      ],
      "qualifiers": [
        "Applies regardless of any derogation, exemption or threshold",
        "Overrides all other rules"
      ],
      "action": {
        "cdd_level": "STANDARD",
        "linked_transactions": false
      },
      "priority": 0
    },
    {
      "rule_id": "ART19-005",
      "source": "Art. 19(1)(e)",
      "description": "CDD required when doubts about existing identification data",
      "conditions": [
        {
          "field": "identification_doubts",
          "operator": "==",
          "value": true,
          "unit": null
        }
      ],
      "qualifiers": ["Applies to all obliged entities"],
      "action": {
        "cdd_level": "STANDARD",
        "linked_transactions": false
      },
      "priority": 1
    },
    {
      "rule_id": "ART19-006",
      "source": "Art. 19(2)",
      "description": "CDD for cash transactions >= EUR 3,000 by credit/financial institutions",
      "conditions": [
        {
          "field": "transaction_type",
          "operator": "==",
          "value": "occasional_cash",
          "unit": null
        },
        {
          "field": "transaction_value",
          "operator": ">=",
          "value": 3000,
          "unit": "EUR"
        }
      ],
      "qualifiers": [
        "Applies only to credit institutions and financial institutions",
        "Single operation or several linked operations"
      ],
      "action": {
        "cdd_level": "LIMITED",
        "linked_transactions": true
      },
      "priority": 3
    },
    {
      "rule_id": "ART19-007",
      "source": "Art. 19(3)",
      "description": "CDD for gambling transactions >= EUR 2,000",
      "conditions": [
        {
          "field": "transaction_type",
          "operator": "==",
          "value": "occasional_gambling",
          "unit": null
        },
        {
          "field": "transaction_value",
          "operator": ">=",
          "value": 2000,
          "unit": "EUR"
        }
      ],
      "qualifiers": [
        "Applies only to providers of gambling services",
        "Single operation or several linked operations"
      ],
      "action": {
        "cdd_level": "STANDARD",
        "linked_transactions": true
      },
      "priority": 3
    },
    {
      "rule_id": "ART19-008",
      "source": "Art. 19(4)",
      "description": "CDD for crypto-asset transactions >= EUR 1,000",
      "conditions": [
        {
          "field": "transaction_type",
          "operator": "==",
          "value": "occasional_crypto",
          "unit": null
        },
        {
          "field": "transaction_value",
          "operator": ">=",
          "value": 1000,
          "unit": "EUR"
        }
      ],
      "qualifiers": [
        "Applies only to crypto-asset service providers",
        "Single operation or several linked operations"
      ],
      "action": {
        "cdd_level": "STANDARD",
        "linked_transactions": true
      },
      "priority": 3
    }
  ]
}
```

---

### 3.4 DMN Modeller Validation — What the LLM Got Right and Wrong

This is where the human DMN Modeller (your role) adds value that the LLM cannot.

#### ✅ What the LLM Got Right

| Item | Assessment |
|---|---|
| Rule identification | Correctly identified all 8 distinct rules from paragraphs 1-4 |
| Threshold values | All EUR thresholds correctly extracted (10K, 3K, 2K, 1K) |
| Operator for most thresholds | Correctly used `>=` for Art. 19(1)(b), (2), (3), (4) |
| Linked transactions flag | Correctly identified which rules require aggregation of linked operations |
| Entity-type scoping | Correctly narrowed rules 6-8 to specific entity types |
| Suspicion override | Correctly noted that Art. 19(1)(d) overrides all thresholds |
| Source references | Accurate article and paragraph citations |

#### ❌ Error 1: Wrong Operator on Art. 19(1)(c) — Fund Transfer Threshold

**LLM output:** `"operator": ">"` (strictly greater than 1000)

**Correct:** `"operator": ">"` — but this is actually nuanced. The regulation says "exceeding EUR 1 000", which in legal drafting means strictly greater than (>), not greater than or equal to (>=). The LLM got this right, but for the wrong reason — it likely defaulted to `>` rather than recognising the legal distinction between "amounting to" (>=) and "exceeding" (>).

**Validation note:** This is a critical distinction. Art. 19(1)(b) uses "amounts to EUR 10 000 **or more**" → `>=`, while Art. 19(1)(c) uses "**exceeding** EUR 1 000" → `>`. The LLM happened to get the right operators but didn't flag the linguistic difference. A DMN Modeller must catch this pattern because getting it wrong means either over- or under-applying CDD.

**Status:** ✅ Correct output, but ⚠️ reasoning not demonstrated — flag for review.

#### ❌ Error 2: CDD Level for Art. 19(2) Cash Transactions

**LLM output:** `"cdd_level": "LIMITED"`

**Correct:** The LLM correctly identified this as LIMITED CDD, but the distinction between LIMITED and STANDARD CDD is defined elsewhere in the regulation (Articles 20-22 define what standard CDD entails; the RTS under Art. 28 will specify what "limited" means). The LLM made an assumption here that should be flagged — the term "limited CDD measures" appears in the regulation but the specific measures are not defined in Article 19 alone.

**Validation note:** In the DMN table, this should be modelled as a separate output value with a note that the specific measures are pending AMLA RTS publication (expected July 2026).

**Status:** ⚠️ Partially correct — needs qualification.

#### ❌ Error 3: Missing Rule — CASPs Below EUR 1,000

**LLM missed:** Article 19(4) also states that CASPs must apply *at least identification and verification* (limited CDD) for occasional transactions **below** EUR 1,000. The LLM only extracted the ≥ EUR 1,000 threshold but missed the below-threshold obligation.

**What the regulation actually says:** CASPs have a *two-tier* obligation:
- ≥ EUR 1,000 → full CDD
- < EUR 1,000 → at minimum, identify and verify the customer's identity

**Validation note:** This is a classic LLM extraction failure — it captures explicit thresholds but misses the implicit "below threshold" obligation that applies to a specific entity type. A DMN Modeller must add this as an additional rule.

**Corrected rule to add:**

```json
{
  "rule_id": "ART19-008b",
  "source": "Art. 19(4)",
  "description": "Limited CDD for CASP transactions below EUR 1,000",
  "conditions": [
    {
      "field": "obliged_entity_type",
      "operator": "==",
      "value": "CASP"
    },
    {
      "field": "transaction_type",
      "operator": "==",
      "value": "occasional_crypto"
    },
    {
      "field": "transaction_value",
      "operator": "<",
      "value": 1000,
      "unit": "EUR"
    }
  ],
  "action": {
    "cdd_level": "LIMITED",
    "linked_transactions": false
  }
}
```

**Status:** ❌ Missing rule — must be added.

#### ❌ Error 4: Missing Cross-Reference to Art. 19(1)(b) Threshold Change

**LLM missed:** The regulation lowered this threshold from EUR 15,000 (under AMLD4) to EUR 10,000. While the LLM correctly extracted the new threshold, it did not flag this as a **change** from the prior regime. For a re-screening use case, this delta is critical — it means clients who previously fell below the CDD trigger now require CDD.

**Validation note:** In a production pipeline, the extraction prompt should be enhanced to ask the LLM to compare against the prior directive and flag all changed thresholds. This is metadata rather than a rule error, but it's essential for the re-screening BPMN process.

**Status:** ⚠️ Not an error per se, but a gap in the extraction prompt design.

#### ❌ Error 5: Hit Policy Not Specified

**LLM output:** No hit policy recommendation.

**Correct:** This table requires **RULE LIST** (or COLLECT) hit policy because:
- Multiple rules can fire for the same transaction (e.g., a CASP cash transaction could trigger both Art. 19(1)(b) and Art. 19(4))
- Art. 19(1)(d) — suspicion — always fires regardless of other rules
- The highest CDD level among all matching rules should apply

**Validation note:** Hit policy selection is a modelling decision, not a regulatory extraction. This is a core competency of the DMN Modeller role — LLMs consistently fail to recommend appropriate hit policies because they don't understand the execution semantics of DMN.

**Status:** ❌ Missing — DMN Modeller must determine.

---

### 3.5 Corrected & Validated DMN Decision Table

After validation, the final table contains **9 rules** (one added) with a **FIRST** hit policy (ordered by specificity, suspicion rule first):

| # | Source | Suspicion? | ID Doubts? | Entity Type | Txn Type | Txn Value | → CDD Level | → Linked Txn Check |
|---|---|---|---|---|---|---|---|---|
| 1 | Art. 19(1)(d) | Yes | — | — | — | — | STANDARD | No |
| 2 | Art. 19(1)(e) | — | Yes | — | — | — | STANDARD | No |
| 3 | Art. 19(1)(a) | — | — | — | New relationship | — | STANDARD | No |
| 4 | Art. 19(4) | — | — | CASP | Occasional crypto | ≥ 1,000 | STANDARD | Yes |
| 5 | Art. 19(4) | — | — | CASP | Occasional crypto | < 1,000 | LIMITED | No |
| 6 | Art. 19(3) | — | — | Gambling | Occasional gambling | ≥ 2,000 | STANDARD | Yes |
| 7 | Art. 19(2) | — | — | Credit/Financial | Occasional cash | ≥ 3,000 | LIMITED | Yes |
| 8 | Art. 19(1)(c) | — | — | — | Fund transfer | > 1,000 | STANDARD | No |
| 9 | Art. 19(1)(b) | — | — | — | Occasional | ≥ 10,000 | STANDARD | Yes |

**Hit Policy: FIRST** — Rules are ordered by specificity and priority. Suspicion and ID doubts override all thresholds. Entity-specific rules (CASP, Gambling, Credit/Financial) are evaluated before general rules to ensure sector-specific thresholds apply correctly.

---

### 3.6 Validation Summary

| Metric | Count |
|---|---|
| Rules extracted by LLM | 8 |
| Rules after validation | 9 (+1 added) |
| Correct extractions | 5 |
| Partially correct (needed qualification) | 2 |
| Errors caught (wrong operator reasoning) | 1 |
| Missing rules added | 1 |
| Missing modelling decisions (hit policy) | 1 |
| **LLM accuracy rate** | **~63% production-ready without human review** |

**Conclusion:** The LLM captured the majority of rules and thresholds correctly, but missed an implicit below-threshold obligation, failed to recommend a hit policy, and didn't flag the threshold change from prior regulation. These are precisely the gaps that the DMN Modeller role is designed to fill — the LLM gets you 60-70% of the way there, but the last 30-40% requires regulatory domain expertise and DMN modelling skill.

---

## 4. Why This Approach Scales

| Manual Process | LLM-Assisted Process |
|---|---|
| SME reads 300-page regulation | LLM pre-extracts rules from each article |
| SME builds DMN tables from scratch | SME validates and corrects pre-built tables |
| ~2-4 hours per article | ~30-45 minutes per article |
| Knowledge locked in one person's head | Extraction prompts are reusable and versioned |
| Error-prone transcription | Systematic validation checklist |
| Doesn't scale across 1,000+ policies | Scales with prompt library + validation framework |

For a programme like HSBC Codify — which aims to encode the bank's entire policy landscape — this pipeline is the only viable path. The DMN Modeller is the quality gate that makes it trustworthy.

---

## 5. Validation Checklist for DMN Modellers

When validating any LLM-extracted DMN table, check:

- [ ] **Completeness:** Are all rules from the source text captured? Look for implicit obligations (below-threshold, fallback, exception cases)
- [ ] **Operator precision:** Does "at least" → `>=`, "exceeding" → `>`, "more than" → `>`? Legal drafting is precise; LLMs often aren't
- [ ] **Scope qualifiers:** Are entity-type restrictions correctly applied? (e.g., "credit institutions only" vs "all obliged entities")
- [ ] **Cross-references:** Does the article reference other articles, regulations, or annexes that affect the rule logic?
- [ ] **Linked transactions:** Where aggregation of linked operations is required, is it flagged?
- [ ] **Hit policy:** Is the appropriate DMN hit policy selected? (LLMs almost never get this right)
- [ ] **FEEL syntax:** Are expressions valid in the target engine (Camunda/Trisotech)?
- [ ] **Change detection:** For re-screening, are threshold/rule changes from prior regulation flagged?
- [ ] **RTS dependencies:** Are any rules pending further specification via Regulatory Technical Standards?
- [ ] **DRD integration:** Does this table connect correctly to upstream/downstream decisions?

---

## 6. Regulatory Sources

- Regulation (EU) 2024/1624, Article 19 — Application of customer due diligence measures
- Regulation (EU) 2023/1113, Article 3(9) — Definition of transfer of funds
- Accountancy Europe, "Navigating the EU Anti-Money Laundering Regulation" (December 2024)
- AML Watcher, "AMLR 27: What the EU's New AML Regulation Means for CDD" (March 2026)
