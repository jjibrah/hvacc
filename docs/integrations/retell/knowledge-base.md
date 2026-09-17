# Prince Court Test Hospital — Synthetic Knowledge Base

> **Environment:** Private, non-production learning project  
> **Content type:** Entirely synthetic demonstration data  
> **Hospital identifier:** `prince-court-test`  
> **Timezone:** `Asia/Kuala_Lumpur`  
> **Currency:** Malaysian Ringgit (`MYR`)

## Important synthetic-environment notice

Prince Court Test Hospital is a fictional demonstration organization created for a private software-learning project. It is not Prince Court Medical Centre or any other real hospital. Its name, departments, doctors, schedules, services, contact details, policies, callers, patients, and appointment records are synthetic.

This knowledge base must not be used for real healthcare, real patients, clinical decision-making, diagnosis, treatment, medication guidance, emergency triage, or contact with a real hospital.

The voice assistant must identify the service as a demonstration when asked whether the hospital or service is real.

## Assistant purpose and limits

The voice assistant supports only these demonstration activities:

- Explain the synthetic hospital's non-clinical services and operating hours.
- Identify an appropriate synthetic department from a caller's stated administrative request.
- Look up current appointment availability through the approved backend tool.
- Create an appointment only after the caller explicitly confirms the patient, department or doctor, date, time, and session returned by the backend.
- Help with permitted cancellation or rescheduling through the approved backend tool.
- Create follow-up work when a request cannot be completed.
- Explain what information is needed for a synthetic appointment.

The voice assistant must not:

- Diagnose symptoms or conditions.
- Recommend treatments, procedures, medicines, doses, or changes to medication.
- Interpret test results.
- Estimate a person's clinical risk or urgency.
- Claim that a particular doctor or department is clinically appropriate for a real person.
- Claim that an appointment exists until the backend confirms that it was saved successfully.
- Invent schedules, availability, prices, policies, doctors, departments, or contact details.
- Claim that a human handoff or callback was accepted unless the backend contains evidence of acceptance.
- Collect real patient information in this learning environment.

These behavioral limits must also be placed in the Retell agent prompt. A knowledge base supplies reference information but is not a substitute for agent instructions.

## Emergency and medical-safety response

This demonstration service does not provide emergency help or medical advice.

If a caller describes a possible emergency, asks for urgent clinical advice, or appears to be in immediate danger, the assistant must not assess the symptoms. It should say:

> This is a fictional demonstration service and cannot provide medical or emergency assistance. If this were a real emergency, contact the local emergency services or an appropriate real healthcare provider immediately.

The assistant must not provide a specific emergency telephone number because callers may be in different countries and this is not a real hospital service.

After delivering the safety statement, the assistant should end the clinical discussion. It must not create a normal synthetic appointment as a substitute for emergency assistance.

## Hospital identity

| Field | Synthetic value |
| --- | --- |
| Display name | Prince Court Test Hospital |
| Stable identifier | `prince-court-test` |
| Environment | Development and demonstration only |
| Timezone | Malaysia Time, `Asia/Kuala_Lumpur` |
| Default currency | Malaysian Ringgit, `MYR` |
| Operations contact | Test Hospital Operations Desk |
| Email | `operations@prince-court-test.example` |
| Display-only telephone | `+1 202-555-0100` |
| Address | `1 Synthetic Health Avenue, 50000 Kuala Lumpur, Malaysia` |

The telephone number is from a reserved fictional range and must not be dialled. The `.example` email domain does not receive email. The address is fictional and must not be used for navigation.

## Languages

The first demonstration agent operates in English.

The assistant may acknowledge that multilingual support could be added later, but it must not claim that another language is currently supported unless a published Retell agent version has been configured and verified for that language.

## Hospital operating hours

The following hours are synthetic administrative hours in `Asia/Kuala_Lumpur`:

| Day | Administrative hours |
| --- | --- |
| Monday | 08:00–17:00 |
| Tuesday | 08:00–17:00 |
| Wednesday | 08:00–17:00 |
| Thursday | 08:00–17:00 |
| Friday | 08:00–17:00 |
| Saturday | 09:00–13:00 |
| Sunday | Closed |

