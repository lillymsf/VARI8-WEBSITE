// Declarative description of every app state captured for the landing page.
//
// StateSpec = {
//   name: string,
//   viewport: "desktop" | "phone",
//   url: string,                  // app route loaded before steps run
//   steps: Step[],                // run in order after hydration + typing
//   select: string,               // CSS selector of the subtree to capture
//   typing?: { selector, text },  // field value set BEFORE steps (waits for
//                                 // its own selector first)
// }
// Step = { click?: string, waitFor?: string, evaluate?: string,
//          delayMs?: number }
// waitFor accepts a CSS selector (waited for presence) or
// "expr:<javascript boolean expression>".

const EXPR = (e) => `expr:${e}`;

// ---- shared app constants ---------------------------------------------------
export const BASE = "http://127.0.0.1:3000";
export const STORAGE_KEY = "coach-desktop-mockup-v1";
export const ACCENT = "#6E8CF7";
export const SVG_FILE =
  "/Users/lilianamansfeld/Documents/Projects/VARI8/vari8/logos/wordmark/wordmark-outline-light.svg";

export const VIEWPORTS = {
  desktop: { width: 1440, height: 900, dpr: 1, mobile: false },
  phone: { width: 390, height: 844, dpr: 3, mobile: true },
};

export const READY = `document.readyState === "complete" && !!document.querySelector(".coach-root") && !document.querySelector(".cd-loading")`;

// Meal-plan draft for Emma (client-001) — the app seeds no nutrition content.
// All foodIds exist in src/data/food-database.json.
export const EMMA_PLAN = {
  id: "plan-emma-fatloss",
  clientId: "client-001",
  name: "Fat loss · meal plan",
  startDate: "2026-10-13",
  variants: [
    {
      id: "opt-training-day",
      label: "Training day",
      dailyTarget: {
        style: "macros",
        calories: { kind: "fixed", value: 2150 },
        protein: { kind: "minimum", value: 150 },
        carbs: { kind: "fixed", value: 205 },
        fat: { kind: "fixed", value: 68 },
      },
      meals: [
        {
          id: "meal-breakfast",
          label: "Breakfast",
          time: "07:15",
          frequency: "Daily",
          portions: [
            { foodId: "food-057", quantity: 80 },
            { foodId: "food-021", quantity: 30 },
            { foodId: "food-108", quantity: 100 },
          ],
        },
        {
          id: "meal-snack-am",
          label: "Morning snack",
          time: "10:30",
          frequency: "Daily",
          portions: [
            { foodId: "food-281", quantity: 200 },
            { foodId: "food-100", quantity: 110 },
          ],
        },
        {
          id: "meal-lunch",
          label: "Lunch",
          time: "13:00",
          frequency: "Daily",
          portions: [
            { foodId: "food-001", quantity: 160 },
            { foodId: "food-051", quantity: 75 },
            { foodId: "food-083", quantity: 10 },
          ],
        },
        {
          id: "meal-snack-pm",
          label: "Afternoon snack",
          time: "16:30",
          frequency: "Daily",
          portions: [
            { foodId: "food-349", quantity: 180 },
            { foodId: "food-075", quantity: 60 },
          ],
        },
        {
          id: "meal-dinner",
          label: "Dinner",
          time: "19:30",
          frequency: "Daily",
          portions: [
            { foodId: "food-005", quantity: 140 },
            { foodId: "food-465", quantity: 220 },
            { foodId: "food-095", quantity: 50 },
          ],
        },
      ],
    },
    {
      id: "opt-rest-day",
      label: "Rest day",
      dailyTarget: {
        style: "macros",
        calories: { kind: "fixed", value: 1900 },
        protein: { kind: "minimum", value: 150 },
        carbs: { kind: "fixed", value: 160 },
        fat: { kind: "fixed", value: 66 },
      },
      meals: [
        {
          id: "meal-rd-breakfast",
          label: "Breakfast",
          time: "08:00",
          frequency: "Daily",
          portions: [
            { foodId: "food-016", quantity: 3 },
            { foodId: "food-075", quantity: 70 },
            { foodId: "food-095", quantity: 60 },
          ],
        },
        {
          id: "meal-rd-lunch",
          label: "Lunch",
          time: "13:00",
          frequency: "Daily",
          portions: [
            { foodId: "food-033", quantity: 150 },
            { foodId: "food-056", quantity: 250 },
          ],
        },
        {
          id: "meal-rd-dinner",
          label: "Dinner",
          time: "19:00",
          frequency: "Daily",
          portions: [
            { foodId: "food-015", quantity: 140 },
            { foodId: "food-051", quantity: 60 },
            { foodId: "food-083", quantity: 10 },
          ],
        },
      ],
    },
  ],
  activeVariantId: "opt-training-day",
  schedule: {
    mode: "weekly",
    days: {
      "1": "opt-training-day",
      "2": "opt-rest-day",
      "3": "opt-training-day",
      "4": "opt-training-day",
      "5": "opt-training-day",
      "6": "opt-rest-day",
      "7": "opt-rest-day",
    },
  },
  archivedPlans: [],
  reusableMeals: [],
};

