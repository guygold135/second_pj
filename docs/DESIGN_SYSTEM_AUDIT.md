# Design System Audit — Inline Styles vs. designSystem.ts

Audit of `src/` for Tailwind classes that should use tokens from `src/styles/designSystem.ts`.  
Grouped by file: **Inconsistent** (different from design system), **Duplicating** (same intent, inline), **Missing** (no token exists).

---

## Design system reference (current tokens)

| Token | Purpose |
|-------|--------|
| `btn` | primary, secondary, danger, ghost, iconDanger, outline |
| `input` | base, error, select |
| `fieldError` | field error text |
| `alert` | error, success, warning |
| `modal` | backdrop, box, header, title, body, footer, closeBtn |
| `progress` | track, fill |
| `emptyState` | wrapper, icon, title, subtitle |
| `loadingState` | inline, box, spinner |
| `dragHandle` | drag handle |
| `card` | card container |
| `pageContainer` | page wrapper |
| `sectionTitle` | section heading |
| `focusRing` | focus utility |

---

## 1. App.tsx

| Type | Location | Issue |
|------|----------|--------|
| **Duplicating** | Error boundary reload button (~L126) | Inline `rounded-lg bg-cyan-600 px-4 py-2.5 ...` duplicates `btn.primary`. |

**Recommendation:** Use `className={btn.primary}`.

---

## 2. Layout.tsx

| Type | Location | Issue |
|------|----------|--------|
| **Inconsistent** | Header (~L30) | `bg-[#0f172a]/95` — no token for app shell background. |
| **Duplicating** | Nav links (~L48, L66) | `rounded-lg px-3 py-2 font-medium transition-all duration-200` + active/hover — could be a `navLink` / `navLinkActive` token. |

**Recommendation:** Keep header as-is or add `shell.header` if reused. Consider adding `navLink` / `navLinkActive` to design system if more navs appear.

---

## 3. SignIn.tsx

| Type | Location | Issue |
|------|----------|--------|
| **Good** | Error/success, inputs, primary buttons | Uses `alert.*`, `input.base`, `btn.primary`. |
| **Duplicating** | Card wrapper | Form uses `card` from design system; confirm no duplicate card class. |

**Recommendation:** No change needed for design system usage.

---

## 4. SignUp.tsx

| Type | Location | Issue |
|------|----------|--------|
| **Good** | Alerts, inputs, submit | Uses `alert.warning`, `alert.success`, `input.base`, `btn.primary`. |
| **Duplicating** | Password visibility toggle (~L97) | `rounded-lg p-1.5 text-gray-400 ... focus:ring-2 focus:ring-cyan-500/50` duplicates `modal.closeBtn` or a generic icon button style. |

**Recommendation:** Add `btn.ghost` or reuse `modal.closeBtn` for the toggle, or add `input.toggleBtn` if used in multiple forms.

---

## 5. ResetPassword.tsx

| Type | Location | Issue |
|------|----------|--------|
| **Good** | Loading, alerts, inputs, buttons | Uses `loadingState.*`, `alert.error`, `input.base`, `btn.primary`. |

**Recommendation:** No change.

---

## 6. Home.tsx

| Type | Location | Issue |
|------|----------|--------|
| **Good** | Create-task modal, primary/secondary buttons | Uses `modal.*`, `btn.primary`, `btn.secondary`. |
| **Duplicating** | “Learn More” link (~L172) | Inline `rounded-lg px-6 py-3 text-sm font-medium text-gray-300 underline ...` — no `link` or `linkSecondary` token. |
| **Duplicating** | Hero stat cards (~L179, L184) | `rounded-xl border border-gray-700/50 bg-gray-900/60` — similar to `card` but different border/opacity; uses `gray-900` instead of slate. |
| **Inconsistent** | Task cards (~L207) | `rounded-lg border-t-4 border-gray-800 bg-gray-900/80` — different from `card` (border-t-4, gray vs slate). |
| **Duplicating** | Create-task form inputs (~L276, 288, 300, 312) | Full input styles duplicated; should use `input.base` / `input.select`. |
| **Duplicating** | Feature cards (~L374) | `rounded-xl border border-gray-800 bg-slate-900/70 p-6 shadow-xl shadow-black/40` — very close to `card` (card has `/50` and `p-5`). |
| **Duplicating** | Testimonial cards (~L398) | `rounded-xl border border-gray-800 bg-gray-900/80 p-6` — again gray vs slate, no token. |
| **Duplicating** | CTA inputs + button (~L424–427) | Three inputs and submit — should use `input.base` and `btn.primary`. |

