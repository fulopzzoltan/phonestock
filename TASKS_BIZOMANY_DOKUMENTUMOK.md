# TASKS — Bizományos dokumentumcsomag automatikus generálása + nyilvántartás

Kiegészíti a `TASKS_BIZOMANYOS_ERTEKESITES.md`-t. A feltöltött `01.docx` (a jelenlegi Airtable+Make alapú megoldásból) alapján — ez a minta lett feldolgozva és **szó szerint** átemelve (a jogi/nyilatkozat-szövegeket **nem szabad átfogalmazni**, csak a változó adatokat kell mezőkkel helyettesíteni, ugyanaz az elv, mint a `SERVICE_WARRANTY_TERMS`-nél a CLAUDE.md-ben).

## 0. Két dolgot találtam a mintában, amit MIELŐTT élesítjük, jogilag tisztázni kell

**Ez fontos, nem hagyhatom szó nélkül**: a *Contract de consignaţie* szövegében **ellentmondás van a szerződő felek szerepében**:
- A szerződés eleje: *"Telefonos Keze S.R.L. ... în calitate de **consignant** și Hajdu Endre ... în calitate de **consignatar**"* — tehát a cég = consignant, az ügyfél = consignatar.
- Az Art. 3-4 pontok tartalma (aki az árut *átadja* eladásra = consignant; aki *eladja és megtartja a jutalékot* = consignatar) ez alapján pont **fordítva** lenne helyes — a cég a valódi szerepe szerint consignatar (ő adja el, ő tartja meg a jutalékot: *"(6)(b) să păstreze pentru sine sumele încasate... ca diferenţă"*), az ügyfél pedig consignant (ő az áru tulajdonosa, aki átadja).
- A záró aláírás-blokk **megint máshogy** van: *"Consignant : Hajdu Endre / Consignatar: Telefonos Keze S.R.L."* — ez már a "helyes" (Art. 3-4-gyel egyező) irány, tehát a dokumentum **önmagában inkonzisztens**: az eleje és a vége ellentmond egymásnak.
- **Emellett** az Art. 2-ben egy kitöltetlen rész maradt: *"...denunţa contractul cu un preaviz de ... zile."* (hiányzik a napok száma).

Ezt ügyvéddel/könyvelővel javítsd ki, mielőtt a rendszer élesben generálja — a specifikáció a te végleges, javított szövegedet fogja használni. Amíg nincs javított verzió, a rendszer az eredeti (a záró aláírás-blokk szerinti, tehát cég=consignatar) logikával épül meg, mert ez egyezik a tényleges pénzügyi tartalommal (Art. 4(6)(b)).

## 1. Cégadatok — új, központi hely

Jelenleg **sehol a kódban nincs** a cég jogi adata (CUI, cégnév, cím, telefon, email) — eddig ezt kézzel írtátok be Airtable-ben minden dokumentumnál. Vedd fel az `app_settings` táblába (ami már létezik, egysoros singleton — `SettingsTab.jsx`-ben van rá minta az SMS-kapcsolóknál):

```sql
alter table app_settings add column company_name text default 'Telefonos Keze S.R.L.';
alter table app_settings add column company_cui text default '51785064';
alter table app_settings add column company_address text;
alter table app_settings add column company_phone text default '0775341198';
alter table app_settings add column company_email text default 'telefonoskezesrll@gmail.com';
```
`SettingsTab.jsx`-ben egy új "Cégadatok" szekció, ahol admin szerkesztheti — ezek minden generált dokumentumban felhasználásra kerülnek, egy helyen karbantartva.

## 2. Bon-szám — sorszámozás

A mintában `ID: 01` — folyamatos, zéróval kipárnázott sorszám. Új Postgres sequence:
```sql
create sequence consignment_bon_seq start 1;
```
A `TASKS_BIZOMANYOS_ERTEKESITES.md`-ben leírt `product_acquisitions.consignment_doc_no` mezőt ebből töltsd fel intake-kor: `lpad(nextval('consignment_bon_seq')::text, 2, '0')` (2 számjegy — 99 fölött magától bővül, nem vész el adat).