Public-holiday handling is not implemented in the first demonstration. When asked about a specific holiday, the assistant must say that the demonstration does not contain verified holiday hours.

Administrative hours are not appointment availability. Appointment availability must always come from the backend availability tool.

## Appointment desk hours

The synthetic appointment desk follows the administrative hours listed above. Automated demonstration calls may be tested outside these hours, but that does not mean the fictional appointment desk is open.

The assistant may submit a follow-up outside administrative hours. A follow-up is not an accepted live transfer and does not guarantee an immediate response.

## Departments overview

The first-release synthetic dataset contains three departments:

1. Cardiology
2. Dermatology
3. General Medicine

No other department is available for confirmed booking in the initial demonstration dataset.

When a caller requests an unavailable department or service, the assistant must not invent a matching department. It should explain that the requested service is not available in the demonstration, offer the listed departments if appropriate for the caller's administrative request, or create a follow-up when the caller asks for human contact.

## Cardiology department

Cardiology is represented only as a synthetic appointment category. The demonstration does not provide clinical cardiology advice.

Synthetic administrative scope:

- New appointment enquiries
- Existing appointment enquiries
- Demonstration availability lookup
- Demonstration booking, cancellation, and rescheduling

The assistant must not use symptoms to diagnose a heart condition or determine clinical urgency.

### Cardiology doctor

| Field | Synthetic value |
| --- | --- |
| Doctor | Dr Amir Rahman |
| Doctor identifier | `doc-001` |
| Department | Cardiology |
| Demonstration session | `session-001` |
| Session date | 21 September 2026 |
| Local time | 09:00–12:00, `Asia/Kuala_Lumpur` |
| Demonstration capacity | 2 appointment units |

The session details above describe the seed scenario. The assistant must still call the backend availability tool because remaining capacity may have changed.

## Dermatology department

Dermatology is represented only as a synthetic appointment category. The demonstration does not provide clinical dermatology advice.

Synthetic administrative scope:

- New appointment enquiries
- Existing appointment enquiries
- Demonstration availability lookup
- Demonstration booking, cancellation, and rescheduling

The assistant must not identify a skin condition from a caller's description or recommend products, medicines, or treatments.

### Dermatology doctor

| Field | Synthetic value |
| --- | --- |
| Doctor | Dr Li Wen |
| Doctor identifier | `doc-002` |
| Department | Dermatology |
| Demonstration session | `session-002` |
| Session date | 21 September 2026 |
| Local time | 14:00–16:00, `Asia/Kuala_Lumpur` |
| Demonstration capacity | 1 appointment unit |

The session is intentionally suitable for a last-slot concurrency test. The assistant must never promise the final place before the backend confirms the booking transaction.

## General Medicine department

General Medicine is represented only as a synthetic appointment category. It must not be described as an emergency or clinical-triage service.

Synthetic administrative scope:

- General appointment enquiries
- Existing appointment enquiries
- Demonstration availability lookup
- Demonstration booking, cancellation, and rescheduling

The assistant must not use General Medicine as a default clinical recommendation when it cannot understand a caller's symptoms. It may offer General Medicine only as an available synthetic administrative category when the caller asks for that department or accepts it as a non-clinical booking category.

### General Medicine doctor

| Field | Synthetic value |
| --- | --- |
| Doctor | Dr Kavitha Nair |
| Doctor identifier | `doc-003` |
| Department | General Medicine |

### General Medicine sessions

| Session | Date | Local time | Capacity | Demonstration state |
| --- | --- | --- | ---: | --- |
| `session-003` | 22 September 2026 | 10:00–12:00 | 3 | Initially open |
| `session-004` | 23 September 2026 | 10:00–12:00 | 1 | Closed-session scenario |

The assistant must not offer `session-004` as available while the backend reports it as closed.

## Doctor directory

| Doctor | Identifier | Department | First-release status |
| --- | --- | --- | --- |
| Dr Amir Rahman | `doc-001` | Cardiology | Synthetic active doctor |
| Dr Li Wen | `doc-002` | Dermatology | Synthetic active doctor |
| Dr Kavitha Nair | `doc-003` | General Medicine | Synthetic active doctor |

These names are fictional. The assistant must not claim that these people are licensed clinicians, real employees, or available outside the synthetic sessions confirmed by the backend.

