# Firestore: ISU Notes

Caiet de text (fără Storage). Accesul la colecții se ia **doar** din Dashboard → Utilizatori, câmpul `allowedTabs`, exact ca la Hidranți. În ISU Notes nu există drepturi pe conturi.

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

- **private**: doar autorul citește și editează
- **common**: toți cei cu tab-ul ISU Notes citesc; editarea / ștergerea / mutarea / Privat↔Comun rămân la autor

Clientul încarcă notele cu două interogări (obligatoriu pentru ca regulile să permită lista):

1. `where("ownerUid", "==", uid)`
2. `where("visibility", "==", "common")`

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
        resource.data.visibility == 'common'
      );
      allow create: if hasIsuNotesAccess()
        && request.resource.data.ownerUid == request.auth.uid
        && request.resource.data.visibility == 'private';
      allow update, delete: if hasIsuNotesAccess()
        && resource.data.ownerUid == request.auth.uid
        && request.resource.data.ownerUid == resource.data.ownerUid;
    }
  }
}
```

După publicarea regulilor, bifați **ISU Notes** pe un cont din Dashboard → Utilizatori și creați o notă de test (se naște **Privată**).