## 3. Adatmodell-kiegészítés — `product_acquisitions` (a másik specben leírtakhoz képest)

A dokumentumokhoz kellenek még: `seller_cnp` (a mintában "CNP/C.I." — külön mező a `seller_id_doc`-tól, ami inkább a személyi igazolvány száma volt; itt valójában CNP is szerepel, tisztázd melyiket kéred be — a mintában mindkettő ugyanabba a cellába került: `1920205190437`), `seller_address` (a szerződéshez kell, "cu resedinta ..."). Egészítsd ki:
```sql
alter table product_acquisitions add column seller_cnp text;
alter table product_acquisitions add column seller_address text;
```

## 4. `PrintConsignmentDocs.jsx` — az öt dokumentum, a meglévő nyomtatási minta szerint

A `PrintSlip.jsx`/`PrintReceiptSlip.jsx` mintáját kövesd (`#print-slip-root` + `@media print` CSS, mindig a DOM-ban, csak nyomtatáskor látszik, `window.print()` hívja). Az öt szakasz **szó szerint** a mintából, `{{...}}` a változó mezők:

### a) Declarație de proveniență produs
```
Declaratie de provenienta produs
Data: {{data}}
ID: {{bonNo}}

Date Deponent
Nume - {{sellerName}}
Telefon - {{sellerPhone}}
Dispozitiv - {{deviceDescription}}

Subsemnatul {{sellerName}}, in calitate de deponent ,declar pe propria răspundere ca obiectul lăsat in
consignatie este un bun din patrimoniul propriu și nu a fost dobândit prin mijloace nelegale! Cunoscând
prevederile legale îmi asum orice consecințe financiare și nonfinanciare ce pot să apară pe acest considerent!

Semnatura {{sellerName}}: ______________________

Companie - {{companyName}}
CUI - {{companyCui}}
Adresa - {{companyAddress}}
Telefon - {{companyPhone}}
```

### b) Borderou de primire a obiectelor în consignație
```
Borderou de primire a obiectelor în consignație
Data: {{data}}
ID: {{bonNo}}

Predat pretuitor: ______________________
Primit gestionar: ______________________

Companie - {{companyName}}
CUI - {{companyCui}}
Adresa - {{companyAddress}}
Telefon - {{companyPhone}}
```
("Predat pretuitor"/"Primit gestionar" — üres aláírás-sor, a becsüs/átvevő kézzel írja alá; ha szeretnéd, előtöltheted a bejelentkezett staff nevével, de aláírás-hely mindenképp kell.)

### c) Bon de primire în consignație
```
Bon de primire în consignație
Data: {{data}}
ID: {{bonNo}}

Valoarea totala la primire: {{payoutAmount}} lei

Am luat la cunostinta de instrucțiunile prevăzute pe verso.
Semnătura deponentului: ______________________

Am primit spre vanzare in consignatie obiectele menționate mai sus, de la {{sellerName}}
Semnătura pretuitorului: ______________________

Companie - {{companyName}}
CUI - {{companyCui}}
Adresa - {{companyAddress}}
Telefon - {{companyPhone}}
```
**Hiányzik a "verso" (hátoldal) szövege** — a feltöltött dokumentumban nincs benne, valószínűleg egy külön, előre nyomtatott lapon volt. Ha van ilyen szöveged, add meg, és belekerül; addig ez a sor csak utal rá, tartalom nélkül.

### d) Contract de consignaţie — a teljes szerződés, szó szerint

