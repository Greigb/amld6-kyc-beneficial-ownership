import { useState, useCallback } from "react";

const SAMPLE_TEXT = `Article 19 — Application of customer due diligence measures

1. Obliged entities shall apply customer due diligence measures in the following circumstances:

(a) when establishing a business relationship;

(b) when carrying out an occasional transaction that amounts to EUR 10 000 or more, whether the transaction is carried out in a single operation or in several operations which appear to be linked;

(c) when carrying out an occasional transaction that constitutes a transfer of funds as defined in Article 3, point (9) of Regulation (EU) 2023/1113 exceeding EUR 1 000;

(d) when there is a suspicion of money laundering or terrorist financing, regardless of any derogation, exemption or threshold;

(e) when there are doubts about the veracity or adequacy of previously obtained customer identification data.

2. In addition to the circumstances referred to in paragraph 1, credit institutions and financial institutions shall apply customer due diligence measures when carrying out an occasional transaction in cash amounting to EUR 3 000 or more, whether the transaction is carried out in a single operation or in several operations which appear to be linked.

3. In addition to the circumstances referred to in paragraph 1, providers of gambling services shall apply customer due diligence measures when carrying out an occasional transaction amounting to EUR 2 000 or more.

4. In addition to the circumstances referred to in paragraphs 1 and 2, crypto-asset service providers shall apply customer due diligence measures when carrying out an occasional transaction amounting to EUR 1 000 or more. CASPs shall also at least identify the customer and verify the customer's identity for occasional transactions below EUR 1 000.`;

const EXTRACTION_PROMPT = `You are a regulatory extraction agent for a financial compliance system. Extract ALL decision rules from the regulatory text below and return them as a JSON array.

For each rule extract:
- rule_id: unique ID like "ART19-001"
- source: specific article/paragraph reference (e.g. "Art. 19(1)(a)")
- description: plain English summary (1 sentence)
- conditions: array of {field, operator, value, unit}
- entity_scope: which entities this applies to ("all" or specific type)
- cdd_level: "STANDARD", "LIMITED", or "ENHANCED"
- linked_transactions: boolean
- priority: 0=highest (suspicion overrides all), 1=high, 2=medium, 3=sector-specific

Return ONLY a valid JSON object with a "rules" array. No markdown, no backticks, no explanation.

REGULATORY TEXT:
`;

const statusColors = {
  pending: { bg: "#2a2a3e", border: "#4a4a6a", text: "#a0a0c0", label: "Pending Review" },
  approved: { bg: "#1a2e1a", border: "#2d6a2d", text: "#5cb85c", label: "Approved" },
  flagged: { bg: "#3e2a1a", border: "#8a6a2a", text: "#e8a838", label: "Flagged for Edit" },
  rejected: { bg: "#2e1a1a", border: "#6a2d2d", text: "#d9534f", label: "Rejected" },
};