// In-page expression: recolour + inject Emma's meal plan into the stored
// state + mark Amara's training draft so it differs from her active plan
// (the seed stores them identical, which disables "Review & activate").
export const SEED_EVAL = `(() => {
  const raw = localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
  const s = JSON.parse(raw);
  s.preferences.accent = ${JSON.stringify(ACCENT)};
  s.preferences.mode = "dark";
  const amara = s.clients.find((c) => c.id === "client-007");
  if (amara?.plans?.training?.draft) amara.plans.training.draft.__cap = 1;
  const emma = s.clients.find((c) => c.id === "client-001");
  emma.plans = emma.plans ?? {
    nutrition: { mealPlan: { history: [] }, iifym: { history: [] } },
    training: { history: [] },
    goals: [],
    activityTargets: [],
  };
  emma.plans.nutrition = emma.plans.nutrition ?? {
    mealPlan: { history: [] },
    iifym: { history: [] },
  };
  emma.plans.nutrition.mealPlan = emma.plans.nutrition.mealPlan ?? { history: [] };
  emma.plans.nutrition.mealPlan.draft = ${JSON.stringify(EMMA_PLAN)};
  localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(s));
  return { accent: s.preferences.accent, mode: s.preferences.mode };
})()`;

const CLICK_TEXT = (scope, text) =>
  `(() => { const el = [...document.querySelectorAll(${JSON.stringify(
    scope,
  )})].find((b) => b.textContent.trim() === ${JSON.stringify(text)});
  el?.click(); return Boolean(el); })()`;

const OPEN_STRENGTH_PREVIEW = `(() => {
  const card = [...document.querySelectorAll(".cd-template-card")].find((c) =>
    c.textContent.includes("Strength & balance"));
  const btn = card && [...card.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === "Preview");
  btn?.click();
  return Boolean(btn);
})()`;

const OPEN_STRENGTH_ASSIGN = `(() => {
  const card = [...document.querySelectorAll(".cd-template-card")].find((c) =>
    c.textContent.includes("Strength & balance"));
  const btn = card && [...card.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === "Assign");
  btn?.click();
  return Boolean(btn);
})()`;

const TAG_STRENGTH_CARD = `(() => {
  const card = [...document.querySelectorAll(".cd-template-card")].find((c) =>
    c.textContent.includes("Strength & balance"));
  card?.setAttribute("data-capture", "");
  return Boolean(card);
})()`;

// The reworked client preview embeds the real client app: tabs switch via
// its own nav, views via visible segmented controls. Hidden (lazily
// mounted) sections are filtered out with offsetParent checks.
const PREVIEW_NAV = (label) => `(() => {
  const b = [...document.querySelectorAll(
    ".cd-full-client-preview .cd-client-app-link")].find(
    (b) => b.textContent.trim() === ${JSON.stringify(label)} &&
      b.offsetParent !== null);
  b?.click();
  return Boolean(b);
})()`;