**Recommendation:** Use `input.base` / `input.select` for all form fields; use `card` for feature/testimonial blocks or add `card.variant` (e.g. `cardFeature`) if padding/shadow differ. Use `btn.primary` for CTA submit (already done). Add optional `link.secondary` for “Learn More”.

---

## 7. Dashboard.tsx

| Type | Location | Issue |
|------|----------|--------|
| **Duplicating** | Motivation quote banner (~L339) | `rounded-xl border border-cyan-500/30 bg-slate-900/60 px-4 py-3` — no `banner` or `quoteBanner` token. |
| **Duplicating** | Widget list items (e.g. ~L452, 493, 550, 575, 611, 634) | Repeated `rounded-lg border border-gray-800 bg-slate-800/50 px-3 py-2` — could be `listItem` or `widgetListItem`. |
| **Duplicating** | Stakes chip (~L526) | `rounded-lg border border-amber-500/40 bg-slate-800/60` — no `chip` or `stakeChip` token. |
| **Duplicating** | Add Widget panel (~L763) | `rounded-xl border border-gray-800 bg-slate-900/80 p-5` — same idea as `card`. |
| **Duplicating** | Widget type buttons (~L780) | `rounded-xl border border-gray-700 bg-slate-800/80 ... hover:border-cyan-500` — card-like selectable; no token. |
| **Duplicating** | “Add widget here” placeholder (~L1129) | Long inline class — could be `emptySlot` or `addSlot`. |
| **Duplicating** | Drag overlay (~L1151) | `rounded-xl border-2 border-cyan-500 ...` — no `dragOverlay` token. |
| **Inconsistent** | Edit toolbar size buttons (~L711) | `rounded px-2 py-0.5` + active state — different from `btn` sizes. |
| **Missing** | Section labels | Many “text-xs font-medium uppercase tracking-wider text-gray-400” — matches `sectionTitle` but not used. |

**Recommendation:** Use `sectionTitle` for widget section labels. Add optional tokens: `banner`, `listItem` / `widgetListItem`, `chip`, `emptySlot`, `dragOverlay` if you want full consistency.

---

## 8. Budget.tsx

| Type | Location | Issue |
|------|----------|--------|
| **Duplicating** | Motivation banner (~L269) | Same pattern as Dashboard quote — `rounded-xl border border-cyan-500/30 bg-slate-900/60 px-4 py-3`. |
| **Duplicating** | Period nav (~L296, 303, 307, 312, 318) | Select + prev/next + label — custom inline; could use `input.select` for select and a small `navGroup` token. |
| **Duplicating** | Timeframe section (~L335) | `rounded-xl border border-gray-800 bg-slate-900/60 p-5 shadow-lg` — same as `card` with different shadow. |
| **Duplicating** | Opportunity cost block (~L408) | `rounded-xl border border-gray-800 bg-slate-900/50 p-4` — card-like. |
| **Duplicating** | Investment profile modal (~L548, 558) | Backdrop + box + header built manually instead of `modal.*`. |

**Recommendation:** Use `card` for timeframe and opportunity blocks. Use `modal.backdrop`, `modal.box`, `modal.header`, `modal.closeBtn` for investment profile modal. Consider `banner` token for top quote.

---

## 9. BudgetSummaryCards.tsx

| Type | Location | Issue |
|------|----------|--------|
| **Duplicating** | Root container (~L38) | `rounded-xl border border-gray-800 bg-slate-900/60 p-5 shadow-lg shadow-black/30` — duplicates `card` (card has `/50` and `shadow-xl shadow-black/40`). |
| **Duplicating** | Title (~L41) | `text-xs font-medium uppercase tracking-wider text-gray-400` — same as `sectionTitle`. |

**Recommendation:** Use `card` and `sectionTitle` for root and title.

---

## 10. CategoryCard.tsx

| Type | Location | Issue |
|------|----------|--------|
| **Duplicating** | Root (~L22) | `rounded-xl border border-gray-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20` — card variant (p-4 vs card’s p-5). |
| **Duplicating** | Edit button (~L32) | `rounded p-1 text-gray-500 hover:bg-slate-800 ... focus:ring-2 focus:ring-cyan-500/50` — same idea as `btn.ghost`. |
| **Good** | Progress bar | Uses `progress.track` (fill uses custom color). |

