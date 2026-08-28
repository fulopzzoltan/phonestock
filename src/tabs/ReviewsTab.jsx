import { useState } from "react";
import { today } from "../lib/utils";
import { StarIcon, ReviewsIcon } from "../components/icons";
import { EmptyState } from "../components/EmptyState";
import ResponsiveTable from "../components/ResponsiveTable";
import ConfirmDelete from "../components/ConfirmDelete";
import ReviewModal from "../components/ReviewModal";

function Stars({ n, size = 13 }) {
  return (
    <span style={{ display: "inline-flex", gap: 1, color: "#F59E0B" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} width={size} height={size} fill={i <= n ? "currentColor" : "#E5E7EB"} stroke="none" />
      ))}
    </span>
  );
}

// Egy sor formátuma: Név | csillag(1-5) | szöveg | dátum (opcionális, ÉÉÉÉ-HH-NN)
// — ezzel lehet a korábbi oldalról bemásolt ~40 véleményt egyszerre felvinni.
function parseBulkText(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, idx) => {
      const parts = line.split("|").map((p) => p.trim());
      const [authorName, ratingStr, body, dateStr] = parts;
      const rating = Math.max(1, Math.min(5, parseInt(ratingStr, 10) || 5));
      const reviewDate = dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : today();
      return {
        key: idx,
        ok: Boolean(authorName && body),
        authorName: authorName || "", rating, body: body || "", reviewDate,
        source: "importalt", isPublished: true, locationId: null, replyText: null,
      };
    });
}

function BulkImportPanel({ onImport, onCancel, busy }) {
  const [text, setText] = useState("");
  const preview = parseBulkText(text);
  const validCount = preview.filter((p) => p.ok).length;
  return (
    <div className="tw" style={{ padding: 16, marginBottom: 18 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Tömeges felvitel</div>
      <div style={{ fontSize: 12.5, color: "#6B7280", marginBottom: 10 }}>
        Soronként egy vélemény, <code>|</code>-vel elválasztva: <b>Név | csillag (1-5) | szöveg | dátum (opcionális, ÉÉÉÉ-HH-NN)</b><br />
        pl.: <code>Kovács János | 5 | Nagyon elégedett voltam a szervizzel! | 2025-11-02</code>
      </div>
      <textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="Illeszd be ide a véleményeket, soronként egyet..." style={{ fontFamily: "monospace", fontSize: 12.5 }} />
      {preview.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 12.5, color: validCount === preview.length ? "#15803D" : "#B45309" }}>
          {validCount} / {preview.length} sor értelmezhető {validCount !== preview.length && "— a hiányos sorok (nincs név vagy szöveg) kimaradnak"}
        </div>
      )}
      {preview.length > 0 && (
        <div style={{ marginTop: 10, maxHeight: 220, overflowY: "auto", border: "1px solid #F3F4F6", borderRadius: 10 }}>
          {preview.map((p) => (
            <div key={p.key} style={{ padding: "8px 12px", borderBottom: "1px solid #F3F4F6", fontSize: 12.5, opacity: p.ok ? 1 : 0.4 }}>
              <b>{p.authorName || "(nincs név)"}</b> <Stars n={p.rating} /> <span style={{ color: "#6B7280" }}>{p.reviewDate}</span>
              <div style={{ color: "#374151" }}>{p.body || "(nincs szöveg)"}</div>
            </div>
          ))}
        </div>
      )}
      <div className="modal-actions" style={{ marginTop: 14 }}>
        <button type="button" className="btn sec" onClick={onCancel}>Mégse</button>
        <button type="button" className="btn" disabled={validCount === 0 || busy} onClick={() => onImport(preview.filter((p) => p.ok))}>
          {busy ? "Felvitel..." : `${validCount} vélemény felvitele`}
        </button>
      </div>
    </div>
  );
}