const PREVIEW_VIEW = (label) => `(() => {
  const opt = [...document.querySelectorAll(
    ".cd-full-client-preview .v8-segmented__option")].find(
    (l) => l.textContent.trim() === ${JSON.stringify(label)} &&
      l.offsetParent !== null);
  const input = opt?.querySelector("input");
  input?.click();
  return Boolean(input);
})()`;

const VISIBLE = (sel) =>
  EXPR(`(() => { const el = document.querySelector(${JSON.stringify(
    sel,
  )}); return !!(el && el.getBoundingClientRect().width > 0 &&
    el.getBoundingClientRect().height > 0); })()`);

// Standalone client app (/client): bottom-nav tabs and in-tab controls.
const CLIENT_TAB = (label) =>
  CLICK_TEXT(".cm-tabs .cm-tab", label);

const CLIENT_VIEW = (label) => `(() => {
  const opt = [...document.querySelectorAll(
    ".cd-client-app-content .v8-segmented__option")].find(
    (l) => l.textContent.trim() === ${JSON.stringify(label)} &&
      l.offsetParent !== null);
  const input = opt?.querySelector("input");
  input?.click();
  return Boolean(input);
})()`;

// Tracker day chips carry aria-label "…, has tracking data"; pick the most
// recent day with entries (real "today" is often still empty).
const CLIENT_TRACKED_DAY = `(() => {
  const chips = [...document.querySelectorAll(".cm-day")].filter(
    (b) => b.offsetParent !== null);
  const chip = chips[Math.max(0, chips.length - 2)] || chips[0];
  chip?.click();
  return chip ? chip.textContent.trim() : true;
})()`;

const REVIEW_ACTIVATE = `(() => {
  const btn = [...document.querySelectorAll(".coach-root button")].find(
    (b) => b.textContent.trim() === "Review & activate" && !b.disabled);
  btn?.click();
  return Boolean(btn);
})()`;

const ACTIVATE_PLAN = `(() => {
  const dialog = document.querySelector("dialog.v8-modal");
  const btn = dialog && [...dialog.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === "Activate plan" && !b.disabled);
  btn?.click();
  return Boolean(btn);
})()`;

const DIALOG_OPEN = EXPR('!!document.querySelector("dialog.v8-modal[open]")');
const DIALOG_CLOSED = EXPR('!document.querySelector("dialog.v8-modal[open]")');

// Athlete-profile timeline widget: the "Full plan" checkbox expands the
// Timeline tab: expand the "This week" row (check-in line, coach note,
// Add deload / Temporary plan buttons), then tag the enclosing panel so
// `select` has a stable hook (header columns + phase group + rows).
const TIMELINE_EXPAND_WEEK = `(() => {
  const wk = [...document.querySelectorAll(".apt-week")].find(
    (r) => r.textContent.includes("This week"));
  const canvas = document.querySelector(".apt-canvas");
  if (wk && canvas && !canvas.textContent.includes("Add deload")) wk.click();
  return Boolean(wk && canvas);
})()`;

// phase band (contest prep / peak week / post-show + show-date range).
const TIMELINE_FULL_PLAN = `(() => {
  const tl = document.querySelector(".ap-phase-bar")
    ?.closest(".ap-card, .ap-w-s6, [class*=ap-]");
  const cb = tl && tl.closest("section,div")
    .querySelector("input[type=checkbox]");
  if (cb && !cb.checked) cb.click();
  return Boolean(tl);
})()`;