**Recommendation:** Use `card` (or add `card.compact` with p-4) and `btn.ghost` for edit.

---

## 11. CategoryManager.tsx

| Type | Location | Issue |
|------|----------|--------|
| **Good** | Add button, submit/cancel, ColorSelect | Uses `btn.outline`, `btn.primary`, `btn.secondary`, `input.select`. |
| **Duplicating** | Dropdown list (~L88) | `rounded border border-gray-700 bg-slate-900 py-1 shadow-lg` — no `dropdown` or `listbox` token. |
| **Duplicating** | Dropdown item (~L94) | `px-3 py-2 text-left text-sm text-white hover:bg-slate-800`. |
| **Duplicating** | Inline edit inputs (~L177, 182, 192, 223, 233, 258, 267) | Mix of `rounded`/`rounded-lg`, `border border-gray-700 bg-slate-900` — should use `input.base` (and optionally a compact variant). |
| **Duplicating** | Category row (~L251) | `rounded-lg border border-gray-800 bg-slate-900/60 p-2`. |
| **Duplicating** | Edit/delete icons (~L280) | `rounded p-1 text-gray-500 hover:bg-slate-800` — `btn.ghost` / `btn.iconDanger`. |

**Recommendation:** Use `input.base` for all text/number inputs. Use `btn.ghost` and `btn.iconDanger` for row actions. Add optional `dropdown`, `dropdownItem` if reused elsewhere (e.g. Settings).

---

## 12. TransactionForm.tsx

| Type | Location | Issue |
|------|----------|--------|
| **Good** | All inputs, buttons | Uses `input.base`, `input.error`, `input.select`, `btn.primary`, `btn.secondary`. |

**Recommendation:** None.

---

## 13. TransactionList.tsx

| Type | Location | Issue |
|------|----------|--------|
| **Good** | Search + category filter | Uses `input.base`, `input.select`. |
| **Duplicating** | Sort group (~L82) | `flex rounded-lg border border-gray-700 bg-slate-900` — custom composite; no token. |
| **Duplicating** | Sort select + toggle (~L96, L105) | `rounded-l-lg border-0 bg-slate-900 ... focus:ring-1 focus:ring-cyan-500` and `border-l border-gray-700 px-2 py-2`. |
| **Duplicating** | List container (~L113) | `rounded-xl border border-gray-800 bg-slate-900/60`. |
| **Duplicating** | Row (~L121) | `p-3 transition hover:bg-slate-800/50`. |

**Recommendation:** Use `card` (or a list container token) for the list wrapper. Optional: `inputGroup` for sort row; no need for row token if only here.

---

## 14. StakeSetupModal.tsx

| Type | Location | Issue |
|------|----------|--------|
| **Good** | Modal shell, header, inputs, primary/secondary/danger buttons | Uses `modal.*`, `input.base`, `input.select`, `btn.primary`, `btn.secondary`, `btn.danger`. |
| **Duplicating** | Card summary line (~L248) | `rounded-lg border border-gray-700 bg-slate-800/40 px-3 py-2 text-sm text-gray-300`. |
| **Duplicating** | Failure mode options (~L427) | Border/background for selected state — could align with a generic “option card” token. |
| **Duplicating** | StakeBadge dropdown (~L574, 580, 587) | Panel + items — similar to CategoryManager dropdown; no shared token. |

**Recommendation:** Optional: add `summaryLine` and `optionCard` if reused. Otherwise leave as-is.

---

## 15. Settings.tsx

| Type | Location | Issue |
|------|----------|--------|
| **Good** | Container, trigger, search input | Uses `pageContainer`, `card`, `input.select`, `input.base`. |
| **Duplicating** | Dropdown (~L60) | `absolute ... rounded-lg border border-gray-700 bg-slate-900 py-2 shadow-xl` — same as CategoryManager dropdown. |
| **Duplicating** | Option row (~L84) | `flex w-full ... px-4 py-2.5 text-left text-sm hover:bg-slate-800` + selected state. |

**Recommendation:** Add `dropdown`, `dropdownItem`, `dropdownItemActive` and use in both Settings and CategoryManager.

---

## 16. Goals.tsx