export default function ReviewsTab({ reviews, locations, locName, addReview, editReview, deleteReview, bulkImportReviews, busy }) {
  const [modal, setModal] = useState(null); // null | "add" | review obj
  const [bulkOpen, setBulkOpen] = useState(false);

  const published = reviews.filter((r) => r.isPublished);
  const avg = published.length ? published.reduce((s, r) => s + r.rating, 0) / published.length : 0;

  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Vélemények</div></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn sec" onClick={() => setBulkOpen((v) => !v)}>{bulkOpen ? "Tömeges felvitel bezárása" : "Tömeges felvitel"}</button>
          <button type="button" className="btn" onClick={() => setModal("add")}>+ Új vélemény</button>
        </div>
      </div>

      <div className="statrow c3" style={{ marginBottom: 18 }}>
        <div className="statcard accent">
          <div className="lbl">Átlag (publikus)</div>
          <div className="val" style={{ display: "flex", alignItems: "center", gap: 8 }}>{avg.toFixed(1)} <Stars n={Math.round(avg)} size={16} /></div>
        </div>
        <div className="statcard"><div className="lbl">Publikus vélemények</div><div className="val">{published.length}</div></div>
        <div className="statcard"><div className="lbl">Rejtett / vázlat</div><div className="val">{reviews.length - published.length}</div></div>
      </div>

      {bulkOpen && (
        <BulkImportPanel
          busy={busy}
          onCancel={() => setBulkOpen(false)}
          onImport={async (rows) => { await bulkImportReviews(rows); setBulkOpen(false); }}
        />
      )}

      <div className="tw">
        {reviews.length === 0 ? (
          <EmptyState icon={ReviewsIcon}>Még nincs felvitt vélemény — kezdd a "Tömeges felvitel" gombbal, ha a régi oldalról hoznál át párat.</EmptyState>
        ) : (
          <ResponsiveTable
            wrap={false}
            columns={[{ key: "n", label: "Vevő" }, { key: "r", label: "Értékelés" }, { key: "b", label: "Szöveg" }, { key: "d", label: "Dátum" }, { key: "s", label: "Forrás" }, { key: "p", label: "Állapot" }, { key: "x", label: "" }]}
            rows={reviews}
            rowKey={(r) => r.id}
            renderRow={(r) => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.authorName}{r.locationId && <span className="badge-loc" style={{ marginLeft: 6 }}>{locName(r.locationId)}</span>}</td>
                <td><Stars n={r.rating} /></td>
                <td style={{ maxWidth: 320, color: "#374151" }}>{r.body}</td>
                <td className="mono" style={{ color: "#6B7280" }}>{r.reviewDate}</td>
                <td style={{ color: "#6B7280", fontSize: 12 }}>{r.source}</td>
                <td>
                  <button type="button" className={`badge-loc`} style={{ border: "none", cursor: "pointer", color: r.isPublished ? "#15803D" : "#9CA3AF" }} disabled={busy} onClick={() => editReview(r.id, { ...r, isPublished: !r.isPublished })}>
                    {r.isPublished ? "Publikus" : "Rejtett"}
                  </button>
                </td>
                <td style={{ display: "flex", gap: 5 }}>
                  <button className="btn sec sm" disabled={busy} onClick={() => setModal(r)}>Szerkesztés</button>
                  <ConfirmDelete disabled={busy} onConfirm={() => deleteReview(r.id)} />
                </td>
              </tr>
            )}
            renderMobileRow={(r) => (
              <div className="mob-row">
                <div className="mob-row-top">
                  <div className="mob-row-main"><span>{r.authorName}</span></div>
                  <Stars n={r.rating} />
                </div>
                <div style={{ fontSize: 12.5, color: "#374151", margin: "4px 0" }}>{r.body}</div>
                <div className="mob-row-sub">
                  <span className="mono">{r.reviewDate}</span>
                  <span>{r.source}</span>
                  {r.locationId && <span className="badge-loc">{locName(r.locationId)}</span>}
                  <span style={{ color: r.isPublished ? "#15803D" : "#9CA3AF" }}>{r.isPublished ? "Publikus" : "Rejtett"}</span>
                </div>
                <div className="mob-row-sub" style={{ marginTop: 6 }}>
                  <button className="btn sec sm" disabled={busy} onClick={() => setModal(r)}>Szerkesztés</button>
                  <ConfirmDelete disabled={busy} onConfirm={() => deleteReview(r.id)} />
                </div>
              </div>
            )}
          />
        )}
      </div>

      {modal && (
        <ReviewModal
          review={modal === "add" ? null : modal}
          locations={locations}
          busy={busy}
          onClose={() => setModal(null)}
          onSave={async (data) => {
            if (modal === "add") await addReview(data);
            else await editReview(modal.id, data);
            setModal(null);
          }}
        />
      )}
    </>
  );
}
