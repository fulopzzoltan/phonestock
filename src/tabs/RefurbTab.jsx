import { useState } from "react";
import { EmptyState, LoadingState } from "../components/EmptyState";
import { RefurbIcon } from "../components/icons";
import RefurbPhoneCard from "../components/RefurbPhoneCard";
import RefurbInspectionModal from "../components/RefurbInspectionModal";

export default function RefurbTab({
  loadingData, refurbPhones = [], refurbTasksByProduct, busy, locName,
  moveRefurbRank, addRefurbTask, updateRefurbTaskStatus, deleteRefurbTask, saveRefurbInspection,
  activeOwnTicketFor, parts = [], usePartForProduct, removePartFromTicket, openOwnServiceModal, onOpenTicket,
}) {
  const [inspectProduct, setInspectProduct] = useState(null);
  const availableParts = parts.filter((p) => Number(p.quantity) > 0);

  return (
    <>
      <div className="rf-intro">
        Azok a saját telefonok, amiket "Javítandó" állapotra állítottál a Telefonok fülön — itt
        rangsorolhatod, hogy melyiket csináljátok meg előbb, felírhatod mihez mi kell (kb. mennyi
        lejbe kerül), és ha kész, itt tudod kategorizálni/garanciát adni rá, mielőtt kikerül a polcra.
      </div>

      {loadingData ? (
        <div className="tw"><LoadingState /></div>
      ) : refurbPhones.length === 0 ? (
        <div className="tw">
          <EmptyState icon={RefurbIcon}>
            Nincs javítandó telefon. A Telefonok fülön a szerkesztésnél állíts be egy tételt
            "Javítandó" raktár-állapotra, és itt fog megjelenni.
          </EmptyState>
        </div>
      ) : (
        <div className="rf-list">
          {refurbPhones.map((product, i) => (
            <RefurbPhoneCard
              key={product.id}
              product={product}
              tasks={refurbTasksByProduct.get(product.id) || []}
              rankPos={i + 1}
              rankTotal={refurbPhones.length}
              canMoveUp={i > 0}
              canMoveDown={i < refurbPhones.length - 1}
              busy={busy}
              locName={locName}
              onMoveUp={(id) => moveRefurbRank(id, -1)}
              onMoveDown={(id) => moveRefurbRank(id, 1)}
              onAddTask={addRefurbTask}
              onUpdateTaskStatus={updateRefurbTaskStatus}
              onDeleteTask={deleteRefurbTask}
              activeTicket={activeOwnTicketFor(product.id)}
              availableParts={availableParts}
              allParts={parts}
              onAddPart={(prod, part, qty) => usePartForProduct(prod, part, qty)}
              onRemovePart={(ticketId, sp) => removePartFromTicket(ticketId, sp)}
              onStartService={openOwnServiceModal}
              onOpenTicket={onOpenTicket}
              onOpenInspection={setInspectProduct}
            />
          ))}
        </div>
      )}

      {inspectProduct && (
        <RefurbInspectionModal
          product={inspectProduct}
          busy={busy}
          onClose={() => setInspectProduct(null)}
          onSave={async (decision, answers, markReady) => {
            await saveRefurbInspection(inspectProduct.id, decision, answers, markReady);
            setInspectProduct(null);
          }}
        />
      )}
    </>
  );
}
