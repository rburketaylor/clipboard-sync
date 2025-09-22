# Manual QA – Clip Deletion Flow

Use this checklist whenever the clip deletion feature changes.

## Backend API

1. `POST /clip` a sample entry (`{"type": "text", "content": "delete me"}`) and note the `id`.
2. `DELETE /clip/{id}` and confirm a `204` response body with no JSON payload.
3. Repeat the `DELETE` once more and verify a `404` with `{"detail": "Clip with id {id} not found"}`.
4. `GET /clips` and ensure the deleted `id` is absent from the results.

## Electron App

1. Start the backend (`uvicorn app:app --reload`) and launch the Electron app with `BACKEND_URL=http://localhost:8000 npm start`.
2. Create a clip via the desktop UI, confirm it appears in “Recent Clips”.
3. Click `Delete` on the new clip: the list should refresh and the status bar should read “Clip removed”.
4. Attempt to delete the same clip again (using the status history or manual API call) and confirm the status shows an error.
5. Verify the Copy button still works for remaining clips.

## Clipboard Sync

1. Install/refresh the Chrome extension and grant clipboard access when prompted (“Enable Clipboard”).
2. Copy text on any HTTPS page and use the popup “Send Clipboard” button – verify a new text clip appears in the backend/Electron list.
3. Trigger the keyboard shortcut (`Ctrl+Shift+Y` on Windows/Linux, `⌘⇧Y` on macOS) and confirm the clipboard entry syncs without opening the popup.
4. In the Electron app, enable “Auto-send clipboard changes”, copy new text, and check that status updates to “Clipboard synced automatically” with a new entry in “Recent Clips”.
5. Toggle auto-sync off and ensure the clipboard status returns to “Clipboard idle” and no further automatic syncs occur.
6. Attempt to send an empty clipboard (clear the clipboard first) – both extension and Electron UI should surface a user-friendly message instead of syncing.

Document the backend URL used and any deviations (proxy, TLS, etc.) in the PR description.
