# Frontend Module 2 Testing Guide

This guide tests the Student 2 Applicant Portal UI against the existing Module 2 backend endpoints.

## 1. Start the backend

1. Open a terminal in `backend`.
2. Use the existing `.env` file.
3. Start the FastAPI server.
4. Confirm Swagger is available at `http://127.0.0.1:8000/docs`.

## 2. Start the frontend

1. Open a terminal in `frontend`.
2. Run `npm install` if dependencies are not installed.
3. Run `npm run dev`.
4. Open the Vite URL shown in the terminal.

## 3. Open Applicant Portal

Open:

```text
/applicant
```

The dashboard should show:

- Create Profile
- Track Applications
- Upload Document
- Submit Comment
- Submit Objection
- View Timeline

The redesigned dashboard also includes a normal applicant flow panel explaining profile creation, tracking, documents, responses/objections, and timeline review.

## 4. Create applicant

1. Open `/applicant/create-profile`.
2. Fill the applicant profile form.
3. Use a unique `national_id`.
4. Click `Create profile`.
5. Confirm a success message appears.
6. Copy the returned applicant id.

If the same `national_id` or `registration_number` is reused, the page should show a clean duplicate error.

The success card should keep the Applicant ID visible in a copyable badge.

## 5. Test applications

1. Open `/applicant/applications`.
2. Paste the copied applicant id.
3. Click `Fetch applications`.
4. If no applications are linked, the page should show an empty state.
5. If applications exist, they should appear as cards.

Application results should show readable application cards with status badges, not raw JSON.

## 6. Test document upload

Use this fake application id:

```text
LRMIS-2026-TEST1
```

1. Open `/applicant/upload-document`.
2. Set `application_id` to `LRMIS-2026-TEST1`.
3. Paste the copied applicant id.
4. Fill document metadata.
5. Click `Save document`.
6. Confirm a success message appears.

## 7. Test comment

1. Open `/applicant/comment`.
2. Set `application_id` to `LRMIS-2026-TEST1`.
3. Paste the copied applicant id.
4. Add a comment.
5. Click `Submit comment`.
6. Confirm a success message appears.

## 8. Test objection

1. Open `/applicant/objection`.
2. Set `application_id` to `LRMIS-2026-TEST1`.
3. Paste the copied applicant id.
4. Add an objection reason.
5. Optionally enter supporting document URLs separated by commas.
6. Click `Submit objection`.
7. Confirm a success message appears.

## 9. Test timeline

1. Open `/applicant/timeline`.
2. Set `application_id` to `LRMIS-2026-TEST1`.
3. Click `View timeline`.
4. If no logs exist, the page should show `No timeline events yet.`
5. After submitting an objection, the timeline should show an `objection_submitted` event.

Timeline results should display readable event cards with event type, date/time, actor details, and related IDs. Raw technical details are hidden behind an expandable section.
