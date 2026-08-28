import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { StarIcon } from "./icons";
import { t } from "../lib/i18n";

export function usePublicReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.rpc("get_public_reviews");
      if (alive) { setReviews(data || []); setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const count = reviews.length;
  const avg = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
  return { reviews, loading, avg, count };
}

function StarRow({ n, size = 13, color = "#F59E0B" }) {
  return (
    <span style={{ display: "inline-flex", gap: 1, color }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} width={size} height={size} fill={i <= Math.round(n) ? "currentColor" : "#E5E7EB"} stroke="none" />
      ))}
    </span>
  );
}

// Kis, mindenhova betehető bizalmi jelvény (hero, header) — nem renderel semmit, amíg
// nincs legalább 1 publikált vélemény, hogy sose látszódjon "0 vélemény alapján" felirat.
export function ReviewsBadge({ lang = "hu", style }) {
  const s = t(lang);
  const { avg, count, loading } = usePublicReviews();
  if (loading || count === 0) return null;
  return (
    <div className="pub-reviews-badge" style={style}>
      <StarRow n={avg} size={14} />
      <span>{s.reviewsBadge(avg.toFixed(1), count)}</span>
    </div>
  );
}

// Teljes vélemény-szekció kártyás sorral — a főoldalra, a becslő/felvásárlás oldalak aljára tehető.
export default function ReviewsSection({ lang = "hu", limit = 8 }) {
  const s = t(lang);
  const { reviews, loading, avg, count } = usePublicReviews();
  if (loading || count === 0) return null;

  return (
    <section className="pub-reviews-section">
      <div className="pub-reviews-head">
        <div className="pub-reviews-title">{s.reviewsTitle}</div>
        <div className="pub-reviews-avg">
          <StarRow n={avg} size={17} />
          <span>{s.reviewsBadge(avg.toFixed(1), count)}</span>
        </div>
      </div>
      <div className="pub-reviews-row">
        {reviews.slice(0, limit).map((r) => (
          <div key={r.id} className="pub-review-card">
            <StarRow n={r.rating} />
            <div className="pub-review-body">{r.body}</div>
            <div className="pub-review-foot">
              <span className="pub-review-author">{r.author_name}</span>
              <span className="pub-review-date">{(r.review_date || "").slice(0, 10)}</span>
            </div>
            {r.reply_text && (
              <div className="pub-review-reply"><b>Telefonos:</b> {r.reply_text}</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
