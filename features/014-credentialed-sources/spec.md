# Spec: Credentialed sources

Status: draft. Split on 2026-11-15 from spec 001 ("Legacy sources scraper", wave 3).

## 1. Context and goal

Some legacy sources are read through an API that needs a key: Adzuna, Jooble and France Travail. Keys are not in the repository and may not exist yet for this rewrite. `crawl-core` FR-9 already defines how a source with missing credentials behaves.

**Goal:** port every legacy source that needs credentials, delivered disabled until its key exists, so that providing the key is the only step left to enable it.

**Why:** these sources add coverage (France Travail is France's public employment service), and porting them now keeps the parsing ready for when the keys or agreements arrive.

## 2. Users

- **Operator**: provides keys in `.env` and sees in the status which sources wait for one.

## 3. User stories

- As the operator, I want a keyed source to switch on as soon as I set its key so that no code change is needed.
- As the operator, I want the status to say which key is missing so that I know what to ask for.

## 4. Functional requirements

**FR-1 — Coverage.**
The scraper shall support every legacy source that needs credentials: adzuna, jooble and francetravail, plus any other found while porting the other source features.
_Acceptance:_ Each one is verified against a saved sample built from the provider's documented response.

**FR-2 — Disabled until keyed.**
While a source's credentials are missing, the source shall be disabled and make no request, and the status shall name the missing variable (never its value).
_Acceptance:_ With no key set, every source of this feature shows as disabled; with a value set, it runs.

**FR-3 — Per-source terms.**
Where a provider's terms limit how much may be read, the source shall respect it.
_Acceptance:_ Starting from the legacy values: France Travail every hour, a seventh of its listings per pass.

**FR-4 — Core rules.**
Every source shall run through `crawl-core` and meet its FR-1 (common format), FR-2 (licence and attribution, e.g. "Jobs by Adzuna") and FR-9 (credentials).
_Acceptance:_ The shared contract test passes with every source registered.

## 5. Non-functional requirements

- **Security:** keys only in `.env` (never committed), listed in `.env.example`, never logged.
- **Testability:** parser tests run offline against saved responses.

## 6. Edge cases

- A key is revoked or expires: the source is marked failed (not silently disabled) and previous adverts are kept (`crawl-core`).

## 7. Out of scope

- Obtaining keys or partner agreements.

## 8. Completion criteria

- With no keys set, the status shows every source of this feature as disabled with its variable's name; `.env.example` is complete; the CI command is green.

## 9. Open questions

- [NEEDS CLARIFICATION] The legacy switched Adzuna off on 15 November 2026: its terms ask for a licence for a site that carries ads. Port it disabled anyway, or drop it?