```
Contract de consignaţie

Părțile contractului
{{companyName}} cu sediul în {{companyAddress}}, înregistrată în Registrul Comerţului sub nr. {{companyCui}},
în calitate de consignatar și {{sellerName}}, cu resedinta {{sellerAddress}} în calitate de consignant!

Art. 1. Obiectul contractului. Obiectul prezentului contract îl reprezintă vânzarea în regim de consignaţie a
bunurilor/mărfurilor/produselor, livrate de către consignant consignatarului la termenele, cantităţile,
calităţile şi celelalte condiţii stabilite prin anexă.

Art. 2. Durata contractului. Prezentul contract se încheie pe o perioadă nedeterminată, fiecare parte
contractantă putând denunţa contractul cu un preaviz de {{noticeDays}} zile.

Art. 3. Drepturile şi obligaţiile consignantului.
(1) Consignantul se obligă să livreze consignatarului, pe cheltuială proprie, bunurile/mărfurile/produse ce
urmează să fie vândute către terţi în regim de consignaţie; livrarea se va face în tranşe în funcţie de
vânzări şi pe baza comenzilor făcute de către consignatar.
(2) Consignantul păstrează dreptul de proprietate asupra tuturor bunurilor livrate şi, până în momentul
vânzării acestora către terţele persoane, poate dispune în mod liber de ele. în calitatea sa de proprietar,
consignantul poate în orice moment să verifice modul de păstrare/depozitare a bunurilor şi le poate ridica
de la consignatar pentru a dispune de acestea cum va crede de cuviinţă.
(3) în afară de cele stipulate mai sus, consignantul se angajează:
a) să comunice consignatarului, în timp util, preţurile cu care urmează să fie vândute, precum şi orice
schimbare a preţurilor sau a celorlalte condiţii de vânzare.
b) să comunice consignatarului toate datele, informaţiile, instrucţiunile, mostrele, cataloagele, manualele
tehnice, tehnicile de prezentare etc., necesare vânzării bunurilor.
c) să răspundă pentru toate viciile aparente, viciile ascunse şi pentru orice fel de lipsuri care nu provin
din culpa consignatarului.
d) să-l despăgubească pe consignatar pentru toate sumele avansate de către acesta în legătură cu bunurile ce
formează obiectul consignaţiei.
e) să achite consignatarului toate sumele de bani pe care acesta este obligat faţă de terţi în calitatea sa
de vânzător, rezultate din pretenţiile terţilor izvorâte din defecţiunile apărute în perioada de garanţie,
de viciile aparente sau de viciile ascunse, după caz, precum şi din pretenţiile terţilor pentru defecţiunile
apărute în perioada medie de utilizare.

Art. 4. Drepturile şi obligaţiile consignatarului.
(1) Consignatarul are obligaţia de a prelua bunurile de la consignant în vederea vânzării către terţi şi de
a le conservă astfel încât să se asigure integritatea acestora şi să se evite orice fel de degradări sau
deteriorări.
(2) Consignatarul suportă toate pierderile, lipsurile, degradările, deteriorările, alterările şi orice alte
defecţiuni sau neregularităţi care îi sunt imputabile, survenite asupra bunurilor ce i-au fost încredinţate.
(3) Consignatarul se obligă să încheie o poliţă de asigurare care să cuprindă toate riscurile privind pieirea
totală sau parţială asupra bunurilor ce formează obiectul prezentului contract; în caz contrar, va suporta
riscul pieirii acestora;
(4) în afară de obligaţiile stipulate mai sus, consignatarul trebuie:
a) să păstreze integritatea ambalajelor originale, etichetele, mărcile, indicaţiile de origine şi de
provenienţă aplicate de producător şi orice alte menţiuni şi specificaţii existente pe produse;
b) să comunice, de îndată (15 zile) şi sub formă scrisă (mail , sms) consignantului viciile aparente sau
ascunse descoperite, precum şi orice alte reclamaţii primite de la terţi;
c) să suporte toate cheltuielile care privesc conservare, depozitarea comercializarea bunurilor primite în
consignaţie;
d) să remită consignantului sumele încasate în urma vânzării bunurilor în termen de 30 zile de la data
încasării acestora;
e) să respecte condiţiile de vânzare stabilite de către consignant, inclusiv preţul de vânzare al acestora;
f) să ţină evidenţe separate pentru bunurile pe care le deţine de la consignant;
g) la sfârşitul fiecărei săptămâni, să comunice consignantului lista cu bunurile vândute şi operaţiunile
efectuate daca au existat asemenea operațiuni;
h) să plătească dobânzi pentru sumele folosite şi care aparţin consignantului, de la data folosirii acestora,
iar în caz de nefolosire, de la data la care trebuia să le remită sau să le consemneze în contul
consignantului;
i) să restituie, la cererea consignantului, bunurile predate în consignaţie nevândute pană până la data
solicitării.
(5) Consignatarul nu are niciun drept de retenţie asupra bunurilor consignantului.
(6) Consignatarul are următoarele drepturi:
a) să-şi organizeze activitatea de vânzare a bunurilor şi va amenaja magazinele/spaţiile de vânzare după
regulile proprii;
b) să păstreze pentru sine sumele încasate de la terţ ca diferenţă între preţurile stabilite cu consignantul
și prețurile cu care au fost vândute bunurile;

Art. 5. Forţa majoră.
(1) Forţa majoră, ca eveniment extern, imprevizibil, absolut invincibil şi inevitabil, este constatată de o
autoritate competentă. Forţa majoră exonerează părţile contractante de îndeplinirea obligaţiilor asumate
prin prezentul contract, pe toată perioada în care aceasta acţionează.
(2) îndeplinirea contractului va fi suspendată în perioada de acţiune a forţei majore, dar fără a prejudicia
drepturile ce li se cuveneau părţilor până la apariţia acesteia.
(3) Partea contractantă care invocă forţa majoră are obligaţia de a notifica celeilalte părţi, imediat şi în
mod complet, producerea acesteia şi de a lua orice măsuri care îi stau la dispoziţie în vederea limitării
consecinţelor.
(4) Dacă forţa majoră acţionează sau se estimează că va acţiona o perioadă mai mare de 6 luni, fiecare parte
va avea dreptul să notifice celeilalte părţi încetarea de plin drept a prezentului contract, fără ca vreuna
dintre părţi să poată pretinde celeilalte daune-interese.

Prezentul contract a fost încheiat astăzi, {{data}}, în 2 exemplare originale, câte 1 pentru fiecare parte
contractantă.

Consignant: {{sellerName}} ______________________
Consignatar: {{companyName}} ______________________

Anexă — obiecte predate în consignaţie:
| NR Bon | Valoare la primire | Valoare la vanzare | Descriere obiect | Date client | CNP/C.I. |
| {{bonNo}} | {{payoutAmount}} | {{salePrice}} | {{deviceDescription}} | {{sellerName}} | {{sellerCnp}} |
```
**A "consignant"/"consignatar" szerepeket a 0. pontban leírtak szerint már a helyes (Art. 4(6)(b)-vel egyező) irányban írtam meg** — cég = consignatar, ügyfél = consignant. Ha az ügyvéddel egyeztetve mást szeretnétek, ez az egyetlen hely, ahol a két szót át kell írni.

