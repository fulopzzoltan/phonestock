import { money, displayName } from "../lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";
import CallLink from "./CallLink";
import Thumb from "./Thumb";

export default function BuybackOfferCard({ offer, onOpen, onStep, stepPrev, stepNext }) {
  return (
    <div className="t-card" onClick={() => onOpen(offer.id)}>
      <div className="t-card-top">
        <span className="t-sn">#{offer.offerNo}</span>
        <span className="t-loc">{offer.deliveryMethod || "—"}</span>
        {onStep && (
          <span style={{ display: "flex", gap: 2, marginLeft: "auto" }}>
            {stepPrev && <button type="button" className="t-card-step prev" onClick={(e) => { e.stopPropagation(); onStep(offer.id, "prev"); }} title="Előző státusz"><ChevronLeftIcon width={14} height={14} /></button>}
            {stepNext && <button type="button" className="t-card-step next" onClick={(e) => { e.stopPropagation(); onStep(offer.id, "next"); }} title="Következő státusz"><ChevronRightIcon width={14} height={14} /></button>}
          </span>
        )}
      </div>
      <div className="t-name">{offer.customerName}</div>
      <div className="t-device">
        <span className="t-device-main"><Thumb brand={offer.brand} size="sm" />{displayName(offer.brand, offer.model) || "—"}</span>
        <CallLink phone={offer.customerPhone} />
      </div>
      <div className="t-footer">
        <span className="t-price">{money(offer.finalPrice ?? offer.estimatedPrice)}</span>
        <span className="t-date">{offer.createdAt?.slice(0, 10)}</span>
      </div>
    </div>
  );
}
