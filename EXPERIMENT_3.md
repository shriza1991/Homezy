# Experiment 3 ? React Hooks and State Management

Implemented within the existing Homezy React/Vite application, without new dependencies or backend/schema changes.

## Existing implementation

- Login used POST /api/auth/login and stored token and user in localStorage.
- The backend also exposed POST /api/auth/register, requiring name, email, phone and password, with an optional role.
- Registration was a static form. AuthContext.jsx, useAuth.js and api.js were empty.
- Home and Properties duplicated static property data. PropertyCard and PropertyRequest claimed request success from local state alone.
- No property-listing or rental-request backend endpoints exist. RentalRequests.jsx and AdminDashboard.jsx were empty and not routed; PropertyDetails.jsx was also not routed.

## Files changed

| Files | Purpose |
| --- | --- |
| client/src/data/properties.js (new) | Single source for the existing four demo listings and a pure combined filter. |
| client/src/pages/Properties.jsx | Immediate title/location search, type selection, clear filters, result count and empty results. |
| client/src/pages/Home.jsx | Reuse the same listings, label featured demo properties and connect Explore Properties navigation. |
| client/src/context/authContext.js (new), client/src/context/AuthContext.jsx, client/src/hooks/useAuth.js | One shared auth context/provider, stored-auth initialization, login/logout and cross-tab storage synchronization. The context definition is separate to support React Fast Refresh lint rules. |
| client/src/main.jsx, client/src/components/Navbar.jsx | Install the provider and consume shared user/authentication state in navigation. |
| client/src/services/api.js | Shared JSON authentication requests and readable server/network/invalid-response errors, preserving existing endpoint URLs. |
| client/src/pages/Login.jsx | Use context login; loading/error UI and duplicate submission guard. Preserve email/password payload and token/user storage keys. |
| client/src/pages/Register.jsx | Connect the existing register endpoint, including required phone and tenant/owner role; password confirmation, loading/error/success states and duplicate submission guard. Registration leads to login because the backend registration response does not issue a token. |
| client/src/components/PropertyCard.jsx | Replace misleading success with a link to the demo request form, carrying the selected property. |
| client/src/pages/PropertyRequest.jsx | Explicit frontend-demo notice, controlled form, shared demo property choices, auth name/email prefill, accessible labels, completion status and editing. |

All existing routes remain unchanged in App.jsx. No passwords are stored in context or localStorage. Existing role values are retained; no authorization rules were added or changed.

## Hooks and interaction

- useState controls search, category, authentication, forms, submission status, loading and errors.
- useEffect installs a storage listener for authentication changes in other tabs and removes it on cleanup. Static demo properties do not require an effect or invented API call.
- createContext defines one AuthContext; useContext is wrapped by useAuth, consumed by login, navbar and request form.
- Property results are derived during rendering, without a second state array. Search trims whitespace and matches title/location case-insensitively; type filtering combines with search. Clear filters restores all listings.
- Rental requests complete synchronously in component memory. Native required/email validation applies. Completion replaces the form and guards repeated submissions. There is no asynchronous rental operation, artificial loading delay, request API call, MongoDB write or owner notification.
- Login and registration display pending and failure states for actual network requests, disabling submit and using ref guards while pending.

## Verification performed

- npm.cmd run lint --prefix client: passed.
- npm.cmd run build --prefix client: passed.
- npm.cmd test --prefix server: the existing placeholder reports "Error: no test specified" and exits with failure; no backend tests are configured.
- Node assertions: 9 filter checks passed (empty search, whitespace, case, title/location, category, combined matching, empty results and reset/source preservation).
- Node assertions with mocked fetch: 7 authentication endpoint/payload/error checks passed. These are contract checks, not live authentication or database tests.
- Vite SSR with React server rendering: all five existing route page components rendered; selected request property was retained. Stored authentication, malformed JSON recovery, login persistence, role preservation, password exclusion, authenticated navbar and logout checks passed with mocked fetch/storage. SSR does not exercise browser event handling or effects.
- Browser verification was attempted through the computer-use tool, which returned "No browser is available". Visual layout, clicks and live cross-tab synchronization were not browser-tested.

## Limits

Property listings and rental requests remain explicitly labelled frontend demonstrations. Live login/registration and MongoDB persistence were not exercised; their existing endpoints and payload contracts were inspected and checked with mocks. Backend code, schemas, JWT issuance and all existing routes were left unchanged. Existing unused placeholder pages remain untouched.
