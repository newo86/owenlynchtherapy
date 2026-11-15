<!-- Owen's house design system. Mirrored at https://claude.ai/artifact/TgXhFUSxm3PWgrLAgEM7zU
     (the browsable version, with tokens and live component previews per project theme).
     Change both together: this file is the copy repo sessions read. -->

# Owen's house style

Owen's house style for every website and app he designs: his own practice site, Robbie Semple's, Shannon Egan's and anything new. The rules are shared; each project brings its own palette and fonts as a theme (`robbie`, `owen`, `shannon`, and `dashboard` for Owen's practice dashboard). Start a new project by adding a theme with the same token names, then follow everything below without being asked.

Every rule here comes from a change Owen asked for at least once. The section "Where the rules came from" lists them.

## How to use this system

- Read this page before any design or front-end work for Owen. It outranks your defaults and any trend. Owen's words in the conversation outrank it.
- Build from the tokens. A value the page needs that isn't here goes into the project's tokens first (CSS custom properties on `:root`, or Tailwind v4 `@theme`), never as a one-off.
- Design phones first. Owen checks every change on his iPhone, often at night. Screenshot at 390px and 320px, and at 1440px, before showing anything.
- Show before shipping. Make the change, send screenshots, and merge only when Owen says so. For a visual choice with no clear answer, offer three or four real mock-ups rendered from the project's code, each with one sentence of reasoning, and say which you'd pick.
- Explain choices with how people actually read pages (eye-tracking, proximity, alignment), in plain words. Owen asks for the reasoning, not just the result.

## Principles

1. **One person, not a brand.** The therapist's real photo and words lead. Decoration serves them and never competes.
2. **Calm beats clever.** When asked to declutter, first make it calmer (one alignment, more space, fewer lines); keep the visitor's choices unless Owen asks for fewer.
3. **Space is the message.** Little on screen at once. Proximity carries meaning: space inside a group is always smaller than space between groups.
4. **One axis per screen on phones.** A centred photo means a centred headline and centred buttons. Never mix a centred image with left-aligned text beneath it.
5. **Quiet, never shouting.** Light shadows, slow motion, no hard edges, no tracking. One small memorable detail per page is welcome if it never shouts.
6. **Nothing looks AI-made.** A designer should see decisions, not defaults.

## Colour