| Type | Location | Issue |
|------|----------|--------|
| **Good** | Delete goal button | Uses `btn.iconDanger`. |
| **Duplicating** | Motivation banner (~L746) | `rounded-lg border border-purple-500/40 bg-slate-900 px-4 py-3` — Goals-specific color; no `banner` token. |
| **Duplicating** | GlowButton / “Create Your First Goal” | Blue primary buttons — intentional (Goals not using design system primary). |
| **Duplicating** | Empty state container (~L763) | `rounded-xl border border-gray-800 bg-slate-900/40 py-20` — same idea as `emptyState.wrapper` (different py). |
| **Duplicating** | Form blocks (~L771, 953, 992, 1062) | `space-y-3 rounded-lg border border-gray-800 bg-slate-900/70 p-3` — repeated form container; no token. |
| **Duplicating** | All text/number inputs | Many `rounded-lg border border-gray-700 bg-slate-900 px-4 py-3` with focus:blue or focus:purple — should use `input.base` / `input.error` and optionally a Goals-specific focus color or token. |
| **Inconsistent** | Focus colors | Goals use `focus:border-blue-500` / `focus:ring-blue-500` or purple; design system uses cyan. |
| **Duplicating** | Primary actions (~L881, 888, 984, 1034, 1142, 1149, 1412) | `rounded-lg bg-blue-600 py-2.5` or `border border-blue-500 bg-slate-800` — duplicate `btn.primary` / `btn.secondary` with blue. |
| **Duplicating** | Success message (~L1158) | `rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200` — same as `alert.success`. |
| **Duplicating** | Goal cards (~L1172) | `rounded-xl border ... bg-slate-900/70` + hover — card-like. |
| **Duplicating** | Small action buttons (Log Time, Timer, Update count, etc.) | Multiple `rounded-lg border border-gray-600 bg-slate-800 px-2.5 py-1.5 text-xs` — could be `btn.sm` or `btn.secondarySm`. |
| **Duplicating** | Add stake button (~L1374) | `rounded-lg border border-dashed border-amber-500/60 ...` — no token. |
| **Duplicating** | Log time modal (~L1430) | `rounded-2xl border border-gray-700 bg-slate-900 p-5` — could use `modal.box`. |
| **Duplicating** | Modal footer buttons (~L1532, 1539) | Cancel/Save — could use `btn.secondary` and `btn.primary`. |

**Recommendation:** Use `input.base` / `input.error` for all inputs; use `alert.success` for success message; use `modal.*` for Log time modal and `btn.primary` / `btn.secondary` in footer. Add optional `formBlock`, `btn.sm` / `btn.secondarySm`, `emptyState.wrapper` (with configurable padding) if you want full alignment. Goals can keep purple/blue for brand; document as intentional or add `btn.primaryGoals` if you want a token.

---

## 17. MyMissions.tsx

| Type | Location | Issue |
|------|----------|--------|
| **Good** | Drag handle, sidebar selected state | Uses `dragHandle`; cyan active state. |
| **Duplicating** | Motivation banner (~L1054) | `rounded-lg border border-cyan-500/10 bg-slate-800/50 px-4 py-3` — same banner pattern. |
| **Duplicating** | “Add mission” placeholder (~L1079) | `rounded-xl border border-dashed border-gray-700/80 bg-slate-900/30 ...` — similar to Dashboard “Add widget here”. |
| **Duplicating** | Form inputs (~L1096, 1104, 1128, 1229, 1246, 1267, 1286, 1298) | Many `rounded-lg border border-gray-700 bg-slate-800 px-4 py-2.5` — should use `input.base`. |
| **Duplicating** | Sort/filter row (~L1147) | `rounded-lg border border-gray-700 bg-slate-800 px-3 py-2`. |
| **Duplicating** | Category header (~L1212) | `rounded-lg border border-gray-700 px-4 py-2.5 ... hover:bg-slate-800`. |
| **Duplicating** | Success toast (~L1339) | `rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-4 py-3` — same as `alert.success`. |
| **Duplicating** | Drag overlay (~L1420) | `rounded-xl border border-cyan-500/20 bg-slate-900/95 px-4 py-3.5`. |
| **Duplicating** | Add stake (~L339) | Same dashed-amber pattern as Goals. |
| **Duplicating** | Delete category/goal in sidebar (~L131, L201) | `rounded-lg p-1 ... hover:bg-red-500/10 hover:text-red-400` — same as `btn.iconDanger`. |

**Recommendation:** Use `input.base` for all mission form inputs; use `alert.success` for success message; use `btn.iconDanger` for sidebar delete buttons. Consider shared `banner`, `emptySlot`, `dragOverlay` tokens with Dashboard/Budget.