## Availability rules

Knowledge-base schedules provide context only. They are not the live source of truth.

For every availability request, the assistant must use the backend availability tool. The tool result determines whether a session is open, closed, full, or unavailable.

The assistant should collect only the minimum synthetic information needed for lookup:

- Requested department or synthetic doctor
- Preferred date or date range
- Preferred time range, if any
- Whether the appointment is for the caller or another synthetic patient

The assistant must not say that a slot is held, reserved, or confirmed merely because it appeared in an availability result.

## Caller and patient distinction

The caller is the person speaking with the voice assistant. The patient is the person for whom the appointment is created.

A caller may book for themselves or for a different synthetic patient. The assistant must ask which situation applies.

When a caller books for another person, the booking request must preserve separate caller and patient identities. People must not be merged merely because they share a telephone number, address, surname, or caller.

The assistant must not reuse one patient's idempotency or booking identity for another family member.

## Information required before booking

Before requesting a booking, collect and read back:

- Synthetic caller identity
- Synthetic patient identity
- Whether the caller is booking for themselves or someone else
- Department
- Doctor, if selected
- Backend-provided session date
- Backend-provided session time
- Any synthetic contact detail required by the demonstration

Do not collect real dates of birth, identity numbers, insurance information, payment information, home addresses, medical histories, or clinical details.

## Explicit confirmation requirement

An appointment may be created only after explicit confirmation.

The assistant should summarize the proposed appointment in a form such as:

> Please confirm that you want me to book the synthetic appointment for [patient name] with [doctor or department] on [date] at [time].

Acceptable confirmation must clearly indicate agreement, such as “yes,” “confirm,” or an equivalent unambiguous response tied to the summarized appointment.

Silence, an unrelated answer, a request for more information, or a general statement such as “that sounds interesting” is not confirmation.

If any material detail changes after confirmation, the assistant must summarize the updated appointment and request confirmation again.

## Booking authority

The backend appointment record is the only authority for whether an appointment exists.

After explicit confirmation, the assistant sends the booking request to the approved backend tool. The assistant must wait for the tool response.

If the backend confirms a successful save, the assistant may state that the synthetic appointment is confirmed and provide the returned booking reference.

If the backend times out, returns an error, rejects capacity, or provides an unknown result, the assistant must not claim success. It should explain that the booking could not be verified and offer a follow-up where appropriate.

## Duplicate protection

Repeating the same intended booking request must not create a second appointment. The backend uses an idempotency key to return the existing result for a retry.

A booking for a different patient, including a different family member, is a distinct booking intent and must not be suppressed as a duplicate.

The assistant must not create a new request merely because a tool response was slow. It should follow the tool's retry and idempotency rules.

## Capacity rules

Each confirmed booking normally consumes one capacity unit.

Capacity cannot go below zero and the assistant must not calculate or modify remaining capacity itself. Only the backend can allocate the final place.

If two callers request the final place, the assistant may confirm only the request that the backend successfully commits. The other caller must receive an honest full-session response and may request alternatives or follow-up.

Waitlisting and overbooking are not supported in the first release.

## Appointment states

The synthetic appointment states are:

- `CONFIRMED`
- `COMPLETED`
- `CANCELLED`
- `NO_SHOW`

A call ending does not complete an appointment. An AI success label does not confirm an appointment. Only the appointment record establishes its state.

## Cancellation policy

Cancellation applies only to a confirmed synthetic appointment that the backend can identify.

Before cancellation, the assistant should confirm:

- Synthetic patient or caller identity
- Booking reference or sufficient synthetic lookup information
- Appointment being cancelled
- Cancellation reason
- Explicit intent to cancel

The backend performs the cancellation and releases capacity exactly once. A repeated cancellation request must return the existing result without releasing capacity again.

The appointment record is retained with state `CANCELLED`; it is not deleted.

Completed and no-show appointments cannot be cancelled through the normal workflow.

## Rescheduling policy

Rescheduling means moving a confirmed synthetic appointment to a backend-provided replacement session.

The assistant must:

1. Identify the existing appointment.
2. Look up replacement availability through the backend.
3. Present a specific replacement doctor or department, date, and time.
4. Receive explicit confirmation of the replacement.
5. Call the approved rescheduling tool.
6. Report success only when the backend confirms the transaction.

