

export function createPrintActions(ctx) {
  const {
    setAcquisitionPrintPrompt, setPrintConsignment, setPrintConsignmentList, setPrintPriceLabels,
    setPrintPurchase, setPrintReceipt, setPrintTicket, setPrintWarranty, tickets, transactions,
  } = ctx;

  // Az összes #print-slip-root-beli állapot törlése, mielőtt egy újat beállítunk — így soha
  // nem marad ott egy korábban kiválasztott nyomtatvány (pl. bizományi/vásárlási iratok egy
  // korábbi telefonfelvitelről), ami a következő nyomtatáshoz (munkalap, garancia, stb.) a
  // végére odaragadva kinyomtatódna.
  function clearAllPrints() {
    setPrintTicket(null);
    setPrintReceipt(null);
    setPrintWarranty(null);
    setPrintConsignment(null);
    setPrintPurchase(null);
    setPrintConsignmentList(null);
    setPrintPriceLabels(null);
  }
  function printTicketSlip(ticket) {
    clearAllPrints();
    setPrintTicket(ticket);
    requestAnimationFrame(() => {
      window.print();
    });
  }
  function printReceiptSlip(tx) {
    clearAllPrints();
    setPrintReceipt(tx);
    requestAnimationFrame(() => {
      window.print();
    });
  }
  function printConsignmentDocs(product, acquisition) {
    clearAllPrints();
    setPrintConsignment({ product, acquisition });
    setAcquisitionPrintPrompt(null);
    requestAnimationFrame(() => {
      window.print();
    });
  }
  function printPriceLabelsDocs(items) {
    clearAllPrints();
    setPrintPriceLabels({ items });
    requestAnimationFrame(() => {
      window.print();
    });
  }
  function printPurchaseDocs(product, acquisition) {
    clearAllPrints();
    setPrintPurchase({ product, acquisition });
    setAcquisitionPrintPrompt(null);
    requestAnimationFrame(() => {
      window.print();
    });
  }
  function printWarrantySlip(w) {
    if (w.source === "linked") {
      if (w.kind === "sale") { printReceiptSlip(transactions.find((t) => t.id === w.refId)); return; }
      printTicketSlip(tickets.find((t) => t.id === w.refId));
      return;
    }
    clearAllPrints();
    setPrintWarranty(w);
    requestAnimationFrame(() => window.print());
  }

  return {
    printTicketSlip, printReceiptSlip, printConsignmentDocs,
    printPriceLabelsDocs, printPurchaseDocs, printWarrantySlip,
  };
}
