function fmtDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

const pageStyle = { fontFamily: "Inter, sans-serif", color: "#111827", padding: "26px 34px", fontSize: 12.5, lineHeight: 1.5, maxWidth: 760 };
const h1 = { fontSize: 17, fontWeight: 800, marginBottom: 14, textAlign: "center" };

export default function PrintPurchaseDocs({ product, acquisition, settings, location }) {
  if (!product || !acquisition) return null;
  const data = fmtDate(new Date().toISOString().slice(0, 10));
  const bonNo = acquisition.purchaseDocNo;
  const sellerName = acquisition.sellerName;
  const sellerPhone = acquisition.sellerPhone || "";
  const sellerAddress = acquisition.sellerAddress || "";
  const sellerCnp = acquisition.sellerCnp || acquisition.sellerIdDoc || "";
  const deviceDescription = [product.brand, product.model, product.storage, product.color].filter(Boolean).join(" ");
  const price = Number(product.costPrice) || 0;
  // Helyszín-szintű cégadat felülbírálja a közöset — ugyanaz a minta, mint a bizományos iratoknál.
  const companyName = location?.company_name || settings?.companyName || "";
  const companyCui = location?.company_cui || settings?.companyCui || "";
  const companyAddress = location?.company_address || settings?.companyAddress || "";
  const companyPhone = location?.company_phone || settings?.companyPhone || "";
  const companyEmail = location?.company_email || settings?.companyEmail || "";

  return (
    <>
      {/* a) Declarație de proveniență produs */}
      <div className="doc-page" style={pageStyle}>
        <div style={h1}>Declaratie de provenienta produs</div>
        <div>Data: {data}</div>
        <div>ID: {bonNo}</div>
        <div style={{ marginTop: 14, fontWeight: 700 }}>Date Vânzător</div>
        <div>Nume - {sellerName}</div>
        <div>Telefon - {sellerPhone}</div>
        <div>Dispozitiv - {deviceDescription}</div>
        <p style={{ marginTop: 16 }}>
          Subsemnatul {sellerName}, in calitate de vânzător, declar pe propria răspundere ca obiectul vândut este un
          bun din patrimoniul propriu și nu a fost dobândit prin mijloace nelegale! Cunoscând prevederile legale îmi
          asum orice consecințe financiare și nonfinanciare ce pot să apară pe acest considerent!
        </p>
        <div style={{ marginTop: 30 }}>Semnatura {sellerName}: ______________________</div>
        <div style={{ marginTop: 30, borderTop: "1px solid #E5E7EB", paddingTop: 10, fontSize: 11 }}>
          <div>Companie - {companyName}</div>
          <div>CUI - {companyCui}</div>
          <div>Adresa - {companyAddress}</div>
          <div>Telefon - {companyPhone}</div>
        </div>
      </div>

      {/* b) Chitanță de cumpărare */}
      <div className="doc-page" style={pageStyle}>
        <div style={h1}>Chitanță de cumpărare</div>
        <div>Data: {data}</div>
        <div>ID: {bonNo}</div>
        <div style={{ marginTop: 14, fontWeight: 700 }}>Valoarea totala achitata: {price} lei</div>
        <p style={{ marginTop: 16 }}>
          Subsemnatul {sellerName} am primit suma de mai sus in schimbul vânzării obiectului mai jos menționat,
          transferând dreptul de proprietate asupra acestuia integral și definitiv către cumpărător.
        </p>
        <div>Obiect: {deviceDescription}</div>
        <div style={{ marginTop: 30 }}>Semnătura vânzătorului: ______________________</div>
        <div style={{ marginTop: 30 }}>Semnătura pretuitorului: ______________________</div>
        <div style={{ marginTop: 30, borderTop: "1px solid #E5E7EB", paddingTop: 10, fontSize: 11 }}>
          <div>Companie - {companyName}</div>
          <div>CUI - {companyCui}</div>
          <div>Adresa - {companyAddress}</div>
          <div>Telefon - {companyPhone}</div>
        </div>
      </div>

      {/* c) Contract de vânzare-cumpărare */}
      <div className="doc-page" style={pageStyle}>
        <div style={h1}>Contract de vânzare-cumpărare</div>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Părțile contractului</div>
        <p>
          {companyName} cu sediul în {companyAddress}, înregistrată în Registrul Comerţului sub nr. {companyCui}, în
          calitate de cumpărător și {sellerName}, cu resedinta {sellerAddress}, CNP/CI {sellerCnp}, în calitate de
          vânzător!
        </p>
        <p><b>Art. 1.</b> Obiectul contractului. Obiectul prezentului contract îl reprezintă vânzarea-cumpărarea
        bunului descris mai jos, la prețul de {price} lei, achitat integral de către cumpărător la data semnării
        prezentului contract.</p>
        <p><b>Art. 2.</b> Declarația vânzătorului. Vânzătorul declară pe propria răspundere că este proprietarul de
        drept al bunului, că acesta a fost dobândit prin mijloace legale și că nu este grevat de sarcini sau
        pretenții ale unor terți.</p>
        <p><b>Art. 3.</b> Transferul proprietății. Prin semnarea prezentului contract și achitarea integrală a
        prețului, dreptul de proprietate asupra bunului se transferă integral și definitiv către cumpărător, de la
        acest moment cumpărătorul putând dispune liber de bun (inclusiv prin revânzare către terți).</p>
        <p>Prezentul contract a fost încheiat astăzi, {data}, în 2 exemplare originale, câte 1 pentru fiecare parte
        contractantă.</p>
        <div style={{ marginTop: 20 }}>Vânzător: {sellerName} ______________________</div>
        <div style={{ marginTop: 10 }}>Cumpărător: {companyName} ______________________</div>
        <div style={{ marginTop: 24, fontWeight: 700 }}>Anexă — obiect vândut:</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginTop: 8 }}>
          <thead>
            <tr>
              {["NR Bon", "Preț de achiziție", "Descriere obiect", "Date vânzător", "CNP/C.I."].map((h) => (
                <th key={h} style={{ border: "1px solid #D1D5DB", padding: 5, textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: "1px solid #D1D5DB", padding: 5 }}>{bonNo}</td>
              <td style={{ border: "1px solid #D1D5DB", padding: 5 }}>{price}</td>
              <td style={{ border: "1px solid #D1D5DB", padding: 5 }}>{deviceDescription}</td>
              <td style={{ border: "1px solid #D1D5DB", padding: 5 }}>{sellerName}</td>
              <td style={{ border: "1px solid #D1D5DB", padding: 5 }}>{sellerCnp}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* d) Formular de consimțământ (GDPR) */}
      <div className="doc-page" style={pageStyle}>
        <div style={h1}>FORMULAR DE CONSIMȚĂMÂNT</div>
        <p>
          Subsemnatul/Subsemnata, {sellerName} sunt de acord prin prezentul că {companyName} îmi poate prelucra
          datele cu caracter personal în următoarele scopuri: informarea clienților, activități comerciale, promovarea
          produselor, analiza solicitării de finanțare, marketing, cercetare de piață, statistică, urmărire și
          monitorizare a vânzărilor și arhivarea acestor informații.
        </p>
        <p>
          Sunt de acord ca, pentru îndeplinirea scopurilor menționate mai sus, {companyName} să utilizeze serviciile
          mai multor parteneri contractuali cum ar fi: bănci, societăți de curierat și care își desfășoară activitatea
          comercială în România iar acestora le pot fi furnizate datele mele cu caracter personal pentru a fi
          utilizate în limitele obligațiilor pe care și le asumă față de {companyName}. Sunt de acord ca datele cu
          caracter personal indicate mai sus pot fi puse la dispoziție sau transmise către terți și în următoarele
          situații:<br />
          1. autorități publice, instituții cu competențe în realizarea de inspecții și controale asupra activității
          {" " + companyName}, care solicită societății {companyName} să furnizeze informații, în virtutea obligațiilor
          legale ale acesteia din urmă. Aceste autorități publice sau instituții pot fi ANAF, DGAF;<br />
          2. pentru respectarea unei cerințe legale sau pentru protejarea drepturilor și activelor societății noastre
          sau ale altor entități sau persoane, precum instanțe de judecată, executori judecătorești, organe de poliție;<br />
          3. terți achizitori, în măsura în care activitatea {companyName} ar fi transferată (în totalitate sau
          parțial), iar datele persoanelor vizate ar fi parte din activele care fac obiectul unei astfel de tranzacții.
        </p>
        <p>
          Sunt conștient și am fost informat că pot să îmi retrag consimțământul în orice moment printr-o cerere
          scrisă, datată și semnată către {companyName}, {companyAddress}, sau la adresa de e-mail: {companyEmail}.
        </p>
        <div style={{ marginTop: 30 }}>Semnătura: ______________________</div>
      </div>
    </>
  );
}
