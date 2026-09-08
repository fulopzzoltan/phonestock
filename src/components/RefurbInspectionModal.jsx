import { useMemo, useState } from "react";
import { REFURB_INSPECTION_QUESTIONS, CONDITION_GRADES, WARRANTIES, computeSuggestedGrade, conditionGradeKey } from "../lib/utils";
import { CloseIcon } from "./icons";
import { ChipField, DropdownField } from "./FormPickers";

export default function RefurbInspectionModal({ product, busy, onClose, onSave }) {
  const [answers, setAnswers] = useState(product.inspectionAnswers || {});
  const [decision, setDecision] = useState({
    condition: product.condition || "New",
    grade: product.grade || "A",
    warranty: product.warranty || "",
    batteryHealth: product.batteryHealth ?? "",
  });
  const [touchedDecision, setTouchedDecision] = useState(false);

  const allAnswered = REFURB_INSPECTION_QUESTIONS.every((q) => answers[q.key]);
  const suggestion = useMemo(() => (allAnswered ? computeSuggestedGrade(answers) : null), [answers, allAnswered]);

  // Amint minden kérdésre van válasz és a javaslat kigyűlik, az admin még nem piszkálta
  // kézzel a döntést — automatikusan előtöltjük a javasolt Grade/garanciát, hogy egy
  // kattintással menthető legyen, de bármikor felülírható.
  const effectiveDecision = !touchedDecision && suggestion?.gradeable
    ? { condition: "Refurbished", grade: suggestion.grade, warranty: suggestion.warranty, batteryHealth: suggestion.batteryHealth ?? decision.batteryHealth }
    : decision;

  function setAnswer(key, val) {
    setAnswers((a) => ({ ...a, [key]: val }));
  }
  function setDecisionField(patch) {
    setTouchedDecision(true);
    setDecision({ ...effectiveDecision, ...patch });
  }

  // Blokkoló hiba esetén is menthető a kitöltött kérdőív (audit-nyomnak, hogy mit találtunk) —
  // csak a minőség/garancia döntés és a polcra-küldés van letiltva, amíg a hiba nincs javítva.
  const canSaveAnswers = allAnswered;
  const canDecide = allAnswered && suggestion?.gradeable;

  return (
    <div className="overlay">
      <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <h2>
          Tesztelés — {product.brand} {product.model}
          <button className="iconbtn" onClick={onClose}><CloseIcon /></button>
        </h2>

        <div className="rf-inspect-questions">
          {REFURB_INSPECTION_QUESTIONS.map((q) => (
            <ChipField
              key={q.key}
              label={q.question}
              value={answers[q.key] || ""}
              onChange={(v) => setAnswer(q.key, v)}
              options={q.options.map((o) => ({ key: o.key, label: o.label }))}
            />
          ))}
        </div>

        {allAnswered && !suggestion.gradeable && (
          <div className="rf-inspect-blocked">
            Ez a telefon még nem sorolható be — előbb javítani kell: {suggestion.blockers.join(", ")}.
            Vedd fel feladatként a Felújítás kártyáján, és térj vissza a teszteléshez, ha kész.
          </div>
        )}

        {allAnswered && suggestion.gradeable && (
          <div className="rf-inspect-decision">
            <div className="rf-inspect-suggested">
              Javaslat a válaszok alapján: <b>{CONDITION_GRADES.find((g) => g.key === suggestion.grade)?.label}</b> minőség,{" "}
              <b>{suggestion.warranty}</b> garancia. Felülírhatod mentés előtt.
            </div>
            <ChipField
              label="Végleges minőség"
              value={conditionGradeKey(effectiveDecision.condition, effectiveDecision.grade)}
              onChange={(key) => setDecisionField(key === "New" ? { condition: "New", grade: "" } : { condition: "Refurbished", grade: key })}
              options={CONDITION_GRADES.map((g) => ({ key: g.key, label: g.label }))}
            />
            <div className="row2">
              <DropdownField
                label="Garancia"
                value={effectiveDecision.warranty}
                onChange={(v) => setDecisionField({ warranty: v })}
                options={[{ key: "", label: "Nincs" }, ...WARRANTIES.map((w) => ({ key: w, label: w }))]}
              />
              <div className="field">
                <label>Akkuegészség (%)</label>
                <input type="number" min="0" max="100" value={effectiveDecision.batteryHealth}
                  onChange={(e) => setDecisionField({ batteryHealth: e.target.value })} placeholder="pl. 92" />
              </div>
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn sec" onClick={onClose}>Mégse</button>
          <button className="btn sec" disabled={!canSaveAnswers || busy} onClick={() => onSave(canDecide ? effectiveDecision : null, answers, false)}>
            Mentés (marad javítandó)
          </button>
          <button className="btn" disabled={!canDecide || busy} onClick={() => onSave(effectiveDecision, answers, true)}>
            {busy ? "Mentés..." : "Kész — mehet a polcra"}
          </button>
        </div>
      </div>
    </div>
  );
}
