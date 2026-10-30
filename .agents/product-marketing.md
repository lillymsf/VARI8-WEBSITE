# Product Marketing Context

**Document version:** v6
**Last updated:** 2026-10-28

Sources: `spec/core-coaching-system-brief.html` (product owner brief, 1 Oct 2026), `docs/product-alignment-blueprint.md`, `docs/product-decisions.md`, the coach and client app prototype (`ui sys` repo, `/coach` and `/client`), Hanzlah's first landing draft (`website/index.html` at 75d8ce3). Status labels: **Shown** = works in the current prototype (local demo data, no backend); **Planned** = in the brief, not in the prototype; **Unconfirmed** = needs an owner answer before it goes on the page.

## Product Overview
**One-liner:** A connected coaching system for fitness and physique coaches, built around the way they already track in Sheets: clients, check-ins, plans, messages and notes in one connected workspace, with a client app that goes with it.
**Positioning (owner, 2026-10-28):** It is not just a client app. It is the coach's whole connected working system (roster and attention, check-in calendar and review, plans, tracker, messages, notes and to-dos, templates) plus the client app. The owner calls it a "connected coach OS" internally; do NOT use "OS" on the page. Say "one connected system" / "workspace". Scope boundary: coaching work only; no billing, payments, class booking or video calls.
**Core USP (owner, 2026-10-28):** Keep what makes Google Sheets win (the coach's own columns, calculations and way of working, so no new workflow to learn if they are comfortable with sheets) and connect what a sheet cannot do. In a sheet-based setup the sheet only holds data; communication runs through WhatsApp or other messengers, progress photos sit in chats or Drive folders. In Vari8 client management, check-ins, photos, messages, history and the client's phone view are connected in one app. Coach Tracker feels between "same columns I define" and "a familiar grid": say "a grid you'll recognise", never "identical to your sheet". Weekly averages and recurring check-ins already exist in sheets, so they are NOT the automation pitch; the pitch is the connection of everything around the data.
**Essence (owner, 2026-10-27):** Everything about a client is connected and documented in one place. The core workflow to show is a coach reviewing a check-in: calendar, the week (Tracker), changing plans, messaging the client. Coaching is highly individual, so the tool should be too; the custom Google Sheets origin stays on the page.
**What it does:** The coach builds a client tool as a template: which tracker fields, dashboard widgets, weekly roadmap calculations, training prescription fields and check-in questions a client gets. The coach assigns it, fills in that client's meal plan, training and habits, and reviews what comes back in one place. Clients log on their phone and see exactly what's planned.
**Product category:** Online coaching software for fitness and physique coaches (the shelf Pono, Trainerize, TrueCoach, Everfit sit on).
**Product type:** SaaS, coach-facing workspace plus client app.
**Business model:** Not decided. Pricing and marketing are outside the product owner's brief. Early access signup is not connected.

## Target Audience
**Target companies:** Fitness and physique coaches (owner's chosen label, 2026-10-23), independent or small teams, who already run clients on custom Google Sheets. Covers prep and lifestyle clients.
**Decision-makers:** The head coach or workspace owner.
**Primary use case:** Running the weekly loop per client: write the plan, client follows and logs, check-in arrives, coach reviews with context and adjusts.
**Jobs to be done:**
- Keep my own coaching method (my fields, my calculations, my check-in questions) without building and repairing a spreadsheet per client.
- Review a check-in with everything I need on one screen instead of across sheets, chat and screenshots.
- Change a plan mid-block without rewriting every week or losing the client's history.
**Use cases:**
- Week-based training block where the coach changes week 4 and later weeks follow.
- Meal plan with a training day and a rest day option; swap to an IIFYM setup for the same client.
- Weekly check-in plus an extra out-of-schedule check-in date.
- Client flags a set note ("left knee felt tight") that the coach sees in the check-in review.

## Personas
| Persona | Cares about | Challenge | Value we promise |
|---------|-------------|-----------|------------------|
| Head coach (user and buyer) | Their method, client results, time per check-in | Sheets per client, chasing updates in chat, rigid apps that force a generic tracker | Their tracker, their review, their weekly rhythm in one workspace |
| Client (end user) | Knowing what to do today, logging fast | Long sheets on a phone, screenshots lost in chat | One app: today's plan, quick logging, their own trends |

## Problems & Pain Points
**Core problem:** Coaches who care about their method end up maintaining a custom spreadsheet per client plus a chat app, and stitching both together every check-in.
**Why alternatives fall short:**
- Off-the-shelf coaching apps give every coach the same tracker and check-in form.
- Custom Google Sheets fit the method but break, need copying per client, and are hard to use on a phone.
- Chat apps scatter context: photos, notes and numbers end up in different threads.
**What it costs them:** Time per check-in, missed details (a flagged knee issue buried in a message), rework when a plan changes.
**Emotional tension:** "I'm the bottleneck", worry about missing something, the feeling of chasing clients instead of coaching them.

## Competitive Landscape
**Direct:** Pono (owner's primary benchmark), Trainerize, TrueCoach, Everfit, Kahunas. Generic trackers and forms; the coach adapts to the app.
**Secondary:** Custom Google Sheets built per coach. Fits the method, but fragile, manual and poor on mobile.
**Indirect:** WhatsApp/Instagram DMs plus PDFs. No structure, no history.
Do not name competitors on the landing page.

## Differentiation
**Key differentiators:**
- The client tool is built by the coach: 64 tracker parameters in about 20 groups, units and rating scales (1–10, 1–5, word labels), dashboard widget grid, roadmap calculations (weekly average, trend, target vs actual, adherence), training prescription fields, check-in questionnaire. (Shown)
- Variants inside one template, e.g. meal-plan based and IIFYM based. Switching keeps the client's data, no new tracker. (Shown in prototype templates; owner's central rule; owner approved promising it publicly, 2026-10-23)
- Connected review: the check-in review shows the client's answers, submitted photos, tracker and progress, flagged training notes and the feedback box together. (Shown)
- Week-based training carry-forward: a change applies from the chosen week onward; earlier weeks keep their instructions. (Shown, `resolveTrainingWeek`). Owner: changing plans mid-block is NOT a standout feature; do not give it a headline slot.
- Plans stay drafts until the coach activates them; plan changes made during a review are linked in the feedback. (Shown)
**How we do it differently:** Starts from the custom sheets coaches already run, not from a fixed app model.
**Why that's better:** The coach keeps the method that made them good; the client gets a simpler app than a sheet.
**Origin (approved for public use, 2026-10-23):** Built from several years of designing custom coaching Google Sheets for more than 100 coaches (product owner, per the brief). Used as the hero proof line.

## Objections
| Objection | Response |
|-----------|----------|
| "Setting up a tool sounds like work." | Build a template once, assign it per client; with sheet migration we move the clients over. Setup time depends on how the coach works and is not decided; make no time claim (owner, 2026-10-27). |
| "My clients won't use another app." | Clients get one phone app with today's plan and quick logging, not a spreadsheet. |
| "I'll lose my history if I switch variants or plans." | Switching variants keeps entries; plan versions are kept in history. |
| "Can I move my sheets in?" | Yes: migration from Google Sheets is offered as a done-for-you service. Coaches give us their clients' sheets and we transfer the clients and their data into the app (owner, 2026-10-27). Don't call it automatic import. |
| "Do clients need to install an app?" | End goal is a dedicated App Store client app; delivery during early access is undecided. |
| "What does it cost?" | No pricing yet. Don't imply any. |

**Anti-persona:** Gyms wanting class booking or payments; coaches happy with a fixed, generic tracker.

## Switching Dynamics
**Push:** Broken formulas, copying sheets for every new client, check-ins arriving across chat.
**Pull:** Keep your own fields and calculations in a proper app with a client app attached.
**Habit:** "My sheet works and my clients know it."
**Anxiety:** Setup time, client adoption, losing data or history.

## Customer Language
**How they describe the problem:**
- "individually built Google Sheets" (brief)
- "shape the tool around their methods" (brief)
- "without requiring a new tracker" (brief)
- "progress screenshots lost in chat threads" (Hanzlah draft)
**Words to use:** check-in, client, coach, tracker, template, meal plan, training block, week, set note, flag, roadmap, IIFYM, training day / rest day, bodyweight, adherence.
**Words to avoid:** platform, solution, seamless, streamline, unlock, empower, revolutionize, next level, all-in-one, AI.
**Glossary:**
| Term | Meaning |
|------|---------|
| Template | Saved configuration of the client tool (views, fields, widgets, check-in form) |
| Variant | Alternative presentation inside one template, e.g. meal plan vs IIFYM; client data stays |
| Client setup | The template assigned to one client plus their plans, targets, schedule, habits |
| Timeline / Roadmap | Weekly overview built from coach-selected parameters and calculations |
| Flagged set note | Client note on a specific set, raised to the coach's check-in review |

## Brand Voice
| Attribute | Means | Doesn't mean | Example line |
|-----------|-------|--------------|--------------|
| Coach-literate | Uses the words coaches use: check-in, block, rest day, sets | Gym-bro slang | "Change week 4. Weeks 5 to 8 follow." |
| Concrete | Names the actual screen or action | Feature lists without a reason | "Her flagged set note is already in the review." |
| Calm confidence | Short declaratives, no hype | Cold or corporate | "Less chasing. More coaching." |
| Respectful of the method | The coach decides; the tool follows | Flattery | "Your questions, your calculations." |

**Tone by context:** Launch/early access: honest about stage ("in development", "not connected yet"). Errors: plain. Sales: specific screens over adjectives.
**Terms we own:** "your method", "the weekly loop", "check-in with context".
**Never use (and why):** "platform" (generic), "AI" (not a feature), "all-in-one" (empty), em dashes in UI copy (house style).

## Proof Points
**Metrics:** Prototype facts only: 64 tracker parameters, 584-food database, 391-product supplement catalogue, demo athlete with 56 days of logs. No customer metrics exist. Re-verify any number against the current app before it goes on the page.
**Customers:** None public. Owner confirmed 2026-10-27: no proof exists yet; the page invents none.
**Testimonials:** None.
**Value themes:**
| Theme | Proof |
|-------|-------|
| Your method, built in | Template editor, parameter library, roadmap calculations, check-in form builder |
| Review with context | Check-in review screen (answers, photos, tracker, flagged notes, feedback) |
| Plans that change cleanly (supporting, not a headline) | Week carry-forward, drafts until activated, plan history |
| A client app people use | Client app tabs Home, Tracker, Plans, Messages (2026-10-27 build); Home opens on today's targets and the next session |

## Goals
**Business goal:** Build an early access list of coaches.
**Conversion action:** Request early access (form not connected yet; destination and privacy wording undecided).
**Current metrics:** None.

## Feature status (for copy claims)
- Shown: roster, check-in calendar with extra dates, check-in queue and review (answers, photos, tracker, flagged training notes, video feedback recorder, plan links), messages (unread/flagged filters, voice notes, reply snippets, per-client priority permission), notes and to-dos, client tasks, templates with views and variants, dashboard widget grid, tracker parameter library, timeline/roadmap with phases, meal plans with options, food swaps and IIFYM, training editor (week-based or evergreen, weekly rotation, volume per muscle as table or heatmap, carry-forward weeks), training logbook with set notes and flags, habits with goal and reason, activity targets (steps, cardio) with effective dates, supplements, client app (Home, Tracker, Plans, Messages as of 2026-10-27), custom accent and workspace logo.
- Planned: wearables (Apple Watch, Fitbit, Oura), migration from sheets, export, barcode scanning, recipes/favourites, copy previous meals, automatic text change summary, onboarding form builder in the coach workspace, real video recording, backend accounts.

## Learnings
| Date | Learning | Evidence | Applies to | Status |
|------|----------|----------|------------|--------|
| 2026-10-27 | The prep timeline is not a standout; a direct competitor (gain-app.com) ships a year planner with diet phases. Vari8 is for coaches who need more than a basic tracker, not only prep coaches. | Owner feedback, competitor page review | positioning, section order | active |
| 2026-10-27 | "Everything in one place" is also the competitor's pitch ("Alles in einer Plattform"). It only works when tied to the coach's own method and the concrete check-in workflow. | gain-app.com page review, swap test | copywriting | active |
| 2026-10-27 | Changing plans mid-block is not a standout feature. | Owner feedback | feature emphasis | active |
| 2026-10-27 | Screenshots must come from the current app, and the app changes daily; page uses labelled placeholders until the app is final. | Owner feedback | assets | active |
| 2026-10-28 | The strongest switching-anxiety answer is sheet familiarity: "My sheet works and my clients know it" is the habit we must respect, not attack. Do not say "replace your spreadsheet"; say the tracker stays theirs and the rest connects. | Owner USP | positioning, FAQ, hero | active |
| 2026-10-28 | Selling it as a "client app" undersells the product; the coach's connected workspace is the product, the client app is its client side. Avoid the word "OS" in public copy (jargon, implies payments/admin). | Owner feedback | hero, headings | active |
| 2026-10-27 | Competitor negation lists ("no sheets, no email chains, no folders") are an AI tell; state what happens instead. | stop-slop, copywriting | copywriting | active |
| 2026-10-22 | Every section saying "customize" reads as AI filler; each section needs its own reason. | Owner feedback on landing copy | copywriting | active |

## Changelog
- v6 (2026-10-28) — Hero direction chosen by owner: "Run your [check-ins | plans | messages | clients] from one connected system." with the USP (built around the way you track in Sheets) in the subhead. Positioning widened from "client app" to a connected coaching system; "OS" stays internal.
- v5 (2026-10-28) — Owner added the core USP: keep the sheet workflow (columns, calculations, familiarity), connect everything around it (messages, photos, check-ins, history, phone view). Differs from gain-app.com, which pitches "zero spreadsheets". Text morph moves to the hero title.
- v4 (2026-10-27) — Owner answers: essence is "everything connected and documented in one place", shown through the check-in review workflow; prep timeline and mid-block plan changes are not standouts; coaching is individual so the tool should be too (spreadsheet origin stays); sheet migration = coaches give us their clients' sheets and we transfer clients and data; setup time undecided; flagged set notes still true; no proof exists. Client app now Home, Tracker, Plans, Messages. Added competitor learning (gain-app.com).
- v3 (2026-10-23) — Owner answers: Sheets migration is a done-for-you service; App Store client app is the end goal; no pricing yet; audience framed as coaches who need more than a basic fitness tracker; video feedback is a promised feature; founder stays unnamed on the page. Prep timeline (phases, show date, refeed/deload/diet break with nutrition switching) added as a lead differentiator. Updated Objections.
- v2 (2026-10-23) — Owner answers: audience label is "fitness and physique coaches"; the 100+ coaches origin is approved for the page; variant switching without data loss may be promised publicly. Updated Target Audience, Differentiation and Proof Points.
- v1 (2026-10-22) — Initial context drafted from the product brief, blueprint, prototype and both landing drafts.