- Page ground is `surface`; heroes, headers and quiet bands are `surface-band`; cards are `surface-raised`. All three are warm off-whites. Never use pure white or pure black.
- Set all text in `ink` (headings and body) or `ink-soft` (intro lines, secondary text) on those three grounds. Body text is never near-black: use the brand's warm dark.
- `action` is for the one call to action (Book), ring links and the active tab only. In the `owen` and `shannon` themes a filled button with `on-action` text needs a 19px semibold or larger label to pass contrast; prefer the ring link there.
- `accent` is decoration only: motifs, dividers, the dotted thread, bullets. Never text, never a button.
- `surface-deep` carries brand-coloured bands (facts strip, Owen's forest hero, the active tab pill) with `on-deep` text.
- Hairlines use `line`. Keyboard focus is a 2px solid `focus` ring, 3px offset, on everything interactive.
- No tints on cards, no gradients behind text, no purple-to-blue anything.

## Type

- Each theme has a heading face and a body face (see Typography). Robbie's adds one handwritten face (`robbie-script`) for one or two words in a heading or a card title, never a sentence.
- Body text is 17-19px on the web (Owen's site 16-18px), leading about 1.6, measure at most `measure`. Never below 16px on phones. All reading text in a project sits at one size: cards, labels and contact lines don't drop smaller.
- Small text (12-15px) is for captions, meta and the legal line only, and stays at full `ink` strength. Never fade it to grey.
- **No letter-spacing** on headings, buttons, nav or labels. Tracked-out caps were removed from every project. The one exception is a brand wordmark that already has it (Owen's "Psychotherapy").
- **No eyebrow labels** above headings. One heading per box; a script title is a real heading, not a styled span.
- Headings use `text-wrap: balance`, paragraphs `text-wrap: pretty`: no lone last words.

## Layout and spacing

- Use the `space-*` steps. Phone gutter is `space-s` (20px from 375px wide). Sections are `space-2xl` apart on phones, `space-3xl` on desktop.
- Lay groups out with flex or grid `gap`, not margins between siblings.
- Sections meet softly. A band's edge, a hill against mist or a hard colour cut between sections reads as abrupt; use space, a gentle curve or a shared ground instead.
- No visible breadcrumbs. No redundant links: if the tab bar or header already offers a page, the hero doesn't repeat it as a separate row.
- Close leftover gaps. When a decoration is removed (a dotted line, a backdrop), remove the space it occupied too.

## Phone patterns (below `phone-break`)

- **Bottom tab bar** for navigation (`TabBar`): up to five tabs, outline icon over a short uppercase label, the current page in a `surface-deep` pill (`radius-m`) with `on-deep` text. The header keeps only the logo and a "Book now" ring link. Tablets keep a Menu button that opens a native popover; desktop keeps the top navigation.
- **Hero** (`PhoneHero`): the therapist's photo first, centred, `phone-photo` wide in a 4:5 crop with `shadow-photo`, `space-xl` below the header and `space-l` above the headline. Then the headline, centred. Then the two ring links side by side, centred. The intro paragraph and credentials line move further down the page (the "Working together" card and the footer). Keep the face and the start of the headline on the first screen, down to 320px.
- **Paired buttons stay on one line** from 320px up: shrink their padding and type a step on small screens rather than stacking them.
- **Tap targets** are at least `tap-target` tall, at least `space-xs` apart, under `(pointer: coarse)`.
- Drop secondary lines on phones rather than stacking them (Owen removed "Online therapy for adults living anywhere in Ireland" from Robbie's phone hero).
- Pages pad their bottom by `tabbar-height` plus the safe-area inset so the footer clears the tab bar.

## Cards and elevation

- Cards are `surface-raised`, `radius-none` (square), `shadow-card`: lifted, not floating. No hover lift, no gradient borders, no coloured left stripe, no tints.
- Use a card only when the content is a real object (a topic, a credential list, a crisis note). Plain sections need no box.
- Photos get a warm-white border and `shadow-photo`. Never a heavy drop.
- The sticky header has no dividing line; `shadow-header` fades in once the page scrolls.

## Links and buttons

- The main call to action is a hand-drawn loop around a word (`RingLink`) or a solid `action` button. One primary action per section.
- The current page in a navigation is shown by shape (loop, pill, weight), never by colour alone.
- Labels say exactly what happens: "Book a session", "Book now", "About me". Not "Learn more".

## Motion

- Motion is slow, small, and stops. Breathing motifs use `duration-ambient`; reveals use `duration-reveal`; hover uses `duration-ui`.
- CSS only: transform and opacity, scroll-driven animations (`animation-timeline: view()`) behind `@supports`, each in its own composited layer so nothing flickers or repaints the page. No scroll listeners, no animation library.
- Everything sits still under `prefers-reduced-motion: reduce`, and the page reads completely before anything moves.

## Images

- Real photography of the therapist, never stock (no hands on mugs, no stacked stones on beaches). Bespoke line drawings and motifs from the brand (leaves, ripples, a dotted thread) are welcome.
- Serve photos through the framework's image pipeline as AVIF and WebP at several widths with accurate `sizes`. The hero portrait gets `fetchpriority="high"`; everything below the fold lazy-loads.
- Every meaningful photo has alt text that describes the person ("Robbie Semple, smiling, in a navy jacket"), and no wrapper hides it from screen readers.

## Copy

- Warm, honest, human, in the therapist's own voice. No wellness buzzwords ("journey", "healing space", "thrive", "elevate", "unlock"), no promised outcomes, stigma-free language.
- No em dashes in anything a visitor reads. Use full stops, commas or colons.
- Straight quotes in articles. Every word earns its place; no intros that repeat the heading.

## Accessibility

- WCAG 2.2 AA: 4.5:1 text contrast (3:1 at 24px, or 19px bold), visible focus, 44px targets, works without JavaScript, `lang` set, skip link.
- Native elements first: a `<button>` with `popover` for menus, `<details>` only for FAQ accordions.
- Check with axe at 390px and 1440px before shipping; zero violations is the bar.

## Dashboards and tools

Owen's practice dashboard (theme `dashboard`) is a tool he uses between sessions, mostly on his phone. It keeps his signature and follows these rules:

- **His signature lives here:** frosted glass cards (`surface-raised` with a 16px backdrop blur, `shadow-glass`) over a few soft colour blobs, each card with a `circle-tint` circle tucked into its bottom-right corner. Paint the circle in the card's background so nothing inside is ever clipped. Not on public sites.
- **Status by importance.** The one thing that needs attention leads; the rest is a calm checklist. No grid of equal big-number cards.
- **Today first:** next session, today's list, needs attention, this week. A timed week calendar on desktop, a vertical day agenda on phones.
- **Sentence-case labels.** No orange capitals over headings, no wide letter-spacing anywhere.
- **Phone-first:** 44px targets, a thumb-reachable floating action for the main task, modals centred and scrollable.
- **"New" markers** only when Owen asks for them, behind a switch, never always on.
- **Privacy mode** blurs client names and identifying details for screen-sharing; every new client-facing field gets the `.pii` class.
- Category colours (`category-lilac`, `category-gold`, sage, terracotta) always pair with a word or icon.
- Money and counts use `font-variant-numeric: tabular-nums`, and large figures scale to their card instead of overflowing.

## Owen's own site: where it differs today

Owen's site (theme `owen`) keeps its fixed brand (forest, sage, terracotta, gold, linen; Avenir/Montserrat headings, Poppins body). Applied to it, the house rules would change these, each only when Owen asks:

- Small-caps eyebrow labels on About, Services, Articles, Contact and FAQ; tracked capitals in the footer headings and the pill nav labels.
- Service cards lift on hover and have an animated conic-gradient border.
- Em dashes in About page copy and some labels.
- `ink-soft` text in places uses Tailwind grey (`text-gray-400`/`500`) rather than a warm brand tone.

Keep the "Psychotherapy" wordmark's tracking: it is part of the logo.

## Never

- Heavy or dark drop shadows; hover lift on cards; glass or blur on public sites (glass panels and corner circles belong to Owen's dashboard only).
- Tracked-out caps, eyebrow labels, em dashes, breadcrumbs.
- A centred photo over left-aligned text; buttons stacked on phones when they fit side by side.
- Hard edges between sections; decorative gradient blobs; floating circles behind content.
- Stock photos; emoji as icons; identical icon-card grids; testimonial carousels.
- Shipping without screenshots, or merging without Owen's yes.

## Adding a project

1. Add a theme to `tokens.json` with every colour token above filled from the brand's own values. Derive missing roles (`ink-soft`, `action-hover`) and say so in the usage note.
2. Add a type group with the brand's heading and body faces at this system's sizes.
3. Check every text pair at 4.5:1 and flag any brand colour that misses rather than re-tinting it.
4. Build the phone tab bar, the phone hero and square soft cards from the start.

## Where the rules came from

Each rule in this system is a change Owen asked for, often more than once and across projects. When a rule here and a new request disagree, the new request wins and this page gets updated.

| Rule | What Owen asked for | Project, when |
| --- | --- | --- |
| No letter-spacing | Removed tracking from headings, then buttons and labels, then nav links, then the whole dashboard; kept it only on the "Psychotherapy" wordmark | Owen's site, May-Jun 2026 (four separate changes) |
| No em dashes | Removed every em dash from visible copy | Shannon's site Jul 2026; Owen's service pages May 2026; Robbie's site Oct 2026 |
| Bigger body text | 18px body site-wide on Shannon's; body raised a step on Robbie's ("easier to read"); 16px base on his own | Shannon Jul 2026; Robbie Nov 2026; Owen Jun 2026 |
| No eyebrow labels | Dropped eyebrows on Kevin's 40th menu page and over Robbie's inner-page headings; listed in his "not AI-made" rules | Kevin Oct 2026; Robbie Oct 2026 |
| One heading per box, readable small print | Label-over-heading pairs became one heading; small print at full strength | Robbie, Oct 2026 |
| Bottom tab bar on phones | Built for his site, then carried to Robbie's | Owen May 2026; Robbie Nov 2026 |
| Photo first, centred, bigger, with room under the header | Asked step by step: photo above the headline, centred, larger, space above it, closer to the headline | Robbie, Nov 2026 |
| One alignment axis | Picked "centred and calm" (option A of four) | Robbie, Nov 2026 |
| Keep both actions | Chose two buttons over the one-button version when decluttering | Robbie, Nov 2026 |
| Buttons side by side | "They look weird stacked on top of each other" | Robbie, Nov 2026 |
| Drop secondary lines on phones | Removed "Online therapy for adults living anywhere in Ireland" on phones only | Robbie, Nov 2026 |
| Light shadows | "Reduce this dark shadowing on boxes and cards throughout the site" | Robbie, Nov 2026 |
| Flat, square cards | Square corners, hairline shadow, no hover lift, pink tint removed | Robbie, Oct 2026 |
| Soft section edges | Removed a hills backdrop because "the hard edge where the hills met the mist looked abrupt" | Shannon, Aug 2026 |
| Calm, CSS-only motion | Ripples slowed and stopped; flicker removed; no JavaScript; one gentle motion language | Robbie Oct 2026; Shannon Aug 2026; Owen Jun 2026 (framer-motion removed) |
| Thumb-sized targets | 44px tap height on touch screens | Robbie, Oct 2026 |
| No breadcrumbs | Removed visible breadcrumbs from articles and service pages | Owen, May 2026 |
| No redundant links | Dropped the Contact nav link (the button already covers it) | Shannon, Jul 2026 |
| No hidden photo descriptions, fast photos | Home photo readable by screen readers; AVIF and WebP at phone sizes | Robbie, Nov 2026 |
| Status by importance | The one thing that needs attention leads; the rest is a calm checklist | Owen's dashboard, Oct 2026 |
| Glass and circles: dashboard only | Kept glass panels and soft circles on his dashboard as his own signature; removed floating circles from the public site | Owen, May and Oct 2026 |
| Show first, then merge | Every change previewed with screenshots; mock-ups for open choices | All projects |
| Reasoning from research | Asked for eye-tracking and design research to back layout choices | Robbie, Nov 2026 |

Owen's running taste notes live in `docs/design/TASTE.md` in the owenlynchtherapy repository; this system is the distilled, reusable form of them.
