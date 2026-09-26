import { supabase, unwrap } from "../../lib/supabaseClient";
import { spFromApi, tFromApi, tToApi, txFromApi, txToApi } from "../../lib/mappers";
import { TRACKING_URL, money, stripAccents, ticketRemaining, today } from "../../lib/utils";

export function createServiceActions(ctx) {
  const {
    locName, pendingPartUsage, refurbPhones, repairLeadConvert, setDetailId, setError,
    setOwnServiceModal, setPartUsageModal, setParts, setPendingPartUsage, setProductParts,
    setRepairLeadConvert, setStock, setTicketModal, setTickets, setTransactions, settings, stock,
    tickets,
  } = ctx;
  const convertRepairLead = (...a) => ctx.convertRepairLead(...a);
  const refreshCustomerLoyalty = (...a) => ctx.refreshCustomerLoyalty(...a);
  const scheduleReviewRequest = (...a) => ctx.scheduleReviewRequest(...a);
  const withBusy = (...a) => ctx.withBusy(...a);

  // SERVICE
  async function addTicket(data, locId) {
    return await withBusy(async () => {
      let customerId = data.customerId || null;
      if (!customerId && data.customerPhone) {
        const { data: cid } = await supabase.rpc("upsert_customer", { p_name: data.customerName, p_phone: data.customerPhone });
        customerId = cid;
      }
      if (data.marketingConsent && customerId) {
        await supabase.from("customers").update({ marketing_consent: true, marketing_consent_at: new Date().toISOString() }).eq("id", customerId);
      }
      const r = unwrap(await supabase.from("service_tickets").insert({ ...tToApi(data, locId), customer_id: customerId }).select());
      const newTicket = tFromApi(r[0]);
      setTickets((prev) => [newTicket, ...prev]);
      setTicketModal(null);

      if (data.reserve) {
        const { reserveProductId, depositAmount, depositPayment } = data.reserve;
        unwrap(await supabase.from("products").update({ stock_status: "lefoglalt" }).eq("id", reserveProductId));
        setStock((prev) => prev.map((p) => (p.id === reserveProductId ? { ...p, stockStatus: "lefoglalt" } : p)));
        const reserved = stock.find((p) => p.id === reserveProductId);
        const rTx = unwrap(await supabase.from("transactions").insert({
          ...txToApi({
            type: "income", category: "Készlet",
            description: `Foglaló — ${[reserved?.brand, reserved?.model].filter(Boolean).join(" ")} — ${newTicket.customerName}`,
            amount: depositAmount, payment: depositPayment, productId: reserveProductId,
          }, locId),
          customer_id: customerId,
        }).select());
        setTransactions((prev) => [txFromApi(rTx[0]), ...prev]);
      }
      if (repairLeadConvert) {
        await convertRepairLead(repairLeadConvert.id, newTicket.id);
        setRepairLeadConvert(null);
      }

      if (settings.smsOnTicketCreate && newTicket.customerPhone) {
        const device = [newTicket.brand, newTicket.model].filter(Boolean).join(" ");
        const statusUrl = `${TRACKING_URL}/s/${newTicket.shortCode}`;
        // send-whatsapp WhatsApp-sablonnal próbálkozik először (ha be van állítva a fiók és a
        // sablon jóváhagyva), és csendben visszaesik erre a sima SMS-szövegre, ha bármi nem
        // stimmel — amíg a WhatsApp-oldal nincs kész, ez pontosan a mai SMS-küldést jelenti.
        const smsMessage = stripAccents(`Szia! Atvettuk a keszulekedet (${device}), munkalapszam: #${newTicket.ticketNo}. A javitas allapotat itt kovetheted nyomon: ${statusUrl}`);
        supabase.functions.invoke("send-whatsapp", {
          body: {
            phone: newTicket.customerPhone,
            smsMessage,
            whatsappTemplate: "ticket_created",
            whatsappParams: [device, newTicket.ticketNo, statusUrl],
            ticketId: newTicket.id,
          },
        }).catch((err) => {
          console.error("Értesítés küldése sikertelen:", err);
          setError("Az értesítés nem ment ki (a mentés egyébként sikeres volt) — nézd meg a konzolt vagy próbáld újra.");
        });
      }
      return newTicket;
    });
  }
  function openOwnServiceModal(product) {
    const kind = product.status === "sold" ? "Saját készlet - garanciális" : "Saját készlet - előkészítés";
    setOwnServiceModal({ product, kind });
  }
  async function saveOwnServiceTicket(data, locId) {
    const newTicket = await addTicket(data, locId);
    setOwnServiceModal(null);
    // Ha az Alkatrészek fülről indult "Felhasználás" akadt meg azon, hogy még nem volt
    // aktív munkalapja a telefonnak, most hogy létrejött, rögtön hozzácsatoljuk az alkatrészt.
    if (newTicket && pendingPartUsage) {
      const { part, qty } = pendingPartUsage;
      setPendingPartUsage(null);
      await addPartToTicket(newTicket.id, part, qty, newTicket);
    }
    // szándékosan NEM zárjuk be a ProductDetailPanel-t — a felhasználó rögtön lássa
    // a most létrejött "Előkészítés / szerviz" szekciót és kezdje címkézni az alkatrészeket.
  }
  async function saveTicketEdit(id, data, locId) {
    await withBusy(async () => {
      const original = tickets.find((t) => t.id === id);
      const payload = tToApi(data, locId);
      // Ha egy ügyfél-kérésű, akciós fóliát a staff utólag kipipál (meggondolta magát),
      // az ár konzisztens maradjon: vonjuk le belőle a felárat, és jelöljük vissza nem-kértnek.
      if (original?.foliaUpsellRequested && original.folia && !data.folia) {
        payload.price = Math.max(0, (Number(payload.price) || 0) - (Number(original.foliaUpsellPrice) || 0));
        payload.folia_upsell_requested = false;
      }
      const r = unwrap(await supabase.from("service_tickets").update(payload).eq("id", id).select());
      setTickets((prev) => prev.map((t) => (t.id === id ? tFromApi(r[0]) : t)));
      setTicketModal(null);
    });
  }
  async function setTicketStatus(id, status, subStatus = null, payment = "Készpénz", paymentCashAmount = null, paymentCardAmount = null) {
    await withBusy(async () => {
      const ticket = tickets.find((t) => t.id === id);
      const becameReady = status === "Átadásra" && !(ticket && ticket.status === "Átadásra");
      // Ha korábban vettünk fel előleget erre a munkalapra, az átadáskor csak a fennmaradó
      // összeget könyveljük — az előleg tranzakciója már külön, a felvételekor bekerült.
      const remainingAtHandover = ticketRemaining(ticket);
      // A bevétel/anyagköltség tételt csak EGYSZER, a munkalap életében először hozzuk létre —
      // ha valaki visszaállítja a státuszt, majd újra "Átadva"-ra teszi, ez ne írja fel duplán
      // a Bevétel/Kiadás-t (és ne szaporítsa a hűségpontot, ami a tranzakció-insert triggerére épül).
      const shouldRecordIncome = subStatus === "Átadva" && ticket && !ticket.handoverIncomeRecorded && remainingAtHandover > 0;
      const shouldRecordMaterial = subStatus === "Átadva" && ticket && !ticket.handoverMaterialRecorded && ticket.ticketKind === "Saját készlet - garanciális" && (Number(ticket.matCost) || 0) > 0;
      // Ha egy már átadott munkalapot valaki visszaállít egy korábbi státuszra (pl. tévedésből
      // lett átadva, vagy a vevő visszahozta), a korábban felírt Bevétel/Kiadás tételeket is
      // vissza kell vonni — de csak az átadáskor keletkezetteket, a korábban felvett előleget
      // (ami külön, ettől függetlenül valós) NEM töröljük.
      const shouldReverseHandover = ticket && ticket.subStatus === "Átadva" && subStatus !== "Átadva";
      const patch = { status, sub_status: subStatus };
      if (subStatus === "Átadva") patch.date_out = today();
      if (shouldReverseHandover) patch.date_out = null;
      // Átadáskor a feloldó kód/minta már nem kell — a készülék visszakerült a vevőhöz,
      // nincs értelme (és biztonsági szempontból sem jó) tovább tárolni.
      if (subStatus === "Átadva") { patch.unlock_type = null; patch.unlock_code = null; }
      if (becameReady) patch.ready_at = new Date().toISOString();
      if (shouldRecordMaterial) patch.handover_material_recorded = true;
      if (shouldReverseHandover) {
        patch.handover_income_recorded = false;
        patch.handover_material_recorded = false;
        patch.handover_transaction_id = null;
        patch.handover_material_transaction_id = null;
      }
      unwrap(await supabase.from("service_tickets").update(patch).eq("id", id));
      setTickets((prev) => prev.map((t) => (t.id === id ? {
        ...t, status, subStatus,
        dateOut: subStatus === "Átadva" ? today() : (shouldReverseHandover ? null : t.dateOut),
        unlockType: subStatus === "Átadva" ? null : t.unlockType,
        unlockCode: subStatus === "Átadva" ? null : t.unlockCode,
        readyAt: becameReady ? patch.ready_at : t.readyAt,
        handoverIncomeRecorded: shouldReverseHandover ? false : t.handoverIncomeRecorded,
        handoverMaterialRecorded: shouldReverseHandover ? false : (shouldRecordMaterial ? true : t.handoverMaterialRecorded),
        handoverTransactionId: shouldReverseHandover ? null : t.handoverTransactionId,
        handoverMaterialTransactionId: shouldReverseHandover ? null : t.handoverMaterialTransactionId,
      } : t)));

      if (shouldReverseHandover) {
        const idsToDelete = [ticket.handoverTransactionId, ticket.handoverMaterialTransactionId].filter(Boolean);
        if (idsToDelete.length > 0) {
          unwrap(await supabase.from("transactions").update({ deleted_at: new Date().toISOString() }).in("id", idsToDelete));
          setTransactions((prev) => prev.filter((t) => !idsToDelete.includes(t.id)));
          if (ticket.customerId) await refreshCustomerLoyalty(ticket.customerId);
        }
      }

      // MARKETING — csak valódi ügyfél-munkalapoknál kérünk értékelést, a saját készletes
      // (előkészítés/garanciális) munkalapok átadása nem egy ügyfélélmény vége, azt kihagyjuk.
      if (subStatus === "Átadva" && ticket && ticket.ticketKind === "Ügyfél") {
        await scheduleReviewRequest({
          sourceType: "szerviz", sourceId: id, locationId: ticket.locationId,
          customerName: ticket.customerName, customerPhone: ticket.customerPhone,
        });
      }

      if (settings.smsOnTicketReady && becameReady && subStatus === null && ticket && ticket.customerPhone) {
        const device = [ticket.brand, ticket.model].filter(Boolean).join(" ");
        const statusUrl = `${TRACKING_URL}/s/${ticket.shortCode}`;
        const smsMessage = stripAccents(`Szia! A(z) ${device} javítása elkészült, átveheted nálunk (${locName(ticket.locationId)}). Részletek: ${statusUrl}`);
        supabase.functions.invoke("send-whatsapp", {
          body: {
            phone: ticket.customerPhone,
            smsMessage,
            whatsappTemplate: "ticket_ready",
            whatsappParams: [device, locName(ticket.locationId), statusUrl],
            ticketId: ticket.id,
          },
        }).catch((err) => {
          console.error("Értesítés küldése sikertelen:", err);
          setError("Az értesítés nem ment ki (a mentés egyébként sikeres volt) — nézd meg a konzolt vagy próbáld újra.");
        });
      }

      if (shouldRecordIncome) {
        const depositNote = (Number(ticket.depositPaid) || 0) > 0 ? ` (előleg levonva: ${money(ticket.depositPaid)})` : "";
        const r = unwrap(await supabase.from("transactions").insert({
          ...txToApi({
            type: "income",
            category: "Szerviz",
            description: `${[ticket.brand, ticket.model].filter(Boolean).join(" ")}${depositNote}`,
            amount: remainingAtHandover,
            payment,
            paymentCashAmount: payment === "Vegyes" ? paymentCashAmount : null,
            paymentCardAmount: payment === "Vegyes" ? paymentCardAmount : null,
            costPrice: ticket.matCost,
            customerName: ticket.customerName,
            customerPhone: ticket.customerPhone,
            serviceTicketId: id,
          }, ticket.locationId),
          customer_id: ticket.customerId || null,
        }).select());
        setTransactions((prev) => [txFromApi(r[0]), ...prev]);
        unwrap(await supabase.from("service_tickets").update({ handover_income_recorded: true, handover_transaction_id: r[0].id }).eq("id", id));
        setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, handoverIncomeRecorded: true, handoverTransactionId: r[0].id } : t)));
        if (ticket.customerId) await refreshCustomerLoyalty(ticket.customerId);
      }

      if (shouldRecordMaterial) {
        const product = stock.find((p) => p.id === ticket.productId);
        const r2 = unwrap(await supabase.from("transactions").insert(txToApi({
          type: "expense",
          category: "Szerviz",
          description: `Garanciális javítás — ${product ? `${product.brand} ${product.model}` : [ticket.brand, ticket.model].filter(Boolean).join(" ")}`,
          amount: ticket.matCost,
          productId: ticket.productId,
          serviceTicketId: id,
        }, ticket.locationId)).select());
        setTransactions((prev) => [txFromApi(r2[0]), ...prev]);
        unwrap(await supabase.from("service_tickets").update({ handover_material_transaction_id: r2[0].id }).eq("id", id));
        setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, handoverMaterialTransactionId: r2[0].id } : t)));
      }
    });
  }
  async function addTicketDeposit(id, amount, payment) {
    await withBusy(async () => {
      const ticket = tickets.find((t) => t.id === id);
      if (!ticket || !(Number(amount) > 0)) return;
      const r = unwrap(await supabase.from("transactions").insert({
        ...txToApi({
          type: "income",
          category: "Szerviz",
          description: `Előleg — ${ticket.customerName} — ${[ticket.brand, ticket.model].filter(Boolean).join(" ")}`,
          amount,
          payment,
          customerName: ticket.customerName,
          customerPhone: ticket.customerPhone,
          serviceTicketId: id,
        }, ticket.locationId),
        customer_id: ticket.customerId || null,
      }).select());
      setTransactions((prev) => [txFromApi(r[0]), ...prev]);
      const newDeposit = (Number(ticket.depositPaid) || 0) + Number(amount);
      unwrap(await supabase.from("service_tickets").update({ deposit_paid: newDeposit }).eq("id", id));
      setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, depositPaid: newDeposit } : t)));
      if (ticket.customerId) await refreshCustomerLoyalty(ticket.customerId);
    });
  }
  async function completeQc(id, qcByUserId) {
    const patch = { qc_by: qcByUserId || null, qc_at: new Date().toISOString() };
    await withBusy(async () => {
      unwrap(await supabase.from("service_tickets").update(patch).eq("id", id));
      setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, qcBy: patch.qc_by, qcAt: patch.qc_at } : t)));
    });
    await setTicketStatus(id, "Átadásra", null);
  }
  async function deleteTicket(id) {
    await withBusy(async () => {
      unwrap(await supabase.from("service_tickets").update({ deleted_at: new Date().toISOString() }).eq("id", id));
      setTickets((prev) => prev.filter((t) => t.id !== id));
      setDetailId(null);
    });
  }
  // Ha egy munkalap már át lett adva (a bevétel/kiadás tranzakció már létrejött belőle),
  // egy utólagos alkatrész-hozzáadás/eltávolítás a `mat_cost`-ot helyben frissíti — de a már
  // rögzített tranzakció költség-mezője enélkül elszakadna a valóságtól. Ez szinkronizálja azt.
  async function syncHandoverCost(ticket, newMatCost) {
    if (ticket.handoverTransactionId) {
      unwrap(await supabase.from("transactions").update({ cost_price: newMatCost }).eq("id", ticket.handoverTransactionId));
      setTransactions((prev) => prev.map((tx) => (tx.id === ticket.handoverTransactionId ? { ...tx, costPrice: newMatCost } : tx)));
    }
    if (ticket.handoverMaterialTransactionId) {
      unwrap(await supabase.from("transactions").update({ amount: newMatCost }).eq("id", ticket.handoverMaterialTransactionId));
      setTransactions((prev) => prev.map((tx) => (tx.id === ticket.handoverMaterialTransactionId ? { ...tx, amount: newMatCost } : tx)));
    }
  }
  // `part` egy CSOPORT (partGroups eleme, `.units`-szal — FIFO sorrendben, a legrégebb óta
  // raktáron lévő darab elöl) — innen választjuk ki a felhasznált konkrét egyedi darabokat.
  // Minden felhasznált darabhoz saját `service_parts` sor jön létre (quantity=1), hogy a
  // garanciális visszakereséskor pontosan tudni lehessen, melyik fizikai darab hova került.
  async function addPartToTicket(ticketId, part, qty, ticketOverride) {
    await withBusy(async () => {
      const ticket = ticketOverride || tickets.find((t) => t.id === ticketId);
      const units = (part.units || [part]).slice(0, qty);
      if (units.length < qty) throw new Error(`Csak ${units.length} db van raktáron ebből: ${part.name}.`);
      const usedAt = new Date().toISOString();
      const addedCost = units.reduce((s, u) => s + (Number(u.costPrice) || 0), 0);
      const inserted = unwrap(await supabase.from("service_parts").insert(units.map((unit) => ({
        service_ticket_id: ticketId, part_id: unit.id, part_name: unit.name, quantity: 1, cost_price: Number(unit.costPrice) || 0,
      }))).select());
      const newSp = inserted.map(spFromApi);
      unwrap(await supabase.from("parts").update({ status: "felhasznalva", used_in_ticket_id: ticketId, used_at: usedAt }).in("id", units.map((u) => u.id)));
      const newMatCost = (Number(ticket.matCost) || 0) + addedCost;
      unwrap(await supabase.from("service_tickets").update({ mat_cost: newMatCost }).eq("id", ticketId));
      await syncHandoverCost(ticket, newMatCost);

      if (ticket.ticketKind === "Saját készlet - előkészítés" && ticket.productId) {
        const product = stock.find((p) => p.id === ticket.productId);
        if (product) {
          const newCostPrice = (Number(product.costPrice) || 0) + addedCost;
          unwrap(await supabase.from("products").update({ cost_price: newCostPrice }).eq("id", ticket.productId));
          setStock((prev) => prev.map((p) => (p.id === ticket.productId ? { ...p, costPrice: newCostPrice } : p)));
        }
      }

      const usedIds = new Set(units.map((u) => u.id));
      setParts((prev) => prev.map((p) => (usedIds.has(p.id) ? { ...p, status: "felhasznalva", usedInTicketId: ticketId, usedAt } : p)));
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, matCost: newMatCost, usedParts: [...(t.usedParts || []), ...newSp] } : t)));
    });
  }
  // `usedPart` egyetlen `service_parts` sor (mindig quantity=1) — az eltávolítás a pontosan
  // azt a fizikai darabot állítja vissza raktáron-státuszba, amit felhasználtak.
  async function removePartFromTicket(ticketId, usedPart) {
    await withBusy(async () => {
      const ticket = tickets.find((t) => t.id === ticketId);
      unwrap(await supabase.from("service_parts").delete().eq("id", usedPart.id));
      if (usedPart.partId) {
        unwrap(await supabase.from("parts").update({ status: "raktáron", used_in_ticket_id: null, used_at: null }).eq("id", usedPart.partId));
        setParts((prev) => prev.map((p) => (p.id === usedPart.partId ? { ...p, status: "raktáron", usedInTicketId: null, usedAt: null } : p)));
      }
      const newMatCost = Math.max(0, (Number(ticket.matCost) || 0) - (Number(usedPart.costPrice) || 0) * usedPart.quantity);
      unwrap(await supabase.from("service_tickets").update({ mat_cost: newMatCost }).eq("id", ticketId));
      await syncHandoverCost(ticket, newMatCost);

      if (ticket.ticketKind === "Saját készlet - előkészítés" && ticket.productId) {
        const product = stock.find((p) => p.id === ticket.productId);
        if (product) {
          const newCostPrice = Math.max(0, (Number(product.costPrice) || 0) - (Number(usedPart.costPrice) || 0) * usedPart.quantity);
          unwrap(await supabase.from("products").update({ cost_price: newCostPrice }).eq("id", ticket.productId));
          setStock((prev) => prev.map((p) => (p.id === ticket.productId ? { ...p, costPrice: newCostPrice } : p)));
        }
      }

      setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, matCost: newMatCost, usedParts: (t.usedParts || []).filter((sp) => sp.id !== usedPart.id) } : t)));
    });
  }
  // Alkatrész hozzárendelése közvetlenül egy termékhez, munkalap nélkül — a Telefonok fülön,
  // Szerviz státuszú saját telefonoknál. Ugyanaz a fizikai darab -> service_parts sor minta,
  // mint addPartToTicket-nél, csak ticket helyett product_id-hoz kötve, és a beszerzési ár
  // közvetlenül a products.cost_price-ra megy (nincs mat_cost/munkalap a szinkronhoz).
  async function addPartToProduct(product, part, qty) {
    await withBusy(async () => {
      const units = (part.units || [part]).slice(0, qty);
      if (units.length < qty) throw new Error(`Csak ${units.length} db van raktáron ebből: ${part.name}.`);
      const usedAt = new Date().toISOString();
      const newSp = [];
      let addedCost = 0;
      for (const unit of units) {
        const unitCost = Number(unit.costPrice) || 0;
        const r = unwrap(await supabase.from("service_parts").insert({
          product_id: product.id, part_id: unit.id, part_name: unit.name, quantity: 1, cost_price: unitCost,
        }).select());
        newSp.push(spFromApi(r[0]));
        unwrap(await supabase.from("parts").update({ status: "felhasznalva", used_at: usedAt }).eq("id", unit.id));
        addedCost += unitCost;
      }
      const newCostPrice = (Number(product.costPrice) || 0) + addedCost;
      unwrap(await supabase.from("products").update({ cost_price: newCostPrice }).eq("id", product.id));
      setStock((prev) => prev.map((p) => (p.id === product.id ? { ...p, costPrice: newCostPrice } : p)));

      const usedIds = new Set(units.map((u) => u.id));
      setParts((prev) => prev.map((p) => (usedIds.has(p.id) ? { ...p, status: "felhasznalva", usedAt } : p)));
      setProductParts((prev) => ({ ...prev, [product.id]: [...(prev[product.id] || []), ...newSp] }));
    });
  }
  async function removePartFromProduct(product, usedPart) {
    await withBusy(async () => {
      unwrap(await supabase.from("service_parts").delete().eq("id", usedPart.id));
      if (usedPart.partId) {
        unwrap(await supabase.from("parts").update({ status: "raktáron", used_in_ticket_id: null, used_at: null }).eq("id", usedPart.partId));
        setParts((prev) => prev.map((p) => (p.id === usedPart.partId ? { ...p, status: "raktáron", usedInTicketId: null, usedAt: null } : p)));
      }
      const newCostPrice = Math.max(0, (Number(product.costPrice) || 0) - (Number(usedPart.costPrice) || 0) * usedPart.quantity);
      unwrap(await supabase.from("products").update({ cost_price: newCostPrice }).eq("id", product.id));
      setStock((prev) => prev.map((p) => (p.id === product.id ? { ...p, costPrice: newCostPrice } : p)));
      setProductParts((prev) => ({ ...prev, [product.id]: (prev[product.id] || []).filter((sp) => sp.id !== usedPart.id) }));
    });
  }
  function openPartUsageModal(part) {
    setPartUsageModal({ part });
  }
  async function usePartForTicket(ticketId, part, qty) {
    await addPartToTicket(ticketId, part, qty);
    setPartUsageModal(null);
  }
  async function usePartForProduct(product, part, qty) {
    const existingTicket = tickets.find((t) => t.productId === product.id && t.ticketKind !== "Ügyfél" && t.subStatus !== "Átadva");
    if (existingTicket) {
      await addPartToTicket(existingTicket.id, part, qty);
      setPartUsageModal(null);
    } else {
      // Nincs még aktív munkalapja ennek a telefonnak — a meglévő "saját készlet" munkalap-felvevő
      // űrlapot nyitjuk meg, és amint elmentik, a saveOwnServiceTicket automatikusan hozzácsatolja
      // ezt az alkatrészt az újonnan létrejött munkalaphoz (ld. pendingPartUsage).
      setPendingPartUsage({ part, qty });
      setPartUsageModal(null);
      openOwnServiceModal(product);
    }
  }
  // FELÚJÍTÁS — a service_tickets/service_parts-tól szándékosan külön tartott, egyszerű
  // "mit kell hozzá, kb. mennyibe kerül" feladatlista a javítandó saját telefonokhoz.
  // A tényleges alkatrész-felhasználás (raktárkészlet levonása) továbbra is a meglévő
  // "Saját készlet - előkészítés" munkalapon megy, ld. usePartForProduct fent.
  function activeOwnTicketFor(productId) {
    return tickets.find((t) => t.productId === productId && t.ticketKind !== "Ügyfél" && t.subStatus !== "Átadva") || null;
  }
  // Rangsor mozgatás — a szomszédos telefonnal cseréli fel a repair_rank értéket (nincs
  // drag-and-drop, csak fel/le nyilak, ugyanaz az egyszerű minta, mint a loyalty_rewards
  // sort_order-jénél). Ha még egyiknek sincs rangja, 10-es lépésekkel osztjuk ki most.
  async function moveRefurbRank(productId, direction) {
    const ordered = refurbPhones;
    const idx = ordered.findIndex((p) => p.id === productId);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= ordered.length) return;
    const a = ordered[idx], b = ordered[swapIdx];
    const ranks = ordered.map((p, i) => p.repairRank ?? (i + 1) * 10);
    const rankA = ranks[swapIdx], rankB = ranks[idx];
    await withBusy(async () => {
      const [ra, rb] = await Promise.all([
        supabase.from("products").update({ repair_rank: rankA }).eq("id", a.id),
        supabase.from("products").update({ repair_rank: rankB }).eq("id", b.id),
      ]);
      unwrap(ra); unwrap(rb);
      setStock((prev) => prev.map((p) => {
        if (p.id === a.id) return { ...p, repairRank: rankA };
        if (p.id === b.id) return { ...p, repairRank: rankB };
        return p;
      }));
    });
  }

  return {
    addTicket, openOwnServiceModal, saveOwnServiceTicket, saveTicketEdit, setTicketStatus,
    addTicketDeposit, completeQc, deleteTicket, syncHandoverCost, addPartToTicket, removePartFromTicket,
    addPartToProduct, removePartFromProduct, openPartUsageModal, usePartForTicket, usePartForProduct,
    activeOwnTicketFor, moveRefurbRank,
  };
}