### e) Formular de consimțământ (GDPR)
```
FORMULAR DE CONSIMȚĂMÂNT

Subsemnatul/Subsemnata, {{sellerName}} sunt de acord prin prezentul că {{companyName}} îmi poate prelucra
datele cu caracter personal în următoarele scopuri: informarea clienților, activități comerciale, promovarea
produselor, analiza solicitării de finanțare, marketing, cercetare de piață, statistică, urmărire și
monitorizare a vânzărilor și arhivarea acestor informații.

Sunt de acord ca, pentru îndeplinirea scopurilor menționate mai sus, {{companyName}} să utilizeze serviciile
mai multor parteneri contractuali cum ar fi: bănci, societăți de curierat și care își desfășoară activitatea
comercială în România iar acestora le pot fi furnizate datele mele cu caracter personal pentru a fi
utilizate în limitele obligațiilor pe care și le asumă față de {{companyName}}. Sunt de acord ca datele cu
caracter personal indicate mai sus pot fi puse la dispoziție sau transmise către terți și în următoarele
situații:
1. autorități publice, instituții cu competențe în realizarea de inspecții și controale asupra activității
{{companyName}}, care solicită societății {{companyName}} să furnizeze informații, în virtutea obligațiilor
legale ale acesteia din urmă. Aceste autorități publice sau instituții pot fi ANAF, DGAF;
2. pentru respectarea unei cerințe legale sau pentru protejarea drepturilor și activelor societății noastre
sau ale altor entități sau persoane, precum instanțe de judecată, executori judecătorești, organe de poliție;
3. terți achizitori, în măsura în care activitatea {{companyName}} ar fi transferată (în totalitate sau
parțial), iar datele persoanelor vizate ar fi parte din activele care fac obiectul unei astfel de tranzacții.

Sunt conștient și am fost informat că pot să îmi retrag consimțământul în orice moment printr-o cerere
scrisă, datată și semnată către {{companyName}}, {{companyAddress}}, sau la adresa de e-mail: {{companyEmail}}.

Semnătura: ______________________
```

