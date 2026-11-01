# CATD — hidranți, pagină separată

`/catd` afișează exclusiv stratul CATD de inspecție a hidranților. Nu citește și nu modifică hidranții aplicației, rapoartele sau sursele existente. Nu include apometre.

## Acces și API

În Dashboard → Utilizatori → Taburi permise, bifați `CATD` (`allowedTabs: ["catd"]`). Accesul necesită și `fullAccess: true`. Administratorul principal existent are acces implicit. Dreptul CATD singur nu conferă acces la dashboard sau la sincronizare.

- `GET /api/catd/hydrants`: Firebase ID token Bearer, verificat inclusiv pentru revocare; verificare rol pe server; răspuns `CatdReadResult` din `lib/catd.ts`.
- `GET /api/catd/sync`: starea copiei și a blocării, exclusiv administrator principal.
- `POST /api/catd/sync`: sincronizare manuală, exclusiv administrator principal. `409` dacă este deja în curs. Nu acceptă URL de sursă sau alte date de la client.
- `401`: sesiune lipsă/invalidă; `403`: drept insuficient; `503`: surse sau sincronizare indisponibile. Răspunsurile sunt `private, no-store`; service worker-ul exclude API-urile CATD din cache.

Pagina încearcă CATD la fiecare montare și la „Reîncearcă”. Serverul citește schema, totalul și identificatorii, descarcă în pagini de 300, verifică setul complet și coordonatele WGS84 și reverifică inventarul. Citirea CATD are un termen total de 25 secunde. Răspunsul gol/parțial, erorile ArcGIS (inclusiv 499) și timeout-ul conduc la copia Firebase. Citirea paginii nu scrie în Firebase.

## Copia Firebase

Colecția nouă `catdHydrantSnapshots` apare la prima sincronizare:

- `_state`: `activeSnapshotId`, `count`, `syncedAt`, `lockId`, `lockUntil`.
- `{snapshotId}`: `fields` (aliasuri și dicționare), `sourceUrl`, `fetchedAt`, `syncedAt`, `count`, `complete`.
- `{snapshotId}/hydrants/{objectid}`: `id`, `position: {lat,lng}`, `attributes` (câmpurile CATD).

Scrierile folosesc batch-uri de maximum 400. După verificarea documentelor salvate, o tranzacție publică simultan `complete` și referința activă. Eșecul păstrează versiunea precedentă; versiunea incompletă nu este citită. Blocarea distribuită expiră după 180 secunde, iar o execuție cu blocarea expirată nu poate publica. Versiunile anterioare/incomplete sunt păstrate; nu se șterg automat.

Toate accesările acestei colecții trec prin Firebase Admin. Configurarea existentă este reutilizată: `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` sau Application Default Credentials; clientul necesită configurația Firebase publică existentă, iar harta `MAPS_SECRET_KEY`.

La publicare, regulile Firestore existente trebuie să refuze accesul direct din SDK-ul client la `catdHydrantSnapshots`, inclusiv subcolecții. Fragmentul relevant este:

```
match /catdHydrantSnapshots/{document=**} {
  allow read, write: if false;
}
```

Un `allow` general din alt `match` poate permite în continuare accesul: excludeți noua colecție și din acele reguli generale. Firebase Admin nu este afectat. Repository-ul nu conține configurația regulilor active; documentarea acestui modul nu le publică și nu le modifică.

## Prima utilizare și verificări

După configurare/publicare, administratorul deschide Dashboard → Setări → CATD → „Sincronizează CATD”. Până atunci pagina funcționează dacă CATD răspunde, dar nu are rezervă Firebase. Nu există cron sau sincronizare automată.

Fișele afișează separat starea și funcționalitatea. Câmpurile lipsă sunt „Nespecificat”; presiunile și datele înregistrate nu reprezintă telemetrie în timp real. Totalul este cel al stratului CATD, fără presupunerea acoperirii complete a județului. Rezerva Firebase necesită conexiune la serverul aplicației; nu este o funcție offline a dispozitivului.

Verificare locală:

```
npx jest --runInBand __tests__/lib/catd-source.test.ts __tests__/lib/catd-server.test.ts __tests__/components/catd-page.test.tsx __tests__/components/catd-sync-control.test.tsx __tests__/lib/map-tool-links.test.ts __tests__/lib/catd-service-worker.test.ts
```

Testele folosesc surse și Firebase simulate și nu creează documente live. Prima sincronizare reală este o operație separată, pornită din dashboard.
