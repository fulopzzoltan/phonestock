import { useState } from "react";
import LocationField from "./LocationField";
import { CloseIcon } from "./icons";
import { WARRANTIES, SOURCES, STOCK_STATUSES, CONDITION_GRADES, conditionGradeKey, STORAGE_OPTIONS, RAM_OPTIONS, PHONE_COLORS } from "../lib/utils";
import { ChipField, DropdownField } from "./FormPickers";
import BrandField from "./BrandField";
import PicklistField from "./PicklistField";

function SectionHead({ n, title, sub }) {
  return (
    <div className="wf-sechead">
      <div className="wf-secnum">{n}</div>
      <div>
        <div className="wf-sectitle">{title}</div>
        {sub && <div className="wf-secsub">{sub}</div>}
      </div>
    </div>
  );
}

export default function StockModal({ product, prefill, locations, onClose, onSave, busy, defaultLocId }) {
  const isEdit = !!product;
  const [f, setF] = useState({
    brand: product?.brand || prefill?.brand || "",
    model: product?.model || prefill?.model || "",
    condition: product?.condition || "New",
    grade: product?.grade || "A",
    storage: product?.storage || prefill?.storage || "",
    ram: product?.ram || prefill?.ram || "",
    color: product?.color || prefill?.color || "",
    imei: product?.imei || prefill?.imei || "",
    costPrice: product?.costPrice ?? prefill?.costPrice ?? "",
    salePrice: product?.salePrice ?? "",
    warranty: product?.warranty || "",
    source: product?.source || prefill?.source || "",
    batteryHealth: product?.batteryHealth ?? "",
    newPrice: product?.newPrice ?? "",
    stockStatus: product?.stockStatus || "polcon",
    productNo: product?.productNo ?? "",
  });
  const [locId, setLocId] = useState(product?.locationId || prefill?.locationId || defaultLocId || locations[0]?.id || "");
  const [acqType, setAcqType] = useState("purchase");
  const [seller, setSeller] = useState({ name: prefill?.sellerName || "", idDoc: "", cnp: "", phone: prefill?.sellerPhone || "", address: "" });
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
      <div className="modal wf" onClick={(e) => e.stopPropagation()}>
        <h2>{isEdit ? "Termék szerkesztése" : "Új termék"} <button className="iconbtn" onClick={onClose}><CloseIcon /></button></h2>

        {!isEdit && (
          <div className="wf-sec">
            <SectionHead n={1} title="Beszerzés" sub="Saját vásárlás vagy bizomány" />
            <div className="field">
              <label>Beszerzés típusa</label>
              <div className="seg">
                <button type="button" className={acqType === "purchase" ? "active" : ""} onClick={() => setAcqType("purchase")}>Saját vásárlás</button>
                <button type="button" className={acqType === "consignment" ? "active" : ""} onClick={() => setAcqType("consignment")}>Bizomány</button>
              </div>
            </div>
            <div className="row2">
              <div className="field"><label>Eladó neve{isConsignment ? "" : " (opcionális)"}</label><input value={seller.name} onChange={setSellerField("name")} placeholder="pl. Kovács János" /></div>
              <div className="field"><label>Eladó telefonszáma{isConsignment ? "" : " (opcionális)"}</label><input value={seller.phone} onChange={setSellerField("phone")} placeholder="07xx xxx xxx" /></div>
            </div>
            <div className="row2">
              <div className="field"><label>Személyi ig. szám (opcionális)</label><input value={seller.idDoc} onChange={setSellerField("idDoc")} /></div>
              <div className="field"><label>CNP {isConsignment ? "(ajánlott)" : "(opcionális)"}</label><input value={seller.cnp} onChange={setSellerField("cnp")} /></div>
            </div>
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
          </div>
        )}

        <div className="wf-sec">
          <SectionHead n={isEdit ? 1 : 2} title="Alapadatok" sub="Helyszín, márka, modell" />
          <LocationField locations={locations} value={locId} onChange={setLocId} />
          <div className="row2">
            <BrandField value={f.brand} onChange={(v) => setF({ ...f, brand: v })} />
            <div className="field"><label>Modell</label><input value={f.model} onChange={set("model")} placeholder="Galaxy S23" /></div>
          </div>
          <div className="field">
            <label>Sorszám (kód) <span style={{ color: "#9CA3AF", fontWeight: 400 }}>— opcionális, üresen hagyva automatikusan a következő szabad szám kerül rá</span></label>
            <input type="number" value={f.productNo} onChange={set("productNo")} placeholder="automatikus" />
          </div>
        </div>

        <div className="wf-sec">
          <SectionHead n={isEdit ? 2 : 3} title="Állapot & specifikáció" sub="Kondíció, tárhely, szín, IMEI" />
          <ChipField
            label="Állapot"
            value={conditionGradeKey(f.condition, f.grade)}
            onChange={(key) => setF(key === "New" ? { ...f, condition: "New", grade: "" } : { ...f, condition: "Refurbished", grade: key })}
            options={CONDITION_GRADES.map((g) => ({ key: g.key, label: g.label }))}
          />
          <div className="row2">
            <PicklistField label="Tárhely" value={f.storage} onChange={(v) => setF({ ...f, storage: v })} options={STORAGE_OPTIONS} placeholder="Válassz tárhelyet..." />
            <PicklistField label="RAM" value={f.ram} onChange={(v) => setF({ ...f, ram: v })} options={RAM_OPTIONS} placeholder="Válassz RAM-ot..." />
          </div>
          <PicklistField label="Szín" value={f.color} onChange={(v) => setF({ ...f, color: v })} options={PHONE_COLORS} placeholder="Válassz színt..." />
          <div className="field"><label>IMEI</label><input value={f.imei} onChange={set("imei")} placeholder="35xxxxxxxxxxxxx" /></div>
          {f.condition === "Refurbished" && (
            <div className="field"><label>Akkuállapot (%)</label><input type="number" min="0" max="100" value={f.batteryHealth} onChange={set("batteryHealth")} placeholder="100" /></div>
          )}
        </div>

        <div className="wf-sec">
          <SectionHead n={isEdit ? 3 : 4} title="Árazás & garancia" sub="Beszerzési és eladási ár, feltételek" />
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
          <DropdownField
            label="Garancia"
            value={f.warranty}
            onChange={(v) => setF({ ...f, warranty: v })}
            options={[{ key: "", label: "Nincs" }, ...WARRANTIES.map((w) => ({ key: w, label: w }))]}
          />
          <ChipField
            label="Forrás"
            value={f.source}
            onChange={(key) => setF({ ...f, source: key })}
            options={[{ key: "", label: "—" }, ...SOURCES.map((s) => ({ key: s, label: s }))]}
          />
          <ChipField
            label="Raktár állapot"
            hint={<span style={{ color: "#9CA3AF", fontWeight: 400 }}>— csak "Polcon" látszik a nyilvános webshopban</span>}
            value={f.stockStatus}
            onChange={(key) => setF({ ...f, stockStatus: key })}
            options={STOCK_STATUSES.map((s) => ({ key: s.key, label: s.label }))}
          />
        </div>

        <div className="modal-actions">
          <button className="btn sec" onClick={onClose}>Mégse</button>
          <button className="btn" disabled={!valid || busy} onClick={save}>{busy ? "Mentés..." : isEdit ? "Mentés" : "Hozzáadás"}</button>
        </div>
      </div>
    </div>
  );
}
