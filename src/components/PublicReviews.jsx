import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { StarIcon, CloseIcon } from "./icons";
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

// Trustpilot-mintás zöld négyzet-csillag — a pontszám-panelen és a kártyákon.
function StarSquareRow({ n, size = 15 }) {
  return (
    <span className="pub-reviews-starsquares" style={{ "--sq": `${size}px` }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ opacity: i <= Math.round(n) ? 1 : 0.28 }}>
          <StarIcon width={size * 0.62} height={size * 0.62} fill="#fff" stroke="none" />
        </span>
      ))}
    </span>
  );
}

const AVATAR_PALETTE = [
  { bg: "#FCEFE3", ink: "#B45309" },
  { bg: "#E7F0FE", ink: "#1D4ED8" },
  { bg: "#F3E8FD", ink: "#7E22CE" },
  { bg: "#E8FBEF", ink: "#0F7A36" },
  { bg: "#FDE8EF", ink: "#BE185D" },
];

function initialsOf(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function paletteFor(name) {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

// Kis, mindenhova betehető bizalmi jelvény (hero, header) — nem renderel semmit, amíg
// nincs legalább 1 publikált vélemény, hogy sose látszódjon "0 vélemény alapján" felirat.
export function ReviewsBadge({ lang = "hu", style, stacked = false }) {
  const s = t(lang);
  const { avg, count, loading } = usePublicReviews();
  if (loading || count === 0) return null;
  return (
    <div className={`pub-reviews-badge${stacked ? " stacked" : ""}`} style={style}>
      <StarRow n={avg} size={14} />
      <span>{s.reviewsBadge(avg.toFixed(1), count)}</span>
    </div>
  );
}

function ReviewCard({ r, s }) {
  const pal = paletteFor(r.author_name);
  return (
    <div className="pub-review-card">
      <div className="pub-review-card-head">
        <div className="pub-review-avatar" style={{ background: pal.bg, color: pal.ink }}>{initialsOf(r.author_name)}</div>
        <div className="pub-review-card-headtext">
          <div className="pub-review-author">{r.author_name}</div>
          <div className="pub-review-date">{(r.review_date || "").slice(0, 10)}</div>
        </div>
        <StarSquareRow n={r.rating} size={14} />
      </div>
      <div className="pub-review-body">{r.body}</div>
      {r.reply_text && (
        <div className="pub-review-reply">
          <span className="pub-review-reply-badge">T</span>
          <div>
            <div className="pub-review-reply-label">{s.reviewsReplyLabel}</div>
            <div>{r.reply_text}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// Teljes vélemény-szekció — Trustpilot-mintás pontszám-oszlop balra, vélemény-lista jobbra.
export default function ReviewsSection({ lang = "hu", limit = 4 }) {
  const s = t(lang);
  const { reviews, loading, avg, count } = usePublicReviews();
  const [showAll, setShowAll] = useState(false);
  if (loading || count === 0) return null;

  const dist = [5, 4, 3, 2, 1].map((star) => {
    const n = reviews.filter((r) => Math.round(r.rating) === star).length;
    return { star, pct: count ? Math.round((n / count) * 100) : 0 };
  });

  return (
    <section className="pub-reviews-section">
      <div className="pub-reviews-head">
        <div>
          <div className="pub-reviews-title">{s.reviewsTitle}</div>
          <div className="pub-reviews-subtitle">{s.reviewsSubtitle}</div>
        </div>
        {count > limit && (
          <button type="button" className="pub-reviews-viewall" onClick={() => setShowAll(true)}>{s.reviewsViewAll(count)}</button>
        )}
      </div>

      <div className="pub-reviews-body">
        <div className="pub-reviews-scorepanel">
          <div className="pub-reviews-scorepanel-top">
            <div className="pub-reviews-scorepanel-num">{avg.toFixed(1)}</div>
            <StarSquareRow n={avg} size={17} />
            <div className="pub-reviews-scorepanel-word">{s.reviewsRatingWord(avg)}</div>
            <div className="pub-reviews-scorepanel-count">{s.reviewsBasedOn(count)}</div>
          </div>
          <div className="pub-reviews-scorepanel-dist">
            {dist.map(({ star, pct }) => (
              <div className="pub-reviews-distrow" key={star}>
                <span>{star}</span>
                <div className="pub-reviews-distbar"><div style={{ width: `${pct}%` }} /></div>
                <span>{pct}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pub-reviews-list">
          {reviews.slice(0, limit).map((r) => <ReviewCard key={r.id} r={r} s={s} />)}
        </div>
      </div>

      {showAll && (
        <div className="overlay">
          <div className="modal pub-reviews-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pub-reviews-modal-head">
              <div className="pub-reviews-title">{s.reviewsTitle}</div>
              <button type="button" className="iconbtn" onClick={() => setShowAll(false)}><CloseIcon /></button>
            </div>
            <div className="pub-reviews-modal-list">
              {reviews.map((r) => <ReviewCard key={r.id} r={r} s={s} />)}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
