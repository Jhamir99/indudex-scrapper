# Spec: Companies

Status: outline. Context, scope and legacy references only; the requirements are written with `/spec` before planning.

## Context and goal

One employer appears under many spellings ("Siemens AG", "SIEMENS", "Siemens"), agencies post for employers, and the web has a company directory with a panel per company.

**Goal:** give each advert a clean employer name and key, tell agencies from employers, and build the company directory and the per-company cards the publication writes.

## Scope (from the legacy)

- Employer names cleaned and keyed (legal forms, quotation marks, case); the spelling seen most often is shown.
- Staffing and recruitment agencies recognised by their words and brands; their adverts read "via the agency's site".
- The directory: every employer with offers today and every one that had some before, with today's count, main occupation group, places and town; plus open-register companies that hire the site's occupations.
- Company cards: careers page, register data (activity, size), what its adverts say (what it hires for, where, pay, work mode).

## Depends on

- `places`, `gate` (occupation groups), `pay`, `advert-facts`.

## Legacy reference

- `builder/companies.mjs`, `builder/agencies.mjs`, `builder/company-cards.mjs`, `builder/lib/names.mjs`, `builder/tools/{registers,company-keys,seed-companies}.mjs`, `docs/research/{directory,employer-names}.md`.

## Open questions

- [NEEDS CLARIFICATION] Whether the open business registers stay in scope for the first version of the directory.
- [NEEDS CLARIFICATION] The Public Suffix List (an employer's site to its registrable domain, for company keys): the legacy's `catalogues/codes/public_suffix_list.dat` (Mozilla, MPL 2.0) or a library such as `tldts`. Moved here from `003-catalogues` on 2026-11-19, since this feature is its only user.