// ---------------------------------------------------------------------------
// DMN XML generator — converts validated rules into a Camunda-compatible
// DMN 1.3 decision table that can be opened directly in Camunda Modeler.
// ---------------------------------------------------------------------------
function generateDmnXml(approvedRules) {
  const escXml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  // Collect unique input columns from all approved rules
  const inputFields = new Map();
  for (const rule of approvedRules) {
    for (const c of rule.conditions || []) {
      if (!inputFields.has(c.field)) {
        inputFields.set(c.field, { field: c.field, type: typeof c.value === "boolean" ? "boolean" : typeof c.value === "number" ? "number" : "string" });
      }
    }
  }
  const inputs = [...inputFields.values()];

  const feelType = (t) => (t === "number" ? "number" : t === "boolean" ? "boolean" : "string");

  // Build input clauses
  const inputClauses = inputs.map((inp, i) =>
    `      <input id="Input_${i + 1}" label="${escXml(inp.field)}">
        <inputExpression id="InputExpr_${i + 1}" typeRef="${feelType(inp.type)}">
          <text>${escXml(inp.field)}</text>
        </inputExpression>
      </input>`
  ).join("\n");

  // Build output clauses
  const outputClauses =
    `      <output id="Output_1" label="cddLevel" typeRef="string" />
      <output id="Output_2" label="entityScope" typeRef="string" />
      <output id="Output_3" label="linkedTransactions" typeRef="boolean" />`;

  // Build rules
  const ruleRows = approvedRules.map((rule, ri) => {
    // For each input column, find the matching condition in this rule
    const inputEntries = inputs.map((inp, ci) => {
      const cond = (rule.conditions || []).find(c => c.field === inp.field);
      let expression = "";
      if (cond) {
        if (typeof cond.value === "boolean") {
          expression = String(cond.value);
        } else if (typeof cond.value === "number") {
          expression = `${cond.operator} ${cond.value}`;
        } else {
          expression = `"${escXml(String(cond.value))}"`;
        }
      }
      return `        <inputEntry id="IE_${ri + 1}_${ci + 1}"><text>${expression || ""}</text></inputEntry>`;
    }).join("\n");

    const outputEntries =
      `        <outputEntry id="OE_${ri + 1}_1"><text>"${escXml(rule.cdd_level || "STANDARD")}"</text></outputEntry>
        <outputEntry id="OE_${ri + 1}_2"><text>"${escXml(rule.entity_scope || "all")}"</text></outputEntry>
        <outputEntry id="OE_${ri + 1}_3"><text>${rule.linked_transactions ? "true" : "false"}</text></outputEntry>`;

    return `      <rule id="Rule_${ri + 1}">
        <description>${escXml(rule.source + " — " + rule.description)}</description>
${inputEntries}
${outputEntries}
      </rule>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/"
             xmlns:dmndi="https://www.omg.org/spec/DMN/20191111/DMNDI/"
             xmlns:dc="http://www.omg.org/spec/DMN/20180521/DC/"
             xmlns:camunda="http://camunda.org/schema/1.0/dmn"
             id="Definitions_LLMExtracted"
             name="LLM-Extracted CDD Triggers"
             namespace="http://camunda.org/schema/1.0/dmn">

  <decision id="Decision_CddTriggers" name="CDD Trigger Conditions (LLM-Extracted)">
    <decisionTable id="DecisionTable_1" hitPolicy="FIRST">
${inputClauses}
${outputClauses}
${ruleRows}
    </decisionTable>
  </decision>

  <dmndi:DMNDI>
    <dmndi:DMNDiagram>
      <dmndi:DMNShape dmnElementRef="Decision_CddTriggers">
        <dc:Bounds height="80" width="180" x="160" y="100" />
      </dmndi:DMNShape>
    </dmndi:DMNDiagram>
  </dmndi:DMNDI>
</definitions>
`;
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const RuleCard = ({ rule, onStatusChange, onNoteChange }) => {
  const status = statusColors[rule._status || "pending"];
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState(rule._note || "");

  return (
    <div style={{
      background: status.bg,
      border: `1px solid ${status.border}`,
      borderRadius: 8,
      padding: "16px 20px",
      marginBottom: 12,
      transition: "all 0.2s ease",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              color: "#8888aa",
              background: "#1a1a2e",
              padding: "2px 8px",
              borderRadius: 4,
            }}>{rule.rule_id}</span>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              color: "#6688cc",
            }}>{rule.source}</span>
            <span style={{
              fontSize: 10,
              color: status.text,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}>{status.label}</span>
          </div>
          <p style={{
            fontFamily: "'Source Serif 4', Georgia, serif",
            fontSize: 14,
            color: "#d0d0e0",
            margin: 0,
            lineHeight: 1.5,
          }}>{rule.description}</p>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {["approved", "flagged", "rejected"].map(s => (
            <button key={s} onClick={() => onStatusChange(rule.rule_id, s)} style={{
              background: rule._status === s ? statusColors[s].border : "transparent",
              border: `1px solid ${statusColors[s].border}`,
              color: statusColors[s].text,
              borderRadius: 6,
              padding: "4px 10px",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "'IBM Plex Mono', monospace",
              transition: "all 0.15s ease",
            }}>
              {s === "approved" ? "\u2713" : s === "flagged" ? "\u26A0" : "\u2715"}
            </button>
          ))}
        </div>
      </div>

      <button onClick={() => setExpanded(!expanded)} style={{
        background: "none",
        border: "none",
        color: "#6688cc",
        fontSize: 11,
        cursor: "pointer",
        padding: "6px 0 0",
        fontFamily: "'IBM Plex Mono', monospace",
      }}>
        {expanded ? "\u25BE Hide details" : "\u25B8 Show conditions & logic"}
      </button>

      {expanded && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #2a2a4e" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: "#6666aa", textTransform: "uppercase", marginBottom: 4, fontFamily: "'IBM Plex Mono', monospace" }}>Entity Scope</div>
              <div style={{ fontSize: 13, color: "#c0c0d8" }}>{rule.entity_scope || "all"}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#6666aa", textTransform: "uppercase", marginBottom: 4, fontFamily: "'IBM Plex Mono', monospace" }}>CDD Level</div>
              <div style={{ fontSize: 13, color: rule.cdd_level === "ENHANCED" ? "#e8a838" : rule.cdd_level === "LIMITED" ? "#6688cc" : "#5cb85c" }}>{rule.cdd_level}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#6666aa", textTransform: "uppercase", marginBottom: 4, fontFamily: "'IBM Plex Mono', monospace" }}>Linked Txn Check</div>
              <div style={{ fontSize: 13, color: "#c0c0d8" }}>{rule.linked_transactions ? "Yes" : "No"}</div>
            </div>
          </div>

          {rule.conditions && rule.conditions.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: "#6666aa", textTransform: "uppercase", marginBottom: 6, fontFamily: "'IBM Plex Mono', monospace" }}>Conditions</div>
              {rule.conditions.map((c, i) => (
                <div key={i} style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 12,
                  color: "#a0c0e0",
                  background: "#12122a",
                  padding: "4px 10px",
                  borderRadius: 4,
                  marginBottom: 4,
                  display: "inline-block",
                  marginRight: 6,
                }}>
                  {c.field} {c.operator} {c.value}{c.unit ? ` ${c.unit}` : ""}
                </div>
              ))}
            </div>
          )}

          <div>
            <div style={{ fontSize: 10, color: "#6666aa", textTransform: "uppercase", marginBottom: 4, fontFamily: "'IBM Plex Mono', monospace" }}>Validation Note</div>
            <textarea
              value={note}
              onChange={e => { setNote(e.target.value); onNoteChange(rule.rule_id, e.target.value); }}
              placeholder="Add validation notes, corrections, or flags..."
              rows={2}
              style={{
                width: "100%",
                background: "#12122a",
                border: "1px solid #2a2a4e",
                borderRadius: 6,
                color: "#c0c0d8",
                padding: "8px 10px",
                fontSize: 12,
                fontFamily: "'Source Serif 4', Georgia, serif",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default function LLMtoDMNExtractor() {
  const [regText, setRegText] = useState(SAMPLE_TEXT);
  const [rules, setRules] = useState([]);
  const [phase, setPhase] = useState("input"); // input, extracting, review, summary
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState("");
  const [dmnPreview, setDmnPreview] = useState(null);

  const extractRules = useCallback(async () => {
    setPhase("extracting");
    setError(null);
    setProgress("Sending regulatory text to LLM extraction agent...");

    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("VITE_ANTHROPIC_API_KEY not set — add it to demo/.env");

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          messages: [{ role: "user", content: EXTRACTION_PROMPT + regText }],
        }),
      });

      setProgress("Parsing LLM response...");
      const data = await response.json();
      const text = data.content.map(b => b.text || "").join("");
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      const enriched = (parsed.rules || parsed).map(r => ({
        ...r,
        _status: "pending",
        _note: "",
      }));

      setRules(enriched);
      setProgress("");
      setPhase("review");
    } catch (err) {
      setError(`Extraction failed: ${err.message}. The demo will load sample data instead.`);
      loadSampleData();
    }
  }, [regText]);

  const loadSampleData = () => {
    const sample = [
      { rule_id: "ART19-001", source: "Art. 19(1)(a)", description: "CDD required when establishing any new business relationship", conditions: [{ field: "transaction_type", operator: "==", value: "new_relationship", unit: null }], entity_scope: "all", cdd_level: "STANDARD", linked_transactions: false, priority: 1 },
      { rule_id: "ART19-002", source: "Art. 19(1)(b)", description: "CDD required for occasional transactions amounting to EUR 10,000 or more", conditions: [{ field: "transaction_type", operator: "==", value: "occasional", unit: null }, { field: "transaction_value", operator: ">=", value: 10000, unit: "EUR" }], entity_scope: "all", cdd_level: "STANDARD", linked_transactions: true, priority: 2 },
      { rule_id: "ART19-003", source: "Art. 19(1)(c)", description: "CDD required for fund transfers exceeding EUR 1,000", conditions: [{ field: "transaction_type", operator: "==", value: "fund_transfer", unit: null }, { field: "transaction_value", operator: ">", value: 1000, unit: "EUR" }], entity_scope: "all", cdd_level: "STANDARD", linked_transactions: false, priority: 2 },
      { rule_id: "ART19-004", source: "Art. 19(1)(d)", description: "CDD required whenever ML/TF suspicion exists, regardless of any threshold", conditions: [{ field: "ml_tf_suspicion", operator: "==", value: true, unit: null }], entity_scope: "all", cdd_level: "STANDARD", linked_transactions: false, priority: 0 },
      { rule_id: "ART19-005", source: "Art. 19(1)(e)", description: "CDD required when doubts exist about previously obtained customer identification data", conditions: [{ field: "identification_doubts", operator: "==", value: true, unit: null }], entity_scope: "all", cdd_level: "STANDARD", linked_transactions: false, priority: 1 },
      { rule_id: "ART19-006", source: "Art. 19(2)", description: "CDD for occasional cash transactions amounting to EUR 3,000 or more by credit/financial institutions", conditions: [{ field: "transaction_type", operator: "==", value: "occasional_cash", unit: null }, { field: "transaction_value", operator: ">=", value: 3000, unit: "EUR" }], entity_scope: "credit institutions and financial institutions", cdd_level: "LIMITED", linked_transactions: true, priority: 3 },
      { rule_id: "ART19-007", source: "Art. 19(3)", description: "CDD for gambling transactions amounting to EUR 2,000 or more", conditions: [{ field: "transaction_type", operator: "==", value: "occasional_gambling", unit: null }, { field: "transaction_value", operator: ">=", value: 2000, unit: "EUR" }], entity_scope: "gambling service providers", cdd_level: "STANDARD", linked_transactions: true, priority: 3 },
      { rule_id: "ART19-008", source: "Art. 19(4)", description: "CDD for crypto-asset transactions amounting to EUR 1,000 or more", conditions: [{ field: "transaction_type", operator: "==", value: "occasional_crypto", unit: null }, { field: "transaction_value", operator: ">=", value: 1000, unit: "EUR" }], entity_scope: "crypto-asset service providers", cdd_level: "STANDARD", linked_transactions: true, priority: 3 },
    ].map(r => ({ ...r, _status: "pending", _note: "" }));
    setRules(sample);
    setPhase("review");
  };

  const updateStatus = (id, status) => {
    setRules(prev => prev.map(r => r.rule_id === id ? { ...r, _status: status } : r));
  };

  const updateNote = (id, note) => {
    setRules(prev => prev.map(r => r.rule_id === id ? { ...r, _note: note } : r));
  };

  const stats = {
    total: rules.length,
    approved: rules.filter(r => r._status === "approved").length,
    flagged: rules.filter(r => r._status === "flagged").length,
    rejected: rules.filter(r => r._status === "rejected").length,
    pending: rules.filter(r => r._status === "pending").length,
  };

  const allReviewed = stats.pending === 0 && stats.total > 0;

  const handleExportDmn = () => {
    const approved = rules.filter(r => r._status === "approved");
    if (approved.length === 0) return;
    const xml = generateDmnXml(approved);
    setDmnPreview(xml);
    downloadFile(xml, "cdd-triggers-extracted.dmn", "application/xml");
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0e0e1a",
      color: "#d0d0e0",
      fontFamily: "'Source Serif 4', Georgia, serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Source+Serif+4:wght@400;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #0e0e1a 0%, #1a1a3e 100%)",
        borderBottom: "1px solid #2a2a4e",
        padding: "24px 32px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 8,
            background: "linear-gradient(135deg, #4a6aaa, #2a4a8a)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 700, color: "#fff",
          }}>&#x2696;</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#e0e0f0", letterSpacing: "-0.02em" }}>
              LLM &rarr; DMN Extraction Agent
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: "#6666aa", fontFamily: "'IBM Plex Mono', monospace" }}>
              Regulatory text &rarr; Structured rules &rarr; Human validation &rarr; Production DMN
            </p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px 80px" }}>

        {/* Phase indicator */}
        <div style={{ display: "flex", gap: 0, marginBottom: 28 }}>
          {[
            { id: "input", label: "1. Input", icon: "\uD83D\uDCC4" },
            { id: "extracting", label: "2. Extract", icon: "\uD83E\uDD16" },
            { id: "review", label: "3. Validate", icon: "\uD83D\uDD0D" },
            { id: "summary", label: "4. Export", icon: "\u2713" },
          ].map((step) => {
            const phases = ["input", "extracting", "review", "summary"];
            const current = phases.indexOf(phase);
            const stepIdx = phases.indexOf(step.id);
            const isActive = stepIdx <= current;
            return (
              <div key={step.id} style={{
                flex: 1,
                padding: "10px 0",
                textAlign: "center",
                borderBottom: `2px solid ${isActive ? "#4a6aaa" : "#2a2a3e"}`,
                transition: "all 0.3s ease",
              }}>
                <span style={{
                  fontSize: 12,
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: isActive ? "#a0b8e0" : "#4a4a6a",
                }}>
                  {step.icon} {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* INPUT PHASE */}
        {phase === "input" && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: "#c0c0e0" }}>
              Paste Regulatory Text
            </h2>
            <p style={{ fontSize: 13, color: "#8888aa", marginBottom: 16, lineHeight: 1.6 }}>
              Paste any regulatory article below. The LLM extraction agent will identify decision rules,
              conditions, thresholds, and actions — then present them for your validation as DMN Modeller.
            </p>
            <textarea
              value={regText}
              onChange={e => setRegText(e.target.value)}
              rows={16}
              style={{
                width: "100%",
                background: "#12122a",
                border: "1px solid #2a2a4e",
                borderRadius: 8,
                color: "#c0c0d8",
                padding: "16px",
                fontSize: 13,
                fontFamily: "'Source Serif 4', Georgia, serif",
                lineHeight: 1.7,
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button onClick={extractRules} style={{
                background: "linear-gradient(135deg, #3a5a9a, #2a4a8a)",
                border: "none",
                color: "#e0e8f0",
                padding: "12px 28px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'IBM Plex Mono', monospace",
              }}>
                Extract Rules via LLM
              </button>
              <button onClick={loadSampleData} style={{
                background: "transparent",
                border: "1px solid #3a3a5e",
                color: "#8888aa",
                padding: "12px 28px",
                borderRadius: 8,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "'IBM Plex Mono', monospace",
              }}>
                Load Sample Data
              </button>
            </div>
          </div>
        )}

        {/* EXTRACTING PHASE */}
        {phase === "extracting" && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              border: "3px solid #2a2a4e",
              borderTopColor: "#4a6aaa",
              animation: "spin 1s linear infinite",
              margin: "0 auto 20px",
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ color: "#a0a0c0", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>
              {progress}
            </p>
            {error && (
              <p style={{ color: "#e8a838", fontSize: 12, marginTop: 12 }}>{error}</p>
            )}
          </div>
        )}

        {/* REVIEW PHASE */}
        {(phase === "review" || phase === "summary") && (
          <div>
            {error && (
              <div style={{
                background: "#2a2a1a",
                border: "1px solid #6a6a2a",
                borderRadius: 8,
                padding: "10px 16px",
                marginBottom: 16,
                fontSize: 12,
                color: "#e8c838",
                fontFamily: "'IBM Plex Mono', monospace",
              }}>
                {error}
              </div>
            )}

            {/* Stats bar */}
            <div style={{
              display: "flex",
              gap: 16,
              marginBottom: 20,
              padding: "12px 16px",
              background: "#14142a",
              borderRadius: 8,
              border: "1px solid #2a2a4e",
            }}>
              {[
                { label: "Total", value: stats.total, color: "#a0a0c0" },
                { label: "Approved", value: stats.approved, color: "#5cb85c" },
                { label: "Flagged", value: stats.flagged, color: "#e8a838" },
                { label: "Rejected", value: stats.rejected, color: "#d9534f" },
                { label: "Pending", value: stats.pending, color: "#6688cc" },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center", flex: 1 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: "'IBM Plex Mono', monospace" }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: "#6666aa", textTransform: "uppercase", fontFamily: "'IBM Plex Mono', monospace" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {phase === "review" && (
              <>
                <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: "#c0c0e0" }}>
                  Validate Extracted Rules
                </h2>
                <p style={{ fontSize: 12, color: "#6666aa", marginBottom: 16, fontFamily: "'IBM Plex Mono', monospace" }}>
                  Review each rule. Approve &#x2713;, Flag &#x26A0; for edit, or Reject &#x2715;. Expand for conditions and notes.
                </p>

                {rules.map(rule => (
                  <RuleCard
                    key={rule.rule_id}
                    rule={rule}
                    onStatusChange={updateStatus}
                    onNoteChange={updateNote}
                  />
                ))}

                <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                  <button onClick={() => setPhase("summary")} disabled={!allReviewed} style={{
                    background: allReviewed ? "linear-gradient(135deg, #2d6a2d, #1a4a1a)" : "#2a2a3e",
                    border: "none",
                    color: allReviewed ? "#a0e0a0" : "#4a4a6a",
                    padding: "12px 28px",
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: allReviewed ? "pointer" : "not-allowed",
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}>
                    {allReviewed ? "Generate Validation Report \u2192" : `${stats.pending} rules still pending review`}
                  </button>
                  <button onClick={() => { setPhase("input"); setRules([]); setError(null); setDmnPreview(null); }} style={{
                    background: "transparent",
                    border: "1px solid #3a3a5e",
                    color: "#8888aa",
                    padding: "12px 20px",
                    borderRadius: 8,
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}>
                    &larr; Start Over
                  </button>
                </div>
              </>
            )}

            {phase === "summary" && (
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "#c0c0e0" }}>
                  Validation Report
                </h2>

                <div style={{
                  background: "#14142a",
                  border: "1px solid #2a2a4e",
                  borderRadius: 8,
                  padding: 20,
                  marginBottom: 16,
                }}>
                  <h3 style={{ fontSize: 14, color: "#a0b8e0", marginTop: 0, marginBottom: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
                    Extraction Accuracy
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 32, fontWeight: 700, color: "#5cb85c", fontFamily: "'IBM Plex Mono', monospace" }}>
                        {stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%
                      </div>
                      <div style={{ fontSize: 11, color: "#6666aa", fontFamily: "'IBM Plex Mono', monospace" }}>PRODUCTION READY</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 32, fontWeight: 700, color: "#e8a838", fontFamily: "'IBM Plex Mono', monospace" }}>
                        {stats.flagged}
                      </div>
                      <div style={{ fontSize: 11, color: "#6666aa", fontFamily: "'IBM Plex Mono', monospace" }}>NEED CORRECTION</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 32, fontWeight: 700, color: "#d9534f", fontFamily: "'IBM Plex Mono', monospace" }}>
                        {stats.rejected}
                      </div>
                      <div style={{ fontSize: 11, color: "#6666aa", fontFamily: "'IBM Plex Mono', monospace" }}>REJECTED</div>
                    </div>
                  </div>
                </div>

                {/* Approved rules as DMN-ready table */}
                {stats.approved > 0 && (
                  <div style={{
                    background: "#14142a",
                    border: "1px solid #2a2a4e",
                    borderRadius: 8,
                    padding: 20,
                    marginBottom: 16,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <h3 style={{ fontSize: 14, color: "#a0b8e0", margin: 0, fontFamily: "'IBM Plex Mono', monospace" }}>
                        Validated Rules &rarr; Ready for DMN Export
                      </h3>
                      <button onClick={handleExportDmn} style={{
                        background: "linear-gradient(135deg, #3a5a9a, #2a4a8a)",
                        border: "none",
                        color: "#e0e8f0",
                        padding: "8px 18px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "'IBM Plex Mono', monospace",
                      }}>
                        Download .dmn File
                      </button>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
                        <thead>
                          <tr>
                            {["#", "Source", "Entity Scope", "Key Condition", "CDD Level", "Linked"].map(h => (
                              <th key={h} style={{ textAlign: "left", padding: "8px 10px", borderBottom: "1px solid #2a2a4e", color: "#6666aa", fontSize: 10, textTransform: "uppercase" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rules.filter(r => r._status === "approved").map((r, i) => (
                            <tr key={r.rule_id}>
                              <td style={{ padding: "8px 10px", borderBottom: "1px solid #1a1a3e", color: "#8888aa" }}>{i + 1}</td>
                              <td style={{ padding: "8px 10px", borderBottom: "1px solid #1a1a3e", color: "#6688cc" }}>{r.source}</td>
                              <td style={{ padding: "8px 10px", borderBottom: "1px solid #1a1a3e", color: "#c0c0d8" }}>{r.entity_scope || "all"}</td>
                              <td style={{ padding: "8px 10px", borderBottom: "1px solid #1a1a3e", color: "#a0c0e0" }}>
                                {r.conditions && r.conditions.length > 0
                                  ? r.conditions.map(c => `${c.field} ${c.operator} ${c.value}${c.unit ? " " + c.unit : ""}`).join(" AND ")
                                  : "\u2014"}
                              </td>
                              <td style={{ padding: "8px 10px", borderBottom: "1px solid #1a1a3e", color: r.cdd_level === "ENHANCED" ? "#e8a838" : r.cdd_level === "LIMITED" ? "#6688cc" : "#5cb85c" }}>{r.cdd_level}</td>
                              <td style={{ padding: "8px 10px", borderBottom: "1px solid #1a1a3e", color: "#c0c0d8" }}>{r.linked_transactions ? "\u2713" : "\u2014"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* DMN XML Preview */}
                {dmnPreview && (
                  <div style={{
                    background: "#0a0a18",
                    border: "1px solid #2a2a4e",
                    borderRadius: 8,
                    padding: 20,
                    marginBottom: 16,
                  }}>
                    <h3 style={{ fontSize: 14, color: "#a0b8e0", marginTop: 0, marginBottom: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
                      Generated DMN XML Preview
                    </h3>
                    <p style={{ fontSize: 11, color: "#6666aa", marginBottom: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
                      Open this file in Camunda Modeler to inspect and refine the decision table.
                    </p>
                    <pre style={{
                      background: "#06061a",
                      border: "1px solid #1a1a3e",
                      borderRadius: 6,
                      padding: 16,
                      fontSize: 11,
                      color: "#8888cc",
                      fontFamily: "'IBM Plex Mono', monospace",
                      overflowX: "auto",
                      maxHeight: 320,
                      overflowY: "auto",
                      lineHeight: 1.5,
                      margin: 0,
                      whiteSpace: "pre",
                    }}>
                      {dmnPreview}
                    </pre>
                  </div>
                )}

                {/* Flagged rules with notes */}
                {stats.flagged > 0 && (
                  <div style={{
                    background: "#1a1a10",
                    border: "1px solid #4a4a2a",
                    borderRadius: 8,
                    padding: 20,
                    marginBottom: 16,
                  }}>
                    <h3 style={{ fontSize: 14, color: "#e8a838", marginTop: 0, marginBottom: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
                      Flagged for Correction
                    </h3>
                    {rules.filter(r => r._status === "flagged").map(r => (
                      <div key={r.rule_id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid #2a2a1a" }}>
                        <span style={{ color: "#6688cc", fontSize: 12 }}>{r.rule_id}</span>
                        <span style={{ color: "#8888aa", fontSize: 12 }}> &mdash; {r.description}</span>
                        {r._note && <p style={{ color: "#e8c838", fontSize: 12, margin: "4px 0 0", fontStyle: "italic" }}>Note: {r._note}</p>}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{
                  background: "#14142a",
                  border: "1px solid #2a2a4e",
                  borderRadius: 8,
                  padding: 20,
                }}>
                  <h3 style={{ fontSize: 14, color: "#a0b8e0", marginTop: 0, marginBottom: 8, fontFamily: "'IBM Plex Mono', monospace" }}>
                    Next Steps
                  </h3>
                  <div style={{ fontSize: 13, color: "#a0a0c0", lineHeight: 1.8 }}>
                    <p style={{ margin: "0 0 8px" }}>1. Correct flagged rules and re-validate</p>
                    <p style={{ margin: "0 0 8px" }}>2. Check for missing implicit rules (e.g., below-threshold CASP obligations)</p>
                    <p style={{ margin: "0 0 8px" }}>3. Verify hit policy selection (FIRST recommended for this table)</p>
                    <p style={{ margin: "0 0 8px" }}>4. Open the downloaded .dmn in Camunda Modeler to inspect FEEL expressions</p>
                    <p style={{ margin: 0 }}>5. Wire into DRD and test with scenario data</p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                  <button onClick={() => setPhase("review")} style={{
                    background: "transparent",
                    border: "1px solid #3a3a5e",
                    color: "#8888aa",
                    padding: "12px 20px",
                    borderRadius: 8,
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}>
                    &larr; Back to Review
                  </button>
                  {stats.approved > 0 && !dmnPreview && (
                    <button onClick={handleExportDmn} style={{
                      background: "linear-gradient(135deg, #3a5a9a, #2a4a8a)",
                      border: "none",
                      color: "#e0e8f0",
                      padding: "12px 28px",
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}>
                      Export as DMN XML
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
