import { supabase, unwrap } from "../../lib/supabaseClient";
import { acqFromApi, acqToApi, pFromApi, pToApi, sbDocFromApi, txFromApi, txToApi } from "../../lib/mappers";
import { today } from "../../lib/utils";

export function createStockActions(ctx) {
  const {
    setAcquisitionPrintPrompt, setError, setInfo, setPdfImportModal, setProductAcquisitions,
    setSellModal, setStock, setStockImportQueue, setStockModal, setTransactions, stock, transactions,
  } = ctx;
  const addPart = (...a) => ctx.addPart(...a);
  const addTransaction = (...a) => ctx.addTransaction(...a);
  const addWaitingItem = (...a) => ctx.addWaitingItem(...a);
  const refreshCustomerLoyalty = (...a) => ctx.refreshCustomerLoyalty(...a);
  const scheduleReviewRequest = (...a) => ctx.scheduleReviewRequest(...a);
  const withBusy = (...a) => ctx.withBusy(...a);

  // STOCK
  async function addProduct(data, locId, acquisition) {
    return await withBusy(async () => {
      const r = unwrap(await supabase.from("products").insert(pToApi(data, locId)).select());
      const product = pFromApi(r[0]);
      setStock((prev) => [product, ...prev]);

      if (acquisition) {
        let customerId = acquisition.sellerCustomerId || null;
        if (!customerId && acquisition.sellerPhone) {
          const { data: cid } = await supabase.rpc("upsert_customer", { p_name: acquisition.sellerName, p_phone: acquisition.sellerPhone });
          customerId = cid;
        }
        const docNoRpc = acquisition.acquisitionType === "consignment" ? "next_consignment_doc_no" : "next_purchase_doc_no";
        const { data: docNo } = await supabase.rpc(docNoRpc);
        const acqRow = {
          productId: product.id,
          acquisitionType: acquisition.acquisitionType,
          sellerName: acquisition.sellerName,
          sellerIdDoc: acquisition.sellerIdDoc,
          sellerCnp: acquisition.sellerCnp,
          sellerPhone: acquisition.sellerPhone,
          sellerAddress: acquisition.sellerAddress,
          customerId,
          purchaseDocNo: acquisition.acquisitionType === "purchase" ? docNo : null,
          consignmentDocNo: acquisition.acquisitionType === "consignment" ? docNo : null,
          consignorPayoutAmount: acquisition.consignorPayoutAmount,
        };
        const ar = unwrap(await supabase.from("product_acquisitions").insert(acqToApi(acqRow)).select());
        let savedAcq = acqFromApi(ar[0]);
        setProductAcquisitions((prev) => [savedAcq, ...prev]);

        const shouldPayoutNow = acquisition.acquisitionType === "purchase" || acquisition.payoutNow;
        if (shouldPayoutNow) {
          const amount = acquisition.acquisitionType === "purchase" ? Number(product.costPrice) || 0 : Number(acquisition.consignorPayoutAmount) || 0;
          if (amount > 0) {
            const tr = unwrap(await supabase.from("transactions").insert(
              txToApi({
                type: "expense", category: acquisition.acquisitionType === "purchase" ? "Készlet" : "Bizomány",
                description: `${acquisition.acquisitionType === "purchase" ? "Felvásárlás" : "Bizományos kifizetés"}: ${acquisition.sellerName} — ${[product.brand, product.model].filter(Boolean).join(" ")}`,
                amount, payment: "Készpénz", productId: product.id, customerName: acquisition.sellerName, customerPhone: acquisition.sellerPhone,
              }, locId)
            ).select());
            setTransactions((prev) => [txFromApi(tr[0]), ...prev]);
          }
          if (acquisition.acquisitionType === "consignment") {
            const ur = unwrap(await supabase.from("product_acquisitions").update({ payout_status: "kifizetve", payout_date: today() }).eq("id", savedAcq.id).select());
            savedAcq = acqFromApi(ur[0]);
            setProductAcquisitions((prev) => prev.map((a) => (a.id === savedAcq.id ? savedAcq : a)));
          }
        }
        setStock((prev) => prev.map((i) => (i.id === product.id ? { ...i, acquisition: savedAcq } : i)));
        setAcquisitionPrintPrompt({ product, acquisition: savedAcq });
      }
      setStockModal(null);
      return product;
    });
  }
  async function editProduct(id, data, locId) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("products").update(pToApi(data, locId)).eq("id", id).select());
      setStock((prev) => prev.map((i) => (i.id === id ? { ...pFromApi(r[0]), acquisition: i.acquisition } : i)));
      setStockModal(null);
    });
  }
  async function deleteProduct(id) {
    await withBusy(async () => {
      unwrap(await supabase.from("products").update({ deleted_at: new Date().toISOString() }).eq("id", id));
      setStock((prev) => prev.filter((i) => i.id !== id));
    });
  }
  async function sellProduct(txData, locId, tradeIns, smartbillInvoice) {
    let mainTxId = null;
    await withBusy(async () => {
      let customerId = txData.customerId || null;
      if (!customerId && txData.customerPhone) {
        const { data: cid } = await supabase.rpc("upsert_customer", { p_name: txData.customerName, p_phone: txData.customerPhone });
        customerId = cid;
      }
      if (txData.marketingConsent && customerId) {
        await supabase.from("customers").update({ marketing_consent: true, marketing_consent_at: new Date().toISOString() }).eq("id", customerId);
      }
      const product = stock.find((p) => p.id === txData.productId);
      unwrap(await supabase.from("products").update({ status: "sold" }).eq("id", txData.productId));

      const basketId = crypto.randomUUID();

      const isConsignment = product?.acquisition?.acquisitionType === "consignment";
      const newTxs = [];
      if (isConsignment) {
        const payout = Number(product.acquisition.consignorPayoutAmount) || 0;
        const commission = (Number(txData.amount) || 0) - payout;
        const r1 = unwrap(await supabase.from("transactions").insert({
          ...txToApi({ ...txData, basketId, category: "Bizomány", amount: commission, description: `${txData.description} (jutalék)` }, locId),
          customer_id: customerId,
        }).select());
        newTxs.push(txFromApi(r1[0]));
        if (payout > 0) {
          const r2 = unwrap(await supabase.from("transactions").insert({
            ...txToApi({ ...txData, basketId, category: "Bizomány", amount: payout, description: `${txData.description} (letéteményesé)`, isPassthrough: true }, locId),
            customer_id: customerId,
          }).select());
          newTxs.push(txFromApi(r2[0]));
        }
      } else {
        const r = unwrap(await supabase.from("transactions").insert({ ...txToApi({ ...txData, basketId }, locId), customer_id: customerId }).select());
        newTxs.push(txFromApi(r[0]));
      }
      mainTxId = newTxs[0].id;

      let updatedStock = stock.map((i) => (i.id === txData.productId ? { ...i, status: "sold" } : i));

      for (const tradeIn of tradeIns || []) {
        if (!(tradeIn.value > 0)) continue;
        const tiProduct = pFromApi(unwrap(await supabase.from("products").insert(pToApi({
          brand: tradeIn.brand, model: tradeIn.model, condition: tradeIn.condition, grade: tradeIn.condition === "Refurbished" ? "B" : "",
          costPrice: tradeIn.value, salePrice: 0, stockStatus: "lefoglalt",
        }, locId)).select())[0]);
        const { data: tiDocNo } = await supabase.rpc("next_purchase_doc_no");
        const tiAcqRow = {
          productId: tiProduct.id, acquisitionType: "purchase",
          sellerName: txData.customerName || "Beszámítás", sellerPhone: txData.customerPhone, customerId,
          purchaseDocNo: tiDocNo,
        };
        const tiAr = unwrap(await supabase.from("product_acquisitions").insert(acqToApi(tiAcqRow)).select());
        const tiTr = unwrap(await supabase.from("transactions").insert(
          txToApi({
            type: "expense", category: "Készlet",
            description: `Beszámítás: ${txData.customerName || "Vevő"} — ${tradeIn.brand} ${tradeIn.model}`,
            amount: tradeIn.value, payment: "Készpénz", productId: tiProduct.id, customerName: txData.customerName, customerPhone: txData.customerPhone, basketId,
          }, locId)
        ).select());
        newTxs.push(txFromApi(tiTr[0]));
        setProductAcquisitions((prev) => [acqFromApi(tiAr[0]), ...prev]);
        updatedStock = [{ ...tiProduct, acquisition: acqFromApi(tiAr[0]) }, ...updatedStock];
      }

      setStock(updatedStock);
      setTransactions((prev) => [...newTxs, ...prev]);
      setSellModal(null);
      if (customerId) await refreshCustomerLoyalty(customerId);
      // mainTxId-t használjuk forrás-azonosítónak (nem a productId-t), hogy egy később
      // visszavett és újra eladott telefonnál ne ütközzön a review_requests unique
      // (source_type, source_id) megkötésébe — minden eladási tranzakció egyedi.
      await scheduleReviewRequest({
        sourceType: "eladas", sourceId: mainTxId, locationId: locId,
        customerName: txData.customerName, customerPhone: txData.customerPhone,
      });
    });
    if (smartbillInvoice && mainTxId) {
      const { data, error: fnError } = await supabase.functions.invoke("smartbill-issue-document", {
        body: { action: "issue", doc_type: "invoice", transaction_id: mainTxId, location_id: locId },
      });
      let msg = null;
      if (fnError || data?.ok === false) {
        msg = data?.error || fnError?.message || "Ismeretlen hiba";
        if (fnError?.context) {
          const body = await fnError.context.json().catch(() => null);
          if (body?.error) msg = body.error;
        }
        setError(`A SmartBill számla kiállítása sikertelen (az eladás egyébként sikeresen mentve) — ${msg}`);
      } else if (data?.ok) {
        const doc = data.document;
        setInfo(`SmartBill számla kiállítva: ${doc?.smartbill_series || ""}${doc?.smartbill_number ? "-" + doc.smartbill_number : ""}`.trim());
      }
    }
  }
  async function issueSmartbillDocument(transactionId, locId, docType, client) {
    let ok = false;
    await withBusy(async () => {
      const { data, error: fnError } = await supabase.functions.invoke("smartbill-issue-document", {
        body: { action: "issue", doc_type: docType, transaction_id: transactionId, location_id: locId, client },
      });
      if (fnError || data?.ok === false) {
        let msg = data?.error || fnError?.message || "Ismeretlen hiba";
        if (fnError?.context) {
          const body = await fnError.context.json().catch(() => null);
          if (body?.error) msg = body.error;
        }
        throw new Error(msg);
      }
      const doc = sbDocFromApi(data.document);
      setTransactions((prev) => prev.map((t) => (t.id === transactionId ? { ...t, smartbillDoc: doc } : t)));
      ok = true;
    });
    return ok;
  }
  async function retrySmartbillDocument(tx) {
    return issueSmartbillDocument(tx.id, tx.locationId, tx.smartbillDoc?.docType || "invoice");
  }
  async function quickIssueDocument(description, amount, customerName, customerId, docType, locId) {
    let ok = false;
    await withBusy(async () => {
      const tr = unwrap(await supabase.from("transactions").insert({
        ...txToApi({ type: "income", category: "Egyéb", description, amount: Number(amount) || 0, payment: "Készpénz", customerName: customerName || null }, locId),
        customer_id: customerId || null,
      }).select());
      const newTx = txFromApi(tr[0]);
      setTransactions((prev) => [newTx, ...prev]);
      const { data, error: fnError } = await supabase.functions.invoke("smartbill-issue-document", {
        body: { action: "issue", doc_type: docType, transaction_id: newTx.id, location_id: locId },
      });
      if (data?.document) {
        const doc = sbDocFromApi(data.document);
        setTransactions((prev) => prev.map((x) => (x.id === newTx.id ? { ...x, smartbillDoc: doc } : x)));
      }
      if (fnError || data?.ok === false) {
        let msg = data?.error || fnError?.message || "Ismeretlen hiba";
        if (fnError?.context) {
          const body = await fnError.context.json().catch(() => null);
          if (body?.error) msg = body.error;
        }
        throw new Error(`A tétel rögzítve, de a dokumentum kiállítása sikertelen — ${msg}`);
      }
      ok = true;
    });
    return ok;
  }
  async function payoutConsignor(productId) {
    await withBusy(async () => {
      const product = stock.find((p) => p.id === productId);
      const acq = product?.acquisition;
      if (!acq || acq.acquisitionType !== "consignment" || acq.payoutStatus === "kifizetve") return;
      const amount = Number(acq.consignorPayoutAmount) || 0;
      if (amount > 0) {
        const tr = unwrap(await supabase.from("transactions").insert(
          txToApi({
            type: "expense", category: "Bizomány",
            description: `Bizományos kifizetés: ${acq.sellerName} — ${[product.brand, product.model].filter(Boolean).join(" ")}`,
            amount, productId, customerName: acq.sellerName, customerPhone: acq.sellerPhone,
          }, product.locationId)
        ).select());
        setTransactions((prev) => [txFromApi(tr[0]), ...prev]);
      }
      const ur = unwrap(await supabase.from("product_acquisitions").update({ payout_status: "kifizetve", payout_date: today() }).eq("id", acq.id).select());
      const updatedAcq = acqFromApi(ur[0]);
      setProductAcquisitions((prev) => prev.map((a) => (a.id === acq.id ? updatedAcq : a)));
      setStock((prev) => prev.map((i) => (i.id === productId ? { ...i, acquisition: updatedAcq } : i)));
    });
  }
  // A Telefonok listán a Szerviz-stílusú StatusPicker-ből közvetlenül állítható a
  // raktár-állapot (webshop/polcon/szerviz/lefoglalt), munkalap-modal megnyitása nélkül.
  async function setProductStockStatus(productId, stockStatus) {
    await withBusy(async () => {
      unwrap(await supabase.from("products").update({ stock_status: stockStatus }).eq("id", productId));
      setStock((prev) => prev.map((i) => (i.id === productId ? { ...i, stockStatus } : i)));
    });
  }
  async function returnProductToStock(productId, txId) {
    await withBusy(async () => {
      const todayStr = today();
      unwrap(await supabase.from("products").update({ status: "in_stock", stock_status: "webshop", date_added: todayStr }).eq("id", productId));
      setStock((prev) => prev.map((i) => (i.id === productId ? { ...i, status: "in_stock", stockStatus: "webshop", dateAdded: todayStr } : i)));
      if (txId) {
        unwrap(await supabase.from("transactions").update({ warranty: null }).eq("id", txId));
        // A visszavett termékkel együtt eladott tartozék-tételeket (fólia, kábel) is töröljük
        // ugyanabból a blokkból, mert azokat fizikailag nem lehet visszavenni — ha a telefont
        // újra eladjuk, akkor kerül fel megint tartozék-költség.
        const saleTx = transactions.find((t) => t.id === txId);
        let removedIds = [];
        if (saleTx?.basketId) {
          const basketTxs = unwrap(await supabase.from("transactions").select("id").eq("basket_id", saleTx.basketId).neq("id", txId).is("deleted_at", null));
          removedIds = basketTxs.map((t) => t.id);
          if (removedIds.length > 0) {
            unwrap(await supabase.from("transactions").update({ deleted_at: new Date().toISOString() }).in("id", removedIds));
          }
        }
        setTransactions((prev) => prev.filter((t) => !removedIds.includes(t.id)).map((t) => (t.id === txId ? { ...t, warranty: null } : t)));
      }
    });
  }
  async function importPdfOrder(rows, supplier, payment, locId) {
    const basketId = rows.length > 1 ? crypto.randomUUID() : null;
    const phoneQueue = [];
    for (const row of rows) {
      if (row.kind === "part") {
        // addPart maga már létrehozza a Kiadást — itt NEM könyvelünk mégegyszer.
        await addPart({ name: row.name, category: row.category, quantity: row.qty, costPrice: row.unitPrice, source: supplier, brand: "", modelFit: "", origin: "", supplierSku: "" }, locId);
      } else if (row.kind === "phone") {
        // A products.source mező itt Konszignáció/Számla besorolást jelent (nem beszállító-nevet,
        // ld. StockModal.jsx SOURCES) — mivel ez egy valódi számláról (Factura) importált tétel, "Számla".
        // A StockModal mentésekor az addProduct("purchase" acqType) hozza létre a Kiadást —
        // itt sem könyvelünk mégegyszer, különben duplázódna.
        for (let i = 0; i < row.qty; i++) {
          phoneQueue.push({ model: row.name, costPrice: row.unitPrice, locationId: locId, source: "Számla" });
        }
      } else {
        // Ami nem telefon/alkatrész (szállítás, tok stb.) — ezeknek nincs saját beszerzés-modaljuk,
        // itt marad a közvetlen könyvelés.
        await addTransaction({ type: "expense", category: "Készlet", description: row.name, amount: row.lineTotal, costPrice: 0, payment, basketId }, locId);
      }
      if (row.waitingFor) {
        await addWaitingItem({ description: row.name, customerName: row.waitingFor, supplier, locationId: locId }, "megerkezett");
      }
    }
    setPdfImportModal(false);
    if (phoneQueue.length > 0) {
      setStockImportQueue(phoneQueue.slice(1));
      setStockModal({ model: phoneQueue[0].model, costPrice: phoneQueue[0].costPrice, locationId: phoneQueue[0].locationId, source: phoneQueue[0].source });
    }
  }

  return {
    addProduct, editProduct, deleteProduct, sellProduct, issueSmartbillDocument, retrySmartbillDocument,
    quickIssueDocument, payoutConsignor, setProductStockStatus, returnProductToStock, importPdfOrder,
  };
}