The backend reserves the destination before releasing the original appointment. If the destination cannot be reserved, the original appointment remains unchanged.

## Closed or unavailable sessions

When a session is closed, full, expired, or otherwise unavailable, the assistant must state that the requested session cannot currently be booked.

The assistant may:

- Ask whether the caller wants another available session.
- Ask whether the caller wants a different synthetic doctor or department.
- Create follow-up work when the caller requests human contact or no alternative can be completed.

The assistant must not promise that a closed session will reopen or that staff will override capacity.

## Follow-up reasons

A follow-up may be created for:

- Failed confirmed booking
- Unresolved appointment enquiry
- Requested service not available in the synthetic dataset
- Caller requests human contact
- Technical failure or provider outage
- Booking result cannot be verified
- Appointment clarification requiring staff review
- Approved service-quality review

A follow-up is operational work. It is not an appointment, clinical consultation, live transfer, or guarantee of contact.

## Follow-up priority guidance

The synthetic priority levels are:

| Priority | Demonstration meaning | Target update time |
| --- | --- | --- |
| P1 Critical | Safety wording failure, data exposure, or service-wide booking failure | 1 elapsed hour |
| P2 High | Failed confirmed booking, requested urgent human help, or last-slot conflict | 4 elapsed hours |
| P3 Normal | Routine callback, unclear request, or appointment clarification | 24 elapsed hours |
| P4 Low | Quality improvement or non-urgent synthetic content gap | 72 elapsed hours |

These are demonstration targets, not real hospital service levels.

## Follow-up states

The follow-up states are:

- `OPEN`
- `ASSIGNED`
- `IN_PROGRESS`
- `RESOLVED`
- `CANCELLED`

`OVERDUE` is calculated when the due time has passed and the item remains unresolved. It is not an independently editable state.

The assistant must not say a follow-up is assigned unless a valid owner or queue exists in the backend.

## Human handoff wording

The handoff evidence states are:

- `ESCALATION_REQUESTED`
- `HANDOFF_ATTEMPTED`
- `HANDOFF_ACCEPTED`

An escalation request does not prove that a human accepted the interaction. The assistant may say that it requested follow-up or attempted a handoff only when the corresponding backend evidence exists.

The assistant may say that a human accepted the handoff only when the backend reports `HANDOFF_ACCEPTED`.

## Recordings and transcripts

The development environment may create synthetic transcripts and recordings for testing.

A transcript may be incomplete, delayed, or unavailable. A recording may be pending, missing, expired, or unavailable. These states must be described honestly.

A missing recording does not mean the call failed. A completed call does not prove that analysis has finished.

The assistant must not promise that a recording or transcript will always exist.

## Privacy and test-data rules

Only approved synthetic identities may be used.

Do not request or store:

- Real patient names
- Real telephone numbers
- Real email addresses
- Government identity numbers
- Insurance or payment information
- Medical records
- Diagnoses, symptoms, test results, prescriptions, or treatment histories
- Credentials, API keys, passwords, or webhook secrets

If a tester begins providing real personal or medical information, the assistant should interrupt politely and ask them to use fictional test data instead.

## Synthetic caller examples

The following identities are approved only for demonstration scripts:

| Caller | Display-only telephone | Scenario |
| --- | --- | --- |
| Adam Test | `+1 202-555-0101` | Successful self-booking |
| Farah Test | `+1 202-555-0102` | Booking for two different family members |
| Boon Test | Not required | Competing request for the final Dermatology place |
| Chitra Test | Not required | Competing request for the final Dermatology place |
| Devi Test | `+1 202-555-0104` | Rescheduling |
| Evan Test | `+1 202-555-0105` | Cancellation |
| Grace Test | `+1 202-555-0106` | Unavailable service and requested human contact |
| Haris Test | `+1 202-555-0107` | Analysis remains pending |
| Indra Test | `+1 202-555-0108` | Recording unavailable or expired |
| Jia Test | `+1 202-555-0110` | Closed-session request |

The numbers are reserved fictional examples and must not be dialled.

## Frequently asked questions

### Is Prince Court Test Hospital real?

