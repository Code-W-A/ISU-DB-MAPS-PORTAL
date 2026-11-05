# ISU Notes Web Push

ISU Notes push notifications use the browser Push API and the existing `/sw.js` service worker. The server stores subscriptions with Firebase Admin, sends generic messages through Web Push, and never includes note titles or note contents in notification payloads.

## Server configuration

Generate a VAPID key pair:

```sh
npx web-push generate-vapid-keys
```

Set these server environment variables in the deployment and local development environment:

- `WEB_PUSH_PUBLIC_KEY`
- `WEB_PUSH_PRIVATE_KEY` (secret)
- `WEB_PUSH_SUBJECT` (a contact URI such as `mailto:admin@example.com`)

Redeploy after setting the variables. The public key is returned to authenticated clients by `/api/isu-notes/push/subscription`.

## Firestore access

The browser never reads or writes the push collections directly. The API uses Firebase Admin for:

- `isuNotePushSubscriptions/{uid}/devices/{endpointHash}`
- `isuNotePushRateLimits/{noteRecipientEventHash}`

Add explicit client-side deny rules for these paths to the active Firestore rules. Do not replace the existing rules. Firebase Admin requests bypass Firestore client rules.

For rules version 2, merge rules equivalent to these within the existing `match /databases/{database}/documents` block:

```text
match /isuNotePushSubscriptions/{uid}/{path=**} {
  allow read, write: if false;
}

match /isuNotePushRateLimits/{eventId} {
  allow read, write: if false;
}
```

Check the active rules for broader overlapping `allow` statements: Firestore combines matching allows, so a broad allow must also be narrowed for these paths.

## User setup

Each recipient must open ISU Notes on each device and select **Activează notificările**, then allow notifications in the browser or operating system. The browser must support Push API and Notifications; secure HTTPS is required. Revoking notifications in the UI removes that device's server subscription too.

Newly added collaborators receive a share notification. Existing collaborators receive a notification after edits settle for 20 seconds, with a server-side per-note/per-recipient cooldown. The notification opens the note and contains no note content.
