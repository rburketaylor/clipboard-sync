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

Document the backend URL used and any deviations (proxy, TLS, etc.) in the PR description.