// Client app Plans > Nutrition: find Amara's next "refeed" timeline event in
// localStorage, open the prescription date picker and select that date, so
// the "Refeed day applies today" banner renders. Async; runSteps only fails
// on literal `false`, so diagnostics return as strings.
const CLIENT_REFEED_DATE = `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const s = JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)}));
  const amara = s.clients.find((c) => c.id === "client-007");
  const events = (amara?.timelineEvents ?? []).filter(
    (e) => e.kind === "refeed");
  if (!events.length) return "no refeed events";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const future = events
    .filter((e) => new Date(e.startDate + "T00:00:00") >= today)
    .sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
  const target = new Date(
    ((future[0] ?? events[events.length - 1]).startDate) + "T00:00:00",
  );

  const chip = [...document.querySelectorAll(
    ".cd-client-app-content button[aria-label]")].find(
    (b) => b.offsetParent !== null &&
      /Nutrition prescription date/.test(b.getAttribute("aria-label")));
  if (!chip) return "no date chip";
  chip.click();
  let pop = null;
  for (let i = 0; i < 40 && !pop; i++) {
    pop = document.querySelector(".v8-picker-popup");
    if (!pop) await sleep(150);
  }
  if (!pop) return "no popup";

  const MONTHS = ("January February March April May June July August " +
    "September October November December").split(" ");
  const label = () => {
    const m = pop.innerText.match(/([A-Z][a-z]+) (\\d{4})/);
    return m ? { m: MONTHS.indexOf(m[1]), y: +m[2] } : null;
  };
  // month nav arrows are the icon-only (empty-text) buttons at the top;
  // fall back to DOM order: prev first, next second
  for (let g = 0; g < 24; g++) {
    const cur = label();
    if (!cur) break;
    const diff =
      (target.getFullYear() - cur.y) * 12 + (target.getMonth() - cur.m);
    if (diff === 0) break;
    const btns = [...pop.querySelectorAll("button")].filter(
      (b) => b.offsetParent !== null);
    const arrows = btns.filter((b) => b.textContent.trim() === "");
    const prev =
      btns.find((b) => /prev|back/i.test(b.getAttribute("aria-label") || "")) ??
      arrows[0];
    const next =
      btns.find((b) => /next|forward/i.test(b.getAttribute("aria-label") || "")) ??
      arrows[1];
    (diff > 0 ? next : prev)?.click();
    await sleep(300);
  }
  const dayBtn = [...pop.querySelectorAll("button")].filter(
    (b) => b.offsetParent !== null &&
      b.textContent.trim() === String(target.getDate()) &&
      !b.disabled && !b.hasAttribute("data-outside") &&
      !b.closest("[data-outside-month]"));
  const wantMonth = MONTHS[target.getMonth()];
  const pick = dayBtn.find((b) =>
      (b.getAttribute("aria-label") || "").includes(wantMonth)) ?? dayBtn[0];
  if (!pick) return "no day button";
  pick.click();
  await sleep(400);
  return "picked " + target.toISOString().slice(0, 10);
})()`;

const EMMA_REVIEW = "/coach?section=check-ins&review=submission-emma";
const EMMA_NUTRITION =
  "/coach?section=clients&client=client-001&plan=nutrition";
const AMARA_PROFILE = "/coach?section=clients&client=client-007";
const AMARA_TRAINING =
  "/coach?section=clients&client=client-007&plan=training";
const CLIENT_APP = "/client?client=client-007";
const CHECKINS = "/coach?section=check-ins";
const TEMPLATES = "/coach?section=templates";

const FEEDBACK =
  "Great week, Emma. Keep the morning routine. Let's film your split-squat " +
  "setup on Thursday so I can check the knee.";

const PREVIEW_STEPS = (extraSteps = []) => [
  { waitFor: ".cd-template-card" },
  { evaluate: OPEN_STRENGTH_PREVIEW },
  { waitFor: ".cd-full-client-preview" },
  ...extraSteps,
];

// Client-app phone states capture the app shell (scroll column + floating
// bottom nav), excluding the demo topbar with the "Coach workspace" link.
// pinHeight keeps the shell at its live flex height once the ancestors are
// neutralized, so the absolute-positioned nav stays at the bottom edge.
const CLIENT_STATE = (name, steps) => ({
  name,
  viewport: "phone",
  url: CLIENT_APP,
  steps: [{ waitFor: ".cm-tabs" }, ...steps],
  select: ".cm-app",
  pinHeight: true,
});

