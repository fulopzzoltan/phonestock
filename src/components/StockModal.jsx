import { useState } from "react";
import LocationField from "./LocationField";
import { CloseIcon } from "./icons";
import { WARRANTIES, SOURCES, STOCK_STATUSES, CONDITION_GRADES, conditionGradeKey } from "../lib/utils";

export default function StockModal({ product, prefill, locations, onClose, onSave, busy, defaultLocId }) {
  const isEdit = !!product;
  const [f, setF] = useState({
    brand: product?.brand || "",
    model: product?.model || prefill?.model || "",
    condition: product?.condition || "New",
    grade: product?.grade || "A",
    storage: product?.storage || "",
    color: product?.color || "",
    imei: product?.imei || "",
    costPrice: product?.costPrice ?? prefill?.costPrice ?? "",
    salePrice: product?.salePrice ?? "",
    warranty: product?.warranty || "",
    source: product?.source || prefill?.source || "",
    batteryHealth: product?.batteryHealth ?? "",
    newPrice: product?.newPrice ?? "",
    stockStatus: product?.stockStatus || "polcon",
  });
  const [locId, setLocId] = useState(product?.locationId || prefill?.locationId || defaultLocId || locations[0]?.id || "");
  const [acqType, setAcqType] = useState("purchase");
  const [seller, setSeller] = useState({ name: "", idDoc: "", cnp: "", phone: "", address: "" });
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutNow, setPayoutNow] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setSellerField = (k) => (e) => setSeller({ ...seller, [k]: e.target.value });
  const isConsignment = !isEdit && acqType === "consignment";
  const valid = f.brand.trim() && f.model.trim() && f.salePrice !== "" && locId
    && (!isConsignment || (seller.name.trim() && seller.phone.trim() && payoutAmount !== ""));
  function save() {
    if (!valid) return;
    const acquisition = isEdit ? null : {
      acquisitionType: acqType,
      sellerName: seller.name.trim(),
      sellerIdDoc: seller.idDoc.trim(),
      sellerCnp: seller.cnp.trim(),
      sellerPhone: seller.phone.trim(),
      sellerAddress: seller.address.trim(),
      consignorPayoutAmount: acqType === "consignment" ? payoutAmount : null,
      payoutNow: acqType === "consignment" ? payoutNow : false,
    };
    const finalF = acqType === "consignment" ? { ...f, costPrice: payoutAmount } : f;
    onSave(finalF, locId, acquisition);
  }
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{isEdit ? "Termék szerkesztése" : "Új termék"} <button className="iconbtn" onClick={onClose}><CloseIcon /></button></h2>
        {!isEdit && (
          <div className="field">
            <label>Beszerzés típusa</label>
            <div className="seg">
              <button type="button" className={acqType === "purchase" ? "active" : ""} onClick={() => setAcqType("purchase")}>Saját vásárlás</button>
              <button type="button" className={acqType === "consignment" ? "active" : ""} onClick={() => setAcqType("consignment")}>Bizomány</button>
            </div>
          </div>
        )}
        {!isEdit && (
          <div className="row2">
            <div className="field"><label>Eladó neve{isConsignment ? "" : " (opcionális)"}</label><input value={seller.name} onChange={setSellerField("name")} placeholder="pl. Kovács János" /></div>
            <div className="field"><label>Eladó telefonszáma{isConsignment ? "" : " (opcionális)"}</label><input value={seller.phone} onChange={setSellerField("phone")} placeholder="07xx xxx xxx" /></div>
          </div>
        )}
        {!isEdit && (
          <div className="row2">
            <div className="field"><label>Személyi ig. szám (opcionális)</label><input value={seller.idDoc} onChange={setSellerField("idDoc")} /></div>
            <div className="field"><label>CNP {isConsignment ? "(ajánlott)" : "(opcionális)"}</label><input value={seller.cnp} onChange={setSellerField("cnp")} /></div>
          </div>
        )}
        {isConsignment && (
          <>
            <div className="field"><label>Eladó címe (a szerződéshez)</label><input value={seller.address} onChange={setSellerField("address")} /></div>
            <div className="field">
              <label>Kifizetendő összeg eladáskor (Lei)</label>
              <input type="number" value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} placeholder="0" />
            </div>
            <div className="field" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" id="payoutNow" checked={payoutNow} onChange={(e) => setPayoutNow(e.target.checked)} style={{ width: "auto" }} />
              <label htmlFor="payoutNow" style={{ margin: 0 }}>Kifizetés most (nem eladáskor, hanem azonnal, átvételkor)</label>
            </div>
          </>
        )}
        <LocationField locations={locations} value={locId} onChange={setLocId} />
        <div className="row2">
          <div className="field"><label>Márka</label><input value={f.brand} onChange={set("brand")} placeholder="Samsung" /></div>
          <div className="field"><label>Modell</label><input value={f.model} onChange={set("model")} placeholder="Galaxy S23" /></div>
        </div>
        <div className="field"><label>Állapot</label>
          <select
            value={conditionGradeKey(f.condition, f.grade)}
            onChange={(e) => {
              const key = e.target.value;
              setF(key === "New" ? { ...f, condition: "New", grade: "" } : { ...f, condition: "Refurbished", grade: key });
            }}
          >
            {CONDITION_GRADES.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
          </select>
        </div>
        <div className="row2">
          <div className="field"><label>Tárhely</label><input value={f.storage} onChange={set("storage")} placeholder="128GB" /></div>
          <div className="field"><label>Szín</label><input value={f.color} onChange={set("color")} placeholder="Fekete" /></div>
        </div>
        <div className="field"><label>IMEI</label><input value={f.imei} onChange={set("imei")} placeholder="35xxxxxxxxxxxxx" /></div>
        <div className="row2">
          {isConsignment ? (
            <div className="field"><label>Besz. ár (Lei) <span style={{ color: "#9CA3AF", fontWeight: 400 }}>— a kifizetendő összeg</span></label><input type="number" value={payoutAmount} disabled placeholder="0" /></div>
          ) : (
            <div className="field"><label>Besz. ár (Lei)</label><input type="number" value={f.costPrice} onChange={set("costPrice")} placeholder="0" /></div>
          )}
          <div className="field"><label>Eladási ár (Lei)</label><input type="number" value={f.salePrice} onChange={set("salePrice")} placeholder="0" /></div>
        </div>
        <div className="field">
          <label>Becsült új kori ár (Lei) <span style={{ color: "#9CA3AF", fontWeight: 400 }}>— opcionális, a vitrinen áthúzva jelenik meg</span></label>
          <input type="number" value={f.newPrice} onChange={set("newPrice")} placeholder="pl. 2500" />
        </div>
        <div className="row2">
          <div className="field"><label>Garancia</label>
            <select value={f.warranty} onChange={set("warranty")}>
              <option value="">Nincs</option>
              {WARRANTIES.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <div className="field"><label>Forrás</label>
            <select value={f.source} onChange={set("source")}>
              <option value="">—</option>
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {f.condition === "Refurbished" && (
          <div className="field"><label>Akkuállapot (%)</label><input type="number" min="0" max="100" value={f.batteryHealth} onChange={set("batteryHealth")} placeholder="100" /></div>
        )}
        <div className="field">
          <label>Raktár állapot <span style={{ color: "#9CA3AF", fontWeight: 400 }}>— csak "Polcon" látszik a nyilvános webshopban</span></label>
          <select value={f.stockStatus} onChange={set("stockStatus")}>
            {STOCK_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <div className="modal-actions">
          <button className="btn sec" onClick={onClose}>Mégse</button>
          <button className="btn" disabled={!valid || busy} onClick={save}>{busy ? "Mentés..." : isEdit ? "Mentés" : "Hozzáadás"}</button>
        </div>
      </div>
    </div>
  );
}
