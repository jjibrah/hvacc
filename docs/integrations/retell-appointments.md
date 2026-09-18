# Retell → HVA appointment integration

This integration keeps Retell responsible for conversation and HVA responsible for tenant resolution, patient matching, availability, capacity, booking, idempotency, and audit history.

## Runtime flow

```text
Retell call
  → /api/webhooks/retell
  → calls + provider events + caller participant
  → Retell custom function
  → HVA voice tool
  → scheduling service
  → appointment + callAppointments link
```

The browser-authenticated appointment routes remain available for staff. Retell uses the machine-to-machine voice-tool routes below.

## Environment

```dotenv
RETELL_API_KEY=                       # Retell API key; used to verify X-Retell-Signature
RETELL_WEBHOOK_SECRET=                # local/manual webhook simulation only
RETELL_VOICE_TOOL_SECRET=             # local/manual tool simulation only
```

Production Retell requests must use `X-Retell-Signature`. The application verifies the exact raw request body with the official Retell SDK. Static secrets are accepted only outside production for local simulations.

## Webhook configuration

Public URL:

```text
POST https://YOUR_PUBLIC_HOST/api/webhooks/retell
```

Subscribe to:

```text
call_started
call_ended
call_analyzed
```

Retell supplies `X-Retell-Signature`. HVA verifies it with `RETELL_API_KEY`. The call's `agent_id` is mapped through `retell_agents.provider_agent_id` to the hospital. The optional `x-hospital-id` header is not trusted as the primary tenant boundary.

## Availability custom function

Create this Retell custom function:

```text
Name: get_hva_appointment_availability
Method: POST
URL: https://YOUR_PUBLIC_HOST/api/voice-tools/appointments/availability
Payload: args only: OFF
Timeout: 120000 ms or lower
```

Retell's standard wrapped body is required because HVA reads the trusted call identity from `call.call_id`:

```json
{
  "name": "get_hva_appointment_availability",
  "call": {
    "call_id": "{{retell_call_id}}",
    "agent_id": "{{retell_agent_id}}"
  },
  "args": {
    "from": "2026-09-24T00:00:00.000Z",
    "to": "2026-09-27T00:00:00.000Z",
    "department": "Cardiology"
  }
}
```

The agent may provide:

```text
from       optional ISO timestamp
to         optional ISO timestamp
department optional department name or code
doctor     optional doctor display name
```

The agent must not provide or invent `hospitalId`, `patientId`, or internal session IDs for this function. HVA derives the hospital from the Retell agent/call and limits the response to five bookable sessions. If `from` and `to` are omitted, HVA searches the next fourteen days.

Response shape:

```json
{
  "success": true,
  "message": "Available appointment slots returned.",
  "timeZone": "Asia/Kuala_Lumpur",
  "slots": [
    {
      "sessionId": "SESSION_UUID",
      "startsAt": "2026-09-24T06:30:00.000Z",
      "displayDate": "Thursday, September 24, 2026",
      "displayTime": "2:30 PM",
      "doctorName": "Dr. Michael Chen",
      "departmentName": "Cardiology",
      "availableUnits": 1
    }
  ]
}
```

## Booking custom function

Create this Retell custom function:

```text
Name: book_hva_appointment
Method: POST
URL: https://YOUR_PUBLIC_HOST/api/voice-tools/appointments/book
Payload: args only: OFF
Timeout: 120000 ms or lower
```

Arguments:

```json
{
  "sessionId": "SESSION_UUID_RETURNED_BY_AVAILABILITY",
  "confirmed": true,
  "idempotencyKey": "optional-stable-key"
}
```

`sessionId` must come from the availability response. `confirmed` must be true only after the caller explicitly confirms the exact date and time. HVA derives patient, caller, hospital, source, and originating call. A missing idempotency key is replaced with a stable key derived from the Retell call and selected session.

Successful response:

```json
{
  "success": true,
  "message": "Appointment booked successfully.",
  "appointment": {
    "id": "APPOINTMENT_UUID",
    "reference": "APT-ABC12345",
    "startsAt": "2026-09-24T06:30:00.000Z",
    "displayDate": "Thursday, September 24, 2026",
    "displayTime": "2:30 PM",
    "doctorName": "Dr. Michael Chen",
    "departmentName": "Cardiology"
  }
}
```

Important failure codes:

```text
UNAUTHORIZED
CALL_NOT_FOUND
PATIENT_IDENTITY_REQUIRED
SESSION_REQUIRED
CONFIRMATION_REQUIRED
SESSION_NO_LONGER_AVAILABLE
BOOKING_FAILED
```

The agent must never say an appointment was booked unless `success` is true.

## Agent prompt section

```text
APPOINTMENT BOOKING RULES

When the caller asks for an appointment:

1. Identify the requested department/service and preferred date or date range.
2. Call get_hva_appointment_availability. Never invent availability.
3. Offer only the slots returned by HVA, preferably no more than three options.
4. When the caller chooses a slot, repeat the exact local date, time, department, and doctor.
5. Ask for explicit confirmation before booking.
6. Call book_hva_appointment only after the caller clearly confirms the exact slot.
7. Use the sessionId returned by HVA. Never invent a sessionId, patientId, hospitalId, doctor, or appointment reference.
8. If booking succeeds, read the returned appointment reference and local date/time to the caller.
9. If the result is SESSION_NO_LONGER_AVAILABLE, apologize and call availability again.
10. If the result is PATIENT_IDENTITY_REQUIRED, do not guess the patient. Explain that staff assistance is required.
11. If the result is CONFIRMATION_REQUIRED, ask for explicit confirmation.
12. For any other failure, do not claim success and offer human assistance when appropriate.
13. HVA is authoritative for patient identity, availability, capacity, and booking.
```

## Retell dashboard handoff

1. Add the webhook URL and select the three webhook events above.
2. Add both custom functions to the agent.
3. Keep `Payload: args only` disabled for both functions.
4. Configure Retell's normal signature handling so it sends `X-Retell-Signature`.
5. Attach both functions to the published agent version.
6. Confirm that the agent ID exists in HVA's `retell_agents.provider_agent_id` for the intended hospital.
7. Test first through a public HTTPS tunnel; Retell cannot call localhost directly.

## Local simulation

For development only, set `RETELL_VOICE_TOOL_SECRET` and send `x-hva-voice-tool-secret`. Send a signed-equivalent wrapped body after creating a call through the webhook. This bypass is unavailable in production.

## Operational verification

After a real call:

1. `calls.status` should move to `in_progress` after `call_started`.
2. The Calls page should show the caller and call.
3. Availability should return only open sessions with capacity.
4. Booking should create an appointment with `source = voice`.
5. The session's booked capacity should increase once.
6. `call_appointments` should link the appointment to the call.
7. The Calls detail should show the linked appointment.
8. The Appointments page should show the appointment.
9. Repeating the same booking idempotency key must return the same result without a duplicate appointment.