### f) Fișă de evaluare preț (a mintában szereplő második táblázat)
```
| Denumirea obiectului | Descriere obiect | Pret evaluare | Comision | Tva | Pret de vanzare |
| Telefon | {{deviceDescription}} | {{payoutAmount}} | {{commission}} | 0 | {{salePrice}} |
```
`{{commission}} = {{salePrice}} - {{payoutAmount}}` (számolt mező, ugyanaz a logika, mint a `TASKS_BIZOMANYOS_ERTEKESITES.md`-ben). A TVA mindig `0`, mert a cég jelenleg nem ÁFA-köteles (neplătitor de TVA, mikro-vállalkozás) — **ha ez a jövőben változik, ezt a konstanst kell majd módosítani**, nem statikus szöveg.

## 5. Trigger — mikor generálódjon

Amikor a `TASKS_BIZOMANYOS_ERTEKESITES.md` szerinti bizomány-intake mentése megtörténik (`StockModal`, "Bizomány" választva), a mentés után azonnal jelenjen meg egy "Dokumentumok nyomtatása" gomb/modal, ami megnyitja a `PrintConsignmentDocs`-ot a frissen mentett adatokkal előtöltve, és `window.print()`-et hív. Ne várjon külön navigációra — "amikor felviszünk egy telefont, ezek legeneráljanak" pontosan ezt jelenti.

## 6. Nyilvántartás (registry)

A `StockTab.jsx` aljára (a meglévő `HistorySection` minta szerint, ahogy a "Átadott munkalapok"/"Felhasznált alkatrészek" is működik máshol) egy új szekció: **"Bizományos nyilvántartás"** — a `product_acquisitions` `acquisition_type = 'consignment'` sorai, oszlopok: Bon szám, Dátum, Ügyfél neve, CNP, Eszköz, Átvételi ár, Eladási ár (ha eladva), Jutalék (számolt), Kifizetés-státusz. Kattintásra nyíljon meg a `ProductDetailPanel` (vagy egy "Újranyomtatás" gomb, ha valaki elveszítette a papírt).

---

## Ellenőrzőlista implementálás után

- `npm run build` hibamentes, migrációk lefutnak
- Cégadatok a Beállítások fülön szerkeszthetők, egy helyen
- Bizomány-intake mentése után egy kattintásra nyomtatható mind az 5 dokumentum + az árazási táblázat, helyesen kitöltve
- Bon-szám sorban nő, nem ütközik
- **A consignant/consignatar szerepek és a hiányzó "preaviz" napszám ügyvéddel véglegesítve, mielőtt élesben bármit aláírnátok** vele
- "Bizományos nyilvántartás" szekció a Telefonok fülön mutatja az összes bizományos tételt, státusszal
- Nincs `git push`, csak lokális commit