No. Prince Court Test Hospital is a fictional organization used in a private software-learning project. It is not associated with a real hospital.

### Can I use this service for a real appointment?

No. Every appointment, doctor, caller, patient, session, and booking in this environment is synthetic.

### Can the assistant provide medical advice?

No. The assistant provides only synthetic administrative information and demonstration appointment workflows.

### Can the assistant diagnose my symptoms?

No. The assistant cannot diagnose symptoms, determine clinical urgency, or recommend treatment.

### What should I do in an emergency?

This demonstration cannot provide emergency assistance. Contact the appropriate local emergency service or a real healthcare provider.

### Which departments are available?

The synthetic dataset contains Cardiology, Dermatology, and General Medicine.

### Which doctors are available?

The synthetic doctors are Dr Amir Rahman in Cardiology, Dr Li Wen in Dermatology, and Dr Kavitha Nair in General Medicine. Actual demonstration availability must be checked through the backend.

### What are the opening hours?

Synthetic administrative hours are Monday through Friday from 08:00 to 17:00, Saturday from 09:00 to 13:00, and Sunday closed, using Malaysia Time. Holiday hours are not defined.

### Does an available session mean I have an appointment?

No. Availability is not a reservation. An appointment exists only after explicit confirmation and successful backend creation.

### Can I book for another person?

Yes, using synthetic data. The caller and patient must be stored as separate people.

### Can I book for two family members?

Yes, if the backend confirms capacity. Each synthetic patient requires a distinct appointment.

### Can I choose a particular doctor?

Yes, when that synthetic doctor has backend-confirmed availability. The assistant must not invent a session.

### Can I cancel an appointment?

An eligible synthetic confirmed appointment may be cancelled through the backend after the appointment and intent are confirmed. Capacity is released exactly once.

### Can I reschedule an appointment?

Yes, when a replacement session is available and explicitly confirmed. The original booking remains unchanged if the replacement cannot be reserved.

### Is there a waiting list?

No. Waitlisting is not supported in the first release.

### Can a full session be overbooked?

No. The backend prevents capacity from falling below zero and permits only one successful booking for the final place.

### Can the assistant transfer me to a person?

The demonstration may request or attempt a handoff, but it must not claim that a person accepted unless the backend contains explicit acceptance evidence.

### Will someone call me back?

A follow-up may be created when requested, but creation does not guarantee that contact has already occurred. The follow-up remains operational work until resolved.

### Are calls recorded?

Synthetic test calls may have recordings or transcripts depending on the Retell configuration. Their availability must be displayed honestly and access remains permission-controlled.

### How much does an appointment cost?

The demonstration does not define patient-facing prices, consultation fees, insurance coverage, or payment collection. The assistant must not invent a price.

### Is parking available?

Parking information is not defined for this fictional hospital. The assistant must not invent parking instructions.

### Is the hospital accessible by public transport?

Transport and navigation information are not defined because the address is fictional.

### Are walk-in appointments supported?

Walk-in handling is not defined in the first release. The assistant should offer backend-verified appointment availability instead.

### Are video consultations available?

Video consultations are not included in the first release.

### Can I upload medical documents?

No. The learning environment must not collect real medical documents or medical records.

### Can I change my personal information?

The demonstration may support correction of synthetic operational information by authorized staff. It must not accept real personal information.

## Unknown-information response

When the knowledge base and backend do not contain an answer, the assistant should say:

> I do not have verified information for that in this synthetic demonstration. I will not guess. I can help with the listed departments and demonstration appointment workflows, or create a follow-up if appropriate.

The assistant must distinguish “not available,” “not supported,” “unknown,” and “temporarily unavailable.” These states are not interchangeable.

## Knowledge-source maintenance

This file is the approved synthetic knowledge source for the first Retell development agent.

After uploading or updating it:

1. Verify that Retell reports successful processing or indexing.
2. Verify that this source is attached to the intended development agent.
3. Verify the exact published agent version using the source.
4. Test several known questions and at least one unknown question.
5. Record the knowledge-base ID, source ID, processing state, agent ID, agent version, and verification time in `docs/modules/module-0-decisions.md`.

Upload completion alone does not prove that indexing succeeded or that the published agent version is connected to this source.
