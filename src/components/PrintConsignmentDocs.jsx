function fmtDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

const pageStyle = { fontFamily: "Inter, sans-serif", color: "#111827", padding: "26px 34px", fontSize: 12.5, lineHeight: 1.5, maxWidth: 760 };
const h1 = { fontSize: 17, fontWeight: 800, marginBottom: 14, textAlign: "center" };
const label = { fontWeight: 700 };

export default function PrintConsignmentDocs({ product, acquisition, settings }) {
  if (!product || !acquisition) return null;
  const data = fmtDate(new Date().toISOString().slice(0, 10));
  const bonNo = acquisition.consignmentDocNo;
  const sellerName = acquisition.sellerName;
  const sellerPhone = acquisition.sellerPhone || "";
  const sellerAddress = acquisition.sellerAddress || "";
  const sellerCnp = acquisition.sellerCnp || acquisition.sellerIdDoc || "";
  const deviceDescription = [product.brand, product.model, product.storage, product.color].filter(Boolean).join(" ");
  const payoutAmount = Number(acquisition.consignorPayoutAmount) || 0;
  const salePrice = Number(product.salePrice) || 0;
  const commission = salePrice - payoutAmount;
  const companyName = settings?.companyName || "";
  const companyCui = settings?.companyCui || "";
  const companyAddress = settings?.companyAddress || "";
  const companyPhone = settings?.companyPhone || "";
  const companyEmail = settings?.companyEmail || "";
  const noticeDays = settings?.consignmentNoticeDays;

  return (
    <>
      {/* a) Declarație de proveniență produs */}
      <div className="doc-page" style={pageStyle}>
        <div style={h1}>Declaratie de provenienta produs</div>
        <div>Data: {data}</div>
        <div>ID: {bonNo}</div>
        <div style={{ marginTop: 14, fontWeight: 700 }}>Date Deponent</div>
        <div>Nume - {sellerName}</div>
        <div>Telefon - {sellerPhone}</div>
        <div>Dispozitiv - {deviceDescription}</div>
        <p style={{ marginTop: 16 }}>
          Subsemnatul {sellerName}, in calitate de deponent ,declar pe propria răspundere ca obiectul lăsat in
          consignatie este un bun din patrimoniul propriu și nu a fost dobândit prin mijloace nelegale! Cunoscând
          prevederile legale îmi asum orice consecințe financiare și nonfinanciare ce pot să apară pe acest considerent!
        </p>
        <div style={{ marginTop: 30 }}>Semnatura {sellerName}: ______________________</div>
        <div style={{ marginTop: 30, borderTop: "1px solid #E5E7EB", paddingTop: 10, fontSize: 11 }}>
          <div>Companie - {companyName}</div>
          <div>CUI - {companyCui}</div>
          <div>Adresa - {companyAddress}</div>
          <div>Telefon - {companyPhone}</div>
        </div>
      </div>

      {/* b) Borderou de primire a obiectelor în consignație */}
      <div className="doc-page" style={pageStyle}>
        <div style={h1}>Borderou de primire a obiectelor în consignație</div>
        <div>Data: {data}</div>
        <div>ID: {bonNo}</div>
        <div style={{ marginTop: 40 }}>Predat pretuitor: ______________________</div>
        <div style={{ marginTop: 30 }}>Primit gestionar: ______________________</div>
        <div style={{ marginTop: 30, borderTop: "1px solid #E5E7EB", paddingTop: 10, fontSize: 11 }}>
          <div>Companie - {companyName}</div>
          <div>CUI - {companyCui}</div>
          <div>Adresa - {companyAddress}</div>
          <div>Telefon - {companyPhone}</div>
        </div>
      </div>

      {/* c) Bon de primire în consignație */}
      <div className="doc-page" style={pageStyle}>
        <div style={h1}>Bon de primire în consignație</div>
        <div>Data: {data}</div>
        <div>ID: {bonNo}</div>
        <div style={{ marginTop: 14, fontWeight: 700 }}>Valoarea totala la primire: {payoutAmount} lei</div>
        <p style={{ marginTop: 16 }}>Am luat la cunostinta de instrucțiunile prevăzute pe verso.</p>
        <div>Semnătura deponentului: ______________________</div>
        <p style={{ marginTop: 16 }}>Am primit spre vanzare in consignatie obiectele menționate mai sus, de la {sellerName}</p>
        <div>Semnătura pretuitorului: ______________________</div>
        <div style={{ marginTop: 30, borderTop: "1px solid #E5E7EB", paddingTop: 10, fontSize: 11 }}>
          <div>Companie - {companyName}</div>
          <div>CUI - {companyCui}</div>
          <div>Adresa - {companyAddress}</div>
          <div>Telefon - {companyPhone}</div>
        </div>
      </div>

      {/* d) Contract de consignaţie */}
      <div className="doc-page" style={pageStyle}>
        <div style={h1}>Contract de consignaţie</div>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Părțile contractului</div>
        <p>
          {companyName} cu sediul în {companyAddress}, înregistrată în Registrul Comerţului sub nr. {companyCui},
          în calitate de consignatar și {sellerName}, cu resedinta {sellerAddress} în calitate de consignant!
        </p>
        <p><b>Art. 1.</b> Obiectul contractului. Obiectul prezentului contract îl reprezintă vânzarea în regim de consignaţie a
        bunurilor/mărfurilor/produselor, livrate de către consignant consignatarului la termenele, cantităţile,
        calităţile şi celelalte condiţii stabilite prin anexă.</p>
        <p><b>Art. 2.</b> Durata contractului. Prezentul contract se încheie pe o perioadă nedeterminată, fiecare parte
        contractantă putând denunţa contractul cu un preaviz de {noticeDays ? `${noticeDays} zile` : "______ zile"}.</p>
        <p><b>Art. 3.</b> Drepturile şi obligaţiile consignantului.<br />
        (1) Consignantul se obligă să livreze consignatarului, pe cheltuială proprie, bunurile/mărfurile/produse ce
        urmează să fie vândute către terţi în regim de consignaţie; livrarea se va face în tranşe în funcţie de
        vânzări şi pe baza comenzilor făcute de către consignatar.<br />
        (2) Consignantul păstrează dreptul de proprietate asupra tuturor bunurilor livrate şi, până în momentul
        vânzării acestora către terţele persoane, poate dispune în mod liber de ele. în calitatea sa de proprietar,
        consignantul poate în orice moment să verifice modul de păstrare/depozitare a bunurilor şi le poate ridica
        de la consignatar pentru a dispune de acestea cum va crede de cuviinţă.<br />
        (3) în afară de cele stipulate mai sus, consignantul se angajează:<br />
        a) să comunice consignatarului, în timp util, preţurile cu care urmează să fie vândute, precum şi orice
        schimbare a preţurilor sau a celorlalte condiţii de vânzare.<br />
        b) să comunice consignatarului toate datele, informaţiile, instrucţiunile, mostrele, cataloagele, manualele
        tehnice, tehnicile de prezentare etc., necesare vânzării bunurilor.<br />
        c) să răspundă pentru toate viciile aparente, viciile ascunse şi pentru orice fel de lipsuri care nu provin
        din culpa consignatarului.<br />
        d) să-l despăgubească pe consignatar pentru toate sumele avansate de către acesta în legătură cu bunurile ce
        formează obiectul consignaţiei.<br />
        e) să achite consignatarului toate sumele de bani pe care acesta este obligat faţă de terţi în calitatea sa
        de vânzător, rezultate din pretenţiile terţilor izvorâte din defecţiunile apărute în perioada de garanţie,
        de viciile aparente sau de viciile ascunse, după caz, precum şi din pretenţiile terţilor pentru defecţiunile
        apărute în perioada medie de utilizare.</p>
        <p><b>Art. 4.</b> Drepturile şi obligaţiile consignatarului.<br />
        (1) Consignatarul are obligaţia de a prelua bunurile de la consignant în vederea vânzării către terţi şi de
        a le conservă astfel încât să se asigure integritatea acestora şi să se evite orice fel de degradări sau
        deteriorări.<br />
        (2) Consignatarul suportă toate pierderile, lipsurile, degradările, deteriorările, alterările şi orice alte
        defecţiuni sau neregularităţi care îi sunt imputabile, survenite asupra bunurilor ce i-au fost încredinţate.<br />
        (3) Consignatarul se obligă să încheie o poliţă de asigurare care să cuprindă toate riscurile privind pieirea
        totală sau parţială asupra bunurilor ce formează obiectul prezentului contract; în caz contrar, va suporta
        riscul pieirii acestora;<br />
        (4) în afară de obligaţiile stipulate mai sus, consignatarul trebuie:<br />
        a) să păstreze integritatea ambalajelor originale, etichetele, mărcile, indicaţiile de origine şi de
        provenienţă aplicate de producător şi orice alte menţiuni şi specificaţii existente pe produse;<br />
        b) să comunice, de îndată (15 zile) şi sub formă scrisă (mail , sms) consignantului viciile aparente sau
        ascunse descoperite, precum şi orice alte reclamaţii primite de la terţi;<br />
        c) să suporte toate cheltuielile care privesc conservare, depozitarea comercializarea bunurilor primite în
        consignaţie;<br />
        d) să remită consignantului sumele încasate în urma vânzării bunurilor în termen de 30 zile de la data
        încasării acestora;<br />
        e) să respecte condiţiile de vânzare stabilite de către consignant, inclusiv preţul de vânzare al acestora;<br />
        f) să ţină evidenţe separate pentru bunurile pe care le deţine de la consignant;<br />
        g) la sfârşitul fiecărei săptămâni, să comunice consignantului lista cu bunurile vândute şi operaţiunile
        efectuate daca au existat asemenea operațiuni;<br />
        h) să plătească dobânzi pentru sumele folosite şi care aparţin consignantului, de la data folosirii acestora,
        iar în caz de nefolosire, de la data la care trebuia să le remită sau să le consemneze în contul
        consignantului;<br />
        i) să restituie, la cererea consignantului, bunurile predate în consignaţie nevândute pană până la data
        solicitării.<br />
        (5) Consignatarul nu are niciun drept de retenţie asupra bunurilor consignantului.<br />
        (6) Consignatarul are următoarele drepturi:<br />
        a) să-şi organizeze activitatea de vânzare a bunurilor şi va amenaja magazinele/spaţiile de vânzare după
        regulile proprii;<br />
        b) să păstreze pentru sine sumele încasate de la terţ ca diferenţă între preţurile stabilite cu consignantul
        și prețurile cu care au fost vândute bunurile;</p>
        <p><b>Art. 5.</b> Forţa majoră.<br />
        (1) Forţa majoră, ca eveniment extern, imprevizibil, absolut invincibil şi inevitabil, este constatată de o
        autoritate competentă. Forţa majoră exonerează părţile contractante de îndeplinirea obligaţiilor asumate
        prin prezentul contract, pe toată perioada în care aceasta acţionează.<br />
        (2) îndeplinirea contractului va fi suspendată în perioada de acţiune a forţei majore, dar fără a prejudicia
        drepturile ce li se cuveneau părţilor până la apariţia acesteia.<br />
        (3) Partea contractantă care invocă forţa majoră are obligaţia de a notifica celeilalte părţi, imediat şi în
        mod complet, producerea acesteia şi de a lua orice măsuri care îi stau la dispoziţie în vederea limitării
        consecinţelor.<br />
        (4) Dacă forţa majoră acţionează sau se estimează că va acţiona o perioadă mai mare de 6 luni, fiecare parte
        va avea dreptul să notifice celeilalte părţi încetarea de plin drept a prezentului contract, fără ca vreuna
        dintre părţi să poată pretinde celeilalte daune-interese.</p>
        <p>Prezentul contract a fost încheiat astăzi, {data}, în 2 exemplare originale, câte 1 pentru fiecare parte
        contractantă.</p>
        <div style={{ marginTop: 20 }}>Consignant: {sellerName} ______________________</div>
        <div style={{ marginTop: 10 }}>Consignatar: {companyName} ______________________</div>
        <div style={{ marginTop: 24, fontWeight: 700 }}>Anexă — obiecte predate în consignaţie:</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginTop: 8 }}>
          <thead>
            <tr>
              {["NR Bon", "Valoare la primire", "Valoare la vanzare", "Descriere obiect", "Date client", "CNP/C.I."].map((h) => (
                <th key={h} style={{ border: "1px solid #D1D5DB", padding: 5, textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: "1px solid #D1D5DB", padding: 5 }}>{bonNo}</td>
              <td style={{ border: "1px solid #D1D5DB", padding: 5 }}>{payoutAmount}</td>
              <td style={{ border: "1px solid #D1D5DB", padding: 5 }}>{salePrice}</td>
              <td style={{ border: "1px solid #D1D5DB", padding: 5 }}>{deviceDescription}</td>
              <td style={{ border: "1px solid #D1D5DB", padding: 5 }}>{sellerName}</td>
              <td style={{ border: "1px solid #D1D5DB", padding: 5 }}>{sellerCnp}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* e) Formular de consimțământ (GDPR) */}
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

      {/* Fișă de evaluare preț */}
      <div className="doc-page" style={pageStyle}>
        <div style={h1}>Fișă de evaluare preț</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
          <thead>
            <tr>
              {["Denumirea obiectului", "Descriere obiect", "Pret evaluare", "Comision", "Tva", "Pret de vanzare"].map((h) => (
                <th key={h} style={{ border: "1px solid #D1D5DB", padding: 6, textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: "1px solid #D1D5DB", padding: 6 }}>Telefon</td>
              <td style={{ border: "1px solid #D1D5DB", padding: 6 }}>{deviceDescription}</td>
              <td style={{ border: "1px solid #D1D5DB", padding: 6 }}>{payoutAmount}</td>
              <td style={{ border: "1px solid #D1D5DB", padding: 6 }}>{commission}</td>
              <td style={{ border: "1px solid #D1D5DB", padding: 6 }}>0</td>
              <td style={{ border: "1px solid #D1D5DB", padding: 6 }}>{salePrice}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
