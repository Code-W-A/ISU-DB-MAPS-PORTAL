# Firestore: zone de competență (prevenție)

## Sursa drepturilor (dashboard)

**Ce poate face fiecare la poligoane nu se „scrie în rules” separat de aplicație.**  
În Firebase, regulile sunt obligatorii pe server (altfel oricine ar putea citi/scrie din consolă sau din alt client). Ele trebuie să **citească aceleași câmpuri** pe care le editați din **Dashboard → Utilizatori** în documentele din colecția `users`:

| Câmp în `users/{id}` | Efect |
|----------------------|--------|
| `preventionZonesAccess` lipsește sau `"none"` | Fără acces la `preventionZones` (ca în UI). |
| `"read"` | Poate citi documentele din `preventionZones` (hartă + căutare). |
| `"write"` | Poate crea, actualiza și șterge orice document în `preventionZones` (inclusiv atribuire la orice inspector din listă). |

Aplicația web ascunde butoanele după același câmp; **regulile de mai jos aplică aceeași logică pe server**, ca să nu conteze doar interfața.

## Colecție `preventionZones`

| Câmp | Tip |
|------|-----|
| `name` | string (opțional) |
| `path` | array de `{ lat: number, lng: number }` (minim 3 puncte) |
| `assignedInspectorUid` | string (ID din `users`, de obicei același cu `uid` din rol) |
| `assignedInspectorEmail` | string |
| `createdAt` | number (ms) |
| `updatedAt` | number |
| `createdByUid` | string (uid Firebase al celui care a creat) |

Colecția apare singură la primul document salvat; nu trebuie creată manual.

## Reguli Firestore (doar din câmpurile `users`)

Adaptați **doar** modul în care găsiți documentul utilizatorului autentificat (ID = email vs `request.auth.uid`). Integrați `match /preventionZones` în fișierul vostru existent; **nu** înlocuiți regulile pentru `users` cu fragmentul comentat de mai jos fără să păstrați politica voastră.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Documentul de rol al utilizatorului curent (aceleași date ca în dashboard).
    // Dacă la voi ID-ul este mereu emailul: folosiți doar varianta cu email.
    function userRoleData() {
      let emailId = /databases/$(database)/documents/users/$(request.auth.token.email);
      let uidId = /databases/$(database)/documents/users/$(request.auth.uid);
      return exists(emailId)
        ? get(emailId).data
        : (exists(uidId) ? get(uidId).data : null);
    }

    function preventionZonesAccessFromDashboard() {
      return userRoleData() != null
        ? userRoleData().preventionZonesAccess
        : null;
    }

    function canReadPreventionZones() {
      let a = preventionZonesAccessFromDashboard();
      return a == 'read' || a == 'write';
    }

    function canWritePreventionZones() {
      return preventionZonesAccessFromDashboard() == 'write';
    }

    match /preventionZones/{zoneId} {
      allow read: if request.auth != null && canReadPreventionZones();
      allow create, update, delete: if request.auth != null && canWritePreventionZones();
    }

    // match /users/{userId} { ... } — păstrați regulile voastre existente pentru utilizatori
  }
}
```

**Fără** liste hardcodate de emailuri în `preventionZones`: cine are `write` în `users` poate gestiona poligoanele, exact cum setați din dashboard.

## Dacă vreți restricții suplimentare

Exemple (necesită câmpuri noi în `users` + UI în dashboard + actualizarea regulilor):

- doar **propriile** zone (inspectorul poate edita doar unde `assignedInspectorEmail == auth.email`);
- rol **coordonator** (`preventionZonesAssignAll: true`) vs inspector doar pe zona sa.

Spuneți-le explicit în `users` și folosiți-le în `userRoleData()` la fel ca `preventionZonesAccess`.
