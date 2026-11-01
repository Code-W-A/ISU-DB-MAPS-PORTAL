# Firestore: ISU Notes

Caiet de text (fără Storage). Accesul la zona se ia din Dashboard → Utilizatori, câmpul `allowedTabs`. Separat, proprietarul unei note private poate acorda conturilor care au deja acces la ISU Notes drept Read sau Write.

## Acces

| Condiție | Efect |
|----------|--------|
| Email admin principal `radu.p1995@yahoo.com` | Acces complet la colecții |
| `users/{email\|uid}.allowedTabs` conține `"isuNotes"` | Acces la colecții |
| Altfel | Fără citire / scriere |

Tab-ul din UI este ascuns dacă nu e bifat; regulile de mai jos aplică aceeași logică pe server.

## Colecții

Apar la primul document salvat; nu trebuie create manual. Nu se foloseste Firebase Storage.

### `isuNotesFolders/{id}`

| Câmp | Tip |
|------|-----|
| `name` | string |
| `ownerUid` | string (uid Firebase) |
| `ownerEmail` | string |
| `createdAt` | number (ms) |
| `updatedAt` | number (ms) |

Folderele sunt ale autorului. La ștergere, notele din folder trec la `folderId: null`.

### `isuNotes/{id}`

| Câmp | Tip |
|------|-----|
| `title` | string |
| `pages` | array `{ id: string, content: string }` |
| `visibility` | `"private"` \| `"common"` (implicit la creare: `"private"`) |
| `folderId` | string sau `null` |
| `ownerUid` | string |
| `ownerEmail` | string |
| `createdAt` | number (ms) |
| `updatedAt` | number (ms) |

- **private**: doar autorul citește și editează implicit; colaboratorii explicit partajați au dreptul configurat
- **common**: toți cei cu tab-ul ISU Notes citesc; editarea / ștergerea / mutarea / Privat↔Comun rămân la autor
- Notele private pot fi partajate explicit. Read permite citirea; Write permite editarea titlului și paginilor. Ștergerea, mutarea și administrarea accesului rămân la autor.
- Partajarea folosește `sharedWithUids` (toți colaboratorii), `sharedWriteUids` (subsetul cu Write) și `sharedWithEmails` (etichete UI). Documentele vechi fără aceste câmpuri rămân valide.
- Schimbarea notei în „Comun” elimină partajarea explicită; notele comune rămân read-only pentru ceilalți utilizatori.

Clientul încarcă notele cu trei interogări (obligatoriu pentru ca regulile să permită lista):

1. `where("ownerUid", "==", uid)`
2. `where("visibility", "==", "common")`
3. `where("sharedWithUids", "array-contains", uid)`

Apoi unește și deduplică pe client. Sortarea se face pe client (dată / nume).

## Indexuri

Egalitate simplă (`ownerUid`, `visibility`) nu cere index compus. Dacă adăugați `orderBy("updatedAt")` pe aceleași query-uri, creați în consolă:

- `isuNotes`: `ownerUid` ASC, `updatedAt` DESC
- `isuNotes`: `visibility` ASC, `updatedAt` DESC
- `isuNotesFolders`: `ownerUid` ASC, `name` ASC (doar dacă sortați pe server)

## Reguli Firestore

Integrați `match /isuNotes` și `match /isuNotesFolders` în fișierul existent de rules. **Nu** înlocuiți restul regulilor.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function userRoleData() {
      let emailId = /databases/$(database)/documents/users/$(request.auth.token.email);
      let uidId = /databases/$(database)/documents/users/$(request.auth.uid);
      return exists(emailId)
        ? get(emailId).data
        : (exists(uidId) ? get(uidId).data : null);
    }

    function isMainAdmin() {
      return request.auth != null && request.auth.token.email == 'radu.p1995@yahoo.com';
    }

    function hasIsuNotesAccess() {
      let role = userRoleData();
      return request.auth != null && (
        isMainAdmin() ||
        (role != null && role.allowedTabs is list && 'isuNotes' in role.allowedTabs)
      );
    }

    match /isuNotesFolders/{folderId} {
      allow read: if hasIsuNotesAccess() && resource.data.ownerUid == request.auth.uid;
      allow create: if hasIsuNotesAccess()
        && request.resource.data.ownerUid == request.auth.uid
        && request.resource.data.name is string
        && request.resource.data.name.size() > 0;
      allow update, delete: if hasIsuNotesAccess()
        && resource.data.ownerUid == request.auth.uid;
    }

    match /isuNotes/{noteId} {
      allow read: if hasIsuNotesAccess() && (
        resource.data.ownerUid == request.auth.uid ||
        resource.data.visibility == 'common' ||
        ('sharedWithUids' in resource.data && request.auth.uid in resource.data.sharedWithUids)
      );
      allow create: if hasIsuNotesAccess()
        && request.resource.data.ownerUid == request.auth.uid
        && request.resource.data.visibility == 'private'
        && (!('sharedWithUids' in request.resource.data) || request.resource.data.sharedWithUids.size() == 0)
        && (!('sharedWriteUids' in request.resource.data) || request.resource.data.sharedWriteUids.size() == 0);
      allow update: if hasIsuNotesAccess()
        && request.resource.data.ownerUid == resource.data.ownerUid
        && (
          resource.data.ownerUid == request.auth.uid ||
          (
            resource.data.visibility == 'private' &&
            'sharedWriteUids' in resource.data &&
            'sharedWithUids' in resource.data &&
            request.auth.uid in resource.data.sharedWithUids &&
            request.auth.uid in resource.data.sharedWriteUids &&
            request.resource.data.diff(resource.data).affectedKeys().hasOnly(['title', 'pages', 'updatedAt'])
          )
        );
      allow delete: if hasIsuNotesAccess() && resource.data.ownerUid == request.auth.uid;
    }
  }
}
```

**Aplicare obligatorie înainte de producție:** acest checkout nu conține fișierul de reguli Firestore și nici `firebase.json`; blocul de mai sus este fragmentul de integrare, nu a fost publicat. Integrați-l în regulile active fără a înlocui restul acestora și apoi testați pe emulator/mediu dedicat. Bifați **ISU Notes** destinatarilor din Dashboard → Utilizatori. O notă nouă se naște **Privată**.
