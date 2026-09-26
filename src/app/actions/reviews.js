import { supabase, unwrap } from "../../lib/supabaseClient";
import { reviewFromApi, reviewToApi } from "../../lib/mappers";

export function createReviewsActions(ctx) {
  const {
    setReviews, settings, user,
  } = ctx;
  const withBusy = (...a) => ctx.withBusy(...a);

  // MARKETING — REVIEW-KÉRÉS: szerviz-átadás és telefon-eladás után X nappal (settings.
  // reviewRequestDelayDays) egy sor kerül a review_requests táblába; a tényleges küldést
  // (WhatsApp sablon, SMS fallback) egy napi pg_cron job + send-review-requests edge
  // function végzi, itt csak beütemezzük. Az (source_type, source_id) unique constraint
  // miatt ha véletlenül kétszer hívnánk (pl. státusz oda-vissza váltás), a második insert
  // nem hoz létre duplikátumot — ezt csendben elnyeljük.
  async function scheduleReviewRequest({ sourceType, sourceId, locationId, customerName, customerPhone }) {
    if (!settings.reviewRequestEnabled || !customerPhone) return;
    const delayDays = Number(settings.reviewRequestDelayDays) || 2;
    const scheduledFor = new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("review_requests").insert({
      source_type: sourceType, source_id: sourceId, location_id: locationId || null,
      customer_name: customerName || null, customer_phone: customerPhone, scheduled_for: scheduledFor,
    });
  }
  // REVIEWS (webshop vélemények)
  async function addReview(data) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("reviews").insert({ ...reviewToApi(data), created_by: user.id }).select());
      setReviews((prev) => [reviewFromApi(r[0]), ...prev]);
    });
  }
  async function editReview(id, data) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("reviews").update(reviewToApi(data)).eq("id", id).select());
      setReviews((prev) => prev.map((rv) => (rv.id === id ? reviewFromApi(r[0]) : rv)));
    });
  }
  async function deleteReview(id) {
    await withBusy(async () => {
      unwrap(await supabase.from("reviews").delete().eq("id", id));
      setReviews((prev) => prev.filter((rv) => rv.id !== id));
    });
  }
  async function bulkImportReviews(rows) {
    await withBusy(async () => {
      const payload = rows.map((r) => ({ ...reviewToApi(r), created_by: user.id }));
      const r = unwrap(await supabase.from("reviews").insert(payload).select());
      setReviews((prev) => [...(r || []).map(reviewFromApi), ...prev]);
    });
  }

  return {
    scheduleReviewRequest, addReview, editReview, deleteReview, bulkImportReviews,
  };
}