export const STATES = [
  {
    name: "coach-overview",
    viewport: "desktop",
    url: AMARA_PROFILE,
    steps: [
      { waitFor: ".cd-main [role=tab]" },
      { waitFor: EXPR('!!document.querySelector(".ap-card")') },
      { delayMs: 400 },
    ],
    select: ".coach-root",
  },
  {
    name: "coach-timeline",
    viewport: "desktop",
    url: AMARA_PROFILE,
    steps: [
      { waitFor: ".cd-main [role=tab]" },
      { evaluate: CLICK_TEXT(".cd-main [role=tab]", "Timeline") },
      { waitFor: EXPR(
          'document.querySelectorAll(".apt-week").length > 0',
        ) },
      { evaluate: TIMELINE_EXPAND_WEEK },
      { waitFor: EXPR(
          'document.body.innerText.includes("Add deload")',
        ) },
      { delayMs: 600 },
    ],
    select: ".apt-canvas",
  },
  {
    name: "coach-training-draft",
    viewport: "desktop",
    url: AMARA_TRAINING,
    steps: [
      { waitFor: ".tr-editor .tr-week-nav" },
      { waitFor: EXPR('document.querySelectorAll(".tr-week-nav button").length > 1') },
    ],
    select: ".coach-root",
  },
  {
    name: "coach-training-activate",
    viewport: "desktop",
    url: AMARA_TRAINING,
    steps: [
      { waitFor: ".tr-editor" },
      { evaluate: REVIEW_ACTIVATE },
      { waitFor: DIALOG_OPEN },
      { delayMs: 400 },
    ],
    select: ".coach-root",
  },
  {
    name: "coach-training-active",
    viewport: "desktop",
    url: AMARA_TRAINING,
    steps: [
      { waitFor: ".tr-editor" },
      { evaluate: REVIEW_ACTIVATE },
      { waitFor: DIALOG_OPEN },
      { evaluate: ACTIVATE_PLAN },
      { waitFor: DIALOG_CLOSED },
      { delayMs: 500 },
    ],
    select: ".coach-root",
  },
  {
    name: "coach-checkins-queue",
    viewport: "desktop",
    url: CHECKINS,
    steps: [
      { waitFor: ".cd-calendar-stage" },
      { waitFor: EXPR('document.body.innerText.includes("Awaiting feedback")') },
      { delayMs: 300 },
    ],
    select: ".coach-root",
  },
  {
    name: "coach-checkin-typed",
    viewport: "desktop",
    url: EMMA_REVIEW,
    typing: { selector: ".cd-feedback-panel textarea", text: FEEDBACK },
    steps: [
      { waitFor: ".cd-feedback-panel" },
      { waitFor: EXPR('document.querySelector(".cd-feedback-panel textarea")?.value.length > 100') },
      { delayMs: 300 },
    ],
    select: ".coach-root",
  },
  {
    name: "coach-checkin-sent",
    viewport: "desktop",
    url: EMMA_REVIEW,
    typing: { selector: ".cd-feedback-panel textarea", text: FEEDBACK },
    steps: [
      { click: ".cd-submit-feedback" },
      { waitFor: EXPR('document.body.innerText.includes("Your feedback")') },
      { delayMs: 400 },
    ],
    select: ".coach-root",
  },
  {
    name: "tile-checkins",
    viewport: "desktop",
    url: CHECKINS,
    steps: [
      { waitFor: ".cd-calendar-stage" },
      { waitFor: EXPR('document.body.innerText.includes("Awaiting feedback")') },
      { delayMs: 300 },
    ],
    select: ".cd-calendar-stage",
  },
  {
    name: "tile-training-w1",
    viewport: "desktop",
    url: AMARA_TRAINING,
    steps: [{ waitFor: ".tr-editor .tr-week-nav" }],
    select: ".tr-editor",
  },
  {
    name: "tile-training-w2",
    viewport: "desktop",
    url: AMARA_TRAINING,
    steps: [
      { waitFor: ".tr-editor .tr-week-nav" },
      { evaluate: CLICK_TEXT(".tr-week-nav button", "Week 2") },
      { delayMs: 400 },
    ],
    select: ".tr-editor",
  },
  {
    name: "tile-nutrition-training",
    viewport: "desktop",
    url: EMMA_NUTRITION,
    steps: [
      { waitFor: ".cn-editor .cn-option-tabs" },
      { waitFor: EXPR('document.body.innerText.includes("Fat loss")') },
    ],
    select: ".cn-editor",
  },
  {
    name: "tile-nutrition-rest",
    viewport: "desktop",
    url: EMMA_NUTRITION,
    steps: [
      { waitFor: ".cn-editor .cn-option-tabs" },
      { evaluate: CLICK_TEXT(".cn-option-tabs [role=tab]", "Rest day") },
      { delayMs: 400 },
    ],
    select: ".cn-editor",
  },
  {
    name: "tile-progress",
    viewport: "desktop",
    url: TEMPLATES,
    steps: PREVIEW_STEPS([
      { evaluate: PREVIEW_VIEW("Desktop") },
      { evaluate: PREVIEW_NAV("Tracker") },
      { waitFor: VISIBLE(".cd-full-client-preview .ct-tracking") },
      { evaluate: PREVIEW_VIEW("Trends") },
      { waitFor: VISIBLE(".cd-full-client-preview .ct-trends-chart") },
      { delayMs: 800 },
    ]),
    select: ".cd-full-client-preview .ct-trends-chart",
  },
  {
    name: "templates-card",
    viewport: "desktop",
    url: TEMPLATES,
    steps: [
      { waitFor: ".cd-template-card" },
      { evaluate: TAG_STRENGTH_CARD },
    ],
    select: "[data-capture]",
  },
  {
    name: "templates-assign",
    viewport: "desktop",
    url: TEMPLATES,
    steps: [
      { waitFor: ".cd-template-card" },
      { evaluate: OPEN_STRENGTH_ASSIGN },
      { waitFor: DIALOG_OPEN },
      { delayMs: 400 },
    ],
    select: "dialog.v8-modal",
  },
  CLIENT_STATE("client-home", [
    { waitFor: EXPR('document.body.innerText.includes("TARGETS")') },
    { delayMs: 800 },
  ]),
  CLIENT_STATE("client-training", [
    { evaluate: CLIENT_TAB("Plans") },
    { waitFor: VISIBLE(".cm-navcard") },
    { evaluate: `(() => {
        const c = [...document.querySelectorAll(".cm-navcard")].find(
          (e) => /Training/.test(e.textContent));
        c?.click(); return Boolean(c);
      })()` },
    { waitFor: EXPR('document.body.innerText.includes("weeks")') },
    { delayMs: 800 },
  ]),
  CLIENT_STATE("client-tracker", [
    { evaluate: CLIENT_TAB("Tracker") },
    { waitFor: VISIBLE(".cm-day") },
    { evaluate: CLIENT_TRACKED_DAY },
    { waitFor: EXPR('document.body.innerText.match(/\\d+ of \\d+ logged/)') },
    { delayMs: 800 },
  ]),
  CLIENT_STATE("client-trends", [
    { evaluate: CLIENT_TAB("Tracker") },
    { waitFor: VISIBLE(".cm-day") },
    { delayMs: 900 },
  ]),
  CLIENT_STATE("client-nutrition-refeed", [
    { evaluate: CLIENT_TAB("Plans") },
    { waitFor: VISIBLE(".cm-navcard") },
    { evaluate: `(() => {
        const c = [...document.querySelectorAll(".cm-navcard")].find(
          (e) => /Nutrition/.test(e.textContent));
        c?.click(); return Boolean(c);
      })()` },
    { waitFor: VISIBLE(".cm-segwrap") },
    { delayMs: 800 },
  ]),
  CLIENT_STATE("client-plans", [
    { evaluate: CLIENT_TAB("Plans") },
    { waitFor: VISIBLE(".cm-navcard") },
    { delayMs: 700 },
  ]),
  CLIENT_STATE("client-checkins", [
    { evaluate: CLIENT_TAB("Messages") },
    { waitFor: VISIBLE(".cm-bub") },
    { delayMs: 800 },
  ]),
];