---

## 18. OpportunityCost.tsx

| Type | Location | Issue |
|------|----------|--------|
| **Duplicating** | Tab buttons (~L432, 443) | `rounded-lg px-3 py-1.5 text-sm font-medium transition` + active state. |
| **Duplicating** | Badge (~L469) | `mt-1.5 inline-block rounded border px-2 py-0.5 text-xs font-medium` + accent color. |
| **Duplicating** | Primary button (~L565) | `rounded-lg px-4 py-2.5 text-base font-medium` — close to `btn.primary` (text-base vs text-sm). |

**Recommendation:** Use `btn.primary` for main action (or add `btn.primaryLg` with text-base). Add optional `tabs.tab`, `tabs.tabActive`, `badge` if reused.

---

## 19. UI components (glow-button, ripple-button, ethereal-shadow, glowing-effect)

| Type | Location | Issue |
|------|----------|--------|
| **N/A** | glow-button | Uses `.glow-btn` from index.css; no design system import. |
| **N/A** | ripple-button, ethereal-shadow, glowing-effect | Minimal or no Tailwind; no conflict with design system. |

**Recommendation:** No change unless you want glow-button to also use `btn.primary` as base and only add glow.

---

## Summary: What’s missing from the design system

| Missing token | Suggested name | Used in |
|--------------|----------------|--------|
| Top banner (quote / motivation) | `banner` or `bannerQuote` | Dashboard, Budget, MyMissions, Goals |
| List / widget item row | `listItem` or `widgetListItem` | Dashboard (multiple widgets) |
| Dropdown panel | `dropdown` | CategoryManager, Settings |
| Dropdown item | `dropdownItem` / `dropdownItemActive` | CategoryManager, Settings |
| Small secondary button (xs) | `btn.sm` or `btn.secondarySm` | Goals, various |
| Dashed “add” slot | `emptySlot` or `addSlot` | Dashboard, MyMissions |
| Drag overlay | `dragOverlay` | Dashboard, MyMissions |
| Option card (selectable block) | `optionCard` / `optionCardSelected` | StakeSetupModal, Goals tracking mode |
| Form block container | `formBlock` | Goals |
| Tab (pill) | `tabs.tab` / `tabs.tabActive` | OpportunityCost |
| Badge / chip | `badge` or `chip` | OpportunityCost, Dashboard stakes |
| Nav link (for header) | `navLink` / `navLinkActive` | Layout |

---

## Summary: Inconsistencies

- **Goals.tsx**: Uses blue/purple for focus and primary actions; rest of app uses cyan. Either document as intentional or add Goals-specific tokens.
- **Home.tsx**: Uses `gray-900` in places where design system uses `slate-900` (hero cards, task cards, testimonials).
- **Layout.tsx**: Header background is hardcoded `#0f172a`; no token.
- **Dashboard.tsx**: Edit mode size buttons use different padding (`px-2 py-0.5`) than standard `btn`.

---

## Summary: Duplications (use design system)

- **Buttons:** App.tsx reload → `btn.primary`. SignUp password toggle → `btn.ghost` or shared icon button. Goals/MyMissions many primary/secondary → `btn.primary` / `btn.secondary` (unless Goals keeps blue). OpportunityCost primary → `btn.primary`.
- **Inputs:** Home (modal + CTA), Goals (all forms), MyMissions (all forms), CategoryManager (all inline inputs) → `input.base` / `input.select` / `input.error`.
- **Cards:** BudgetSummaryCards, CategoryCard, Dashboard Add Widget panel, Budget timeframe/opportunity blocks, Goals form blocks and goal cards → `card` or new `card.compact` / `formBlock`.
- **Alerts:** Goals L1158, MyMissions L1339 → `alert.success`.
- **Modals:** Budget investment profile, Goals Log time modal → `modal.backdrop`, `modal.box`, `modal.header`, `modal.footer`, `modal.closeBtn`, `btn.primary`/`btn.secondary`.
- **Section titles:** Dashboard widget labels, BudgetSummaryCards title → `sectionTitle`.
- **Icon buttons:** CategoryCard edit, CategoryManager edit/delete → `btn.ghost`, `btn.iconDanger`. MyMissions sidebar delete → `btn.iconDanger`.

Applying the recommendations above will align the app with the design system and make future UI changes easier.
