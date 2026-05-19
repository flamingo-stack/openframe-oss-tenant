# Dashboard Activity Events (button/action tracking)

Activation/engagement analytics. Selected high‑signal user actions POST a single
event to the backend. Fire‑and‑forget — tracking must never block, delay, or
break the UX.

## API contract

`POST /api/events` (via the existing `apiClient` singleton — auth/baseURL handled
for us).

```jsonc
{
  "eventType": "DASHBOARD_ACTIVITY", // always this constant
  "subtype": "add_device_main_dashboard", // per-action, from the constants object
  "repeatMode": "MULTI" // per-subtype: SINGULAR for skip_onboarding & add_sso_idp, MULTI for the rest
}
```

`eventType` is fixed for every event. `subtype` is the only hand‑set value and
is defined once in a constants object so call sites never hand‑write strings.
`repeatMode` is **derived from the subtype** inside `trackDashboardActivity`
(call sites don't pass it):

- `SINGULAR` (count once per user): `skip_onboarding_main_dashboard`,
  `add_sso_idp_main_dashboard`.
- `MULTI` (count every occurrence): all other subtypes.

## Module

`src/lib/analytics.ts` (single‑file lib module, same style as
`src/lib/feature-flags.ts`):

- `EVENT_TYPE` — `'DASHBOARD_ACTIVITY'`
- `REPEAT_MODE` — `{ SINGULAR, MULTI }` `as const`; `type RepeatMode`
- `EVENT_SUBTYPE` — `as const` object with one key per tracked action
- `type EventSubtype` — union of subtype string literals
- `SINGULAR_SUBTYPES` (internal) — set of subtypes that resolve to `SINGULAR`;
  `repeatModeFor(subtype)` derives the mode (default `MULTI`)
- `trackDashboardActivity(subtype: EventSubtype): void` — fire‑and‑forget POST;
  swallows all errors, returns immediately (no `await` at call sites).

## Subtype naming

Convention: `<action>_<surface>`. Only `add_device_main_dashboard` was given
explicitly by the requester; the rest follow the same convention and are
centralized in `EVENT_SUBTYPE`, so renaming later is a one‑file change.

- surface `main_dashboard` → `/dashboard` Get Started checklist
- surface `mingo` → `/mingo` chat
- surface `ticket_detail` → `/tickets/dialog?id=…` detail page

## Fire‑timing policy

- **Navigation/intent buttons** (no meaningful success state) → fire on click.
- **Mutation buttons** (send/approve/reject/resolve/start) → fire on **success**
  only, so failed/cancelled attempts don't pollute activation metrics.
- **Skip onboarding** → fire when the walkthrough is dismissed.

## Tracked events

| # | Event | `EVENT_SUBTYPE` key | subtype string | Surface | Wire point (app code) | Fires on |
|---|-------|---------------------|----------------|---------|-----------------------|----------|
| 1 | Add Device | `ADD_DEVICE` | `add_device_main_dashboard` | dashboard | `dashboard/components/onboarding-section.tsx` → `handleDeviceAction` | click (before `router.push('/devices/new')`) |
| 2 | Add SSO IdP | `ADD_SSO_IDP` | `add_sso_idp_main_dashboard` | dashboard | `dashboard/components/onboarding-section.tsx` → `handleSsoAction` | click (before `router.push('/settings/sso')`) |
| 3 | Skip Onboarding | `SKIP_ONBOARDING` | `skip_onboarding_main_dashboard` | dashboard | `dashboard/components/onboarding-section.tsx` → new `onDismiss` prop passed to `OnboardingWalkthrough` | walkthrough dismissed |
| 4 | Send Mingo message | `SEND_MINGO_MESSAGE` | `send_mingo_message_mingo` | mingo | `mingo/page.tsx` → `handleSendMessage` | send **success** (`success === true`, both draft & existing branches) |
| 5 | Approve Mingo command | `APPROVE_MINGO_COMMAND` | `approve_mingo_command_mingo` | mingo | `mingo/hooks/use-mingo-dialog-selection.ts` → `handleApprove` | approve mutation **success** |
| 6 | Reject Mingo command *(added per request)* | `REJECT_MINGO_COMMAND` | `reject_mingo_command_mingo` | mingo | `mingo/hooks/use-mingo-dialog-selection.ts` → `handleReject` | reject mutation **success** |
| 7 | Open Remote Shell | `OPEN_REMOTE_SHELL` | `open_remote_shell_ticket_detail` | ticket detail | `tickets/components/ticket-details-view.tsx` → `menuActions` memo wraps the `remoteShell` item (and its Windows submenu leaves) with an `onClick` | menu item click |
| 8 | Open Remote Control | `OPEN_REMOTE_CONTROL` | `open_remote_control_ticket_detail` | ticket detail | `tickets/components/ticket-details-view.tsx` → `menuActions` memo wraps the `remoteControl` item with an `onClick` | menu item click |
| 9 | Resolve ticket | `RESOLVE_TICKET` | `resolve_ticket_ticket_detail` | ticket detail | `tickets/components/ticket-details-view.tsx` → `handleResolve` | resolve **success** (`nextStatus` truthy) |
| 10 | Start Direct Chat | `START_DIRECT_CHAT` | `start_direct_chat_ticket_detail` | ticket detail | `tickets/hooks/use-direct-chat.ts` → `createDialogMutation.onSuccess` | dialog create **success** |

> The Approve/Reject buttons themselves and the onboarding buttons render inside
> the shared library `@flamingo-stack/openframe-frontend-core`. We do **not**
> modify the shared lib — every wire point above is an app‑level handler/prop
> the app already owns (`onApprove`/`onReject`/`onDismiss`/`onClick`/mutation
> success), so tracking is added purely in `src/`.

### Remote Shell / Remote Control nuance

`buildDeviceMenuItems` (`devices/utils/device-menu-items.tsx`) returns
`ActionsMenuItem`s that navigate via `href`. `ActionsMenuItem` supports `href`
**and** `onClick` together, so in the `menuActions` memo we shallow‑wrap the
built `remoteShell` / `remoteControl` items adding an `onClick` that calls
`trackDashboardActivity(...)` while leaving `href` untouched. On Windows,
`remoteShell` is a `type: 'submenu'` whose leaf children carry the `href`; the
wrapper maps those leaves too so the event fires on the actual shell choice.
`iconAction` (open‑in‑new‑tab secondary button) is left as‑is.

## Non‑functional requirements

- Fire‑and‑forget: no `await`, no UI dependency on the response.
- Never throws: `trackDashboardActivity` internally catches everything.
- No PII in the payload — only the fixed `eventType`, `subtype`, `repeatMode`.
- One subtype string source of truth (`EVENT_SUBTYPE`); call sites pass the
  constant, never a literal.

## Out of scope / open items

- Backend `/api/events` route is assumed to exist (not created here).
- `repeatMode` is derived per subtype: `SINGULAR` for `skip_onboarding` and
  `add_sso_idp`, `MULTI` for everything else (see `SINGULAR_SUBTYPES`).
- Non‑dashboard subtype suffixes (`_mingo`, `_ticket_detail`) follow the stated
  convention; adjust in `EVENT_SUBTYPE` if the backend expects different strings.
