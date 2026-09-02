import { useState } from "react";
import { CloseIcon } from "./icons";
import { BUYBACK_CONDITION_QUESTIONS } from "../lib/utils";

export default function BuybackRuleModal({ rule, onClose, onSave, busy }) {
  const isEdit = !!rule;
  const [f, setF] = useState({
    questionKey: rule?.questionKey || BUYBACK_CONDITION_QUESTIONS[0].key,
    answerKey: rule?.answerKey || BUYBACK_CONDITION_QUESTIONS[0].options[0].key,
    label: rule?.label || "",
    deductionType: rule?.deductionType || "percent",
    deductionValue: rule?.deductionValue ?? "",
    active: rule?.active !== false,
  });
  const question = BUYBACK_CONDITION_QUESTIONS.find((q) => q.key === f.questionKey);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setQuestion = (e) => {
    const q = BUYBACK_CONDITION_QUESTIONS.find((x) => x.key === e.target.value);
    setF({ ...f, questionKey: q.key, answerKey: q.options[0].key });
  };
  const valid = f.label.trim() && f.deductionValue !== "";
  return (
    <div className="overlay">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{isEdit ? "Levonási szabály szerkesztése" : "Új levonási szabály"} <button className="iconbtn" onClick={onClose}><CloseIcon /></button></h2>
        <div className="row2">
          <div className="field"><label>Kérdés</label>
            <select value={f.questionKey} onChange={setQuestion}>
              {BUYBACK_CONDITION_QUESTIONS.map((q) => <option key={q.key} value={q.key}>{q.question}</option>)}
            </select>
          </div>
          <div className="field"><label>Válasz</label>
            <select value={f.answerKey} onChange={set("answerKey")}>
              {question.options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div className="field"><label>Ügyfélnek mutatott szöveg</label><input value={f.label} onChange={set("label")} placeholder="Repedt kijelző levonás" /></div>
        <div className="row2">
          <div className="field"><label>Levonás típusa</label>
            <select value={f.deductionType} onChange={set("deductionType")}>
              <option value="percent">Százalék (%)</option>
              <option value="fixed">Fix összeg (Lei)</option>
            </select>
          </div>
          <div className="field"><label>{f.deductionType === "percent" ? "Levonás (%)" : "Levonás (Lei)"}</label>
            <input type="number" value={f.deductionValue} onChange={set("deductionValue")} placeholder="0" />
          </div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "#374151", margin: "2px 0 4px" }}>
          <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
          Aktív (érvényben van az árazásnál)
        </label>
        <div className="modal-actions">
          <button className="btn sec" onClick={onClose}>Mégse</button>
          <button className="btn" disabled={!valid || busy} onClick={() => valid && onSave({ ...f, deductionValue: Number(f.deductionValue) || 0 })}>{busy ? "Mentés..." : isEdit ? "Mentés" : "Hozzáadás"}</button>
        </div>
      </div>
    </div>
  );
}
