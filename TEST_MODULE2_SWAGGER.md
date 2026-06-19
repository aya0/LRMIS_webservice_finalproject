# Module 2 Swagger Testing Guide

Use the existing backend `.env` and database connection. You do not need to install MongoDB locally.

## 1. Open Swagger

1. Start the backend server.
2. Open `http://127.0.0.1:8000/docs`.
3. Use the endpoints tagged with `Module 2`.

## 2. Create applicant

1. Open `POST /applicants/`.
2. Click `Try it out`.
3. Use the Swagger example request body.
4. Change `national_id` to a unique value if you already tested before.
5. Click `Execute`.
6. Confirm the response is `201`.

Example body:

```json
{
  "full_name": "Alaa Nasser",
  "national_id": "407123456",
  "registration_number": null,
  "contact": {
    "email": "applicant@example.com",
    "phone": "+970599111111"
  },
  "address": {
    "city": "Ramallah",
    "neighborhood": "Al-Masyoun",
    "zone_id": "ZONE-RM-01"
  },
  "applicant_type": "citizen",
  "verification_state": "unverified",
  "preferred_language": "ar",
  "notification_preferences": {
    "email": true,
    "sms": false
  },
  "linked_applications": [],
  "privacy_settings": {
    "share_contact_with_staff": false,
    "allow_status_notifications": true
  }
}
```

## 3. Copy applicant_id

1. In the `201` response, copy the `id` value.
2. Use this value as `applicant_id` in the next steps.

## 4. Get applicant

1. Open `GET /applicants/{applicant_id}`.
2. Click `Try it out`.
3. Paste the copied applicant id.
4. Click `Execute`.
5. Confirm the response is `200`.

## 5. Get applicant applications

1. Open `GET /applicants/{applicant_id}/applications`.
2. Click `Try it out`.
3. Paste the copied applicant id.
4. Click `Execute`.
5. Confirm the response is `200`.
6. If the applicant has no linked applications, the response should be an empty list: `[]`.

## 6. Add document with fake application_id

Use this fake application id:

```text
LRMIS-2026-TEST1
```

1. Open `POST /applications/{application_id}/documents`.
2. Click `Try it out`.
3. Set `application_id` to `LRMIS-2026-TEST1`.
4. Use the copied applicant id in the request body.
5. Click `Execute`.
6. Confirm the response is `201`.

Example body:

```json
{
  "applicant_id": "PASTE_APPLICANT_ID_HERE",
  "document_type": "identity_card",
  "file_name": "id-card.pdf",
  "file_url": "https://files.example.com/id-card.pdf",
  "file_size": 245760,
  "file_extension": "pdf",
  "status": "pending_review"
}
```

## 7. Add comment with fake application_id

1. Open `POST /applications/{application_id}/comments`.
2. Click `Try it out`.
3. Set `application_id` to `LRMIS-2026-TEST1`.
4. Use the copied applicant id in the request body.
5. Click `Execute`.
6. Confirm the response is `201`.

Example body:

```json
{
  "applicant_id": "PASTE_APPLICANT_ID_HERE",
  "comment": "I uploaded the requested ownership document."
}
```

## 8. Submit objection with fake application_id

1. Open `POST /applications/{application_id}/objections`.
2. Click `Try it out`.
3. Set `application_id` to `LRMIS-2026-TEST1`.
4. Use the copied applicant id in the request body.
5. Click `Execute`.
6. Confirm the response is `201`.

Example body:

```json
{
  "applicant_id": "PASTE_APPLICANT_ID_HERE",
  "reason": "The parcel boundary shown does not match my deed.",
  "supporting_documents": [
    "https://files.example.com/deed.pdf"
  ],
  "status": "submitted"
}
```

## 9. View timeline

1. Open `GET /applications/{application_id}/timeline`.
2. Click `Try it out`.
3. Set `application_id` to `LRMIS-2026-TEST1`.
4. Click `Execute`.
5. Confirm the response is `200`.
6. If no logs exist for the application, the response should be an empty list: `[]`.
7. After submitting an objection, the timeline should include an `objection_submitted` event.

## Error checks

- Invalid applicant ObjectId should return `400`.
- Missing required request body fields should return `400`.
- Missing applicant should return `404`.
- Reusing the same `national_id` or `registration_number` should return `409`.
