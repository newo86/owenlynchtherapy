# Owen's design taste

The running record of what Owen likes, dislikes and has decided about
design. The `design-partner` skill reads this before any design work, and
it outranks trends and defaults.

Lasting rules distilled from this log live in
[HOUSE-STYLE.md](HOUSE-STYLE.md), Owen's design system for every project.

**How to update it:** after Owen reacts to a design, add what the reaction
*revealed*, not the reaction itself. Write "prefers type-led heroes over
photo-led ones", not "liked v2". Put each point in the right section with
the month and a few words of context. If a new point contradicts an old
one, replace the old one. Don't keep both. If you're unsure what he
meant, ask before writing it down.

## Signature
Quiet, not loud. Excellent quality first. A small recurring detail is
welcome if it never shouts.
- Glass panels (frosted, translucent cards) over soft blurred colour blobs,
  and circles as the recurring shape (a soft circle tucked into a card's
  corner). He asked to keep both on the dashboard even though general rules
  discourage decorative blobs and glass: they are his, not a default
  (Oct 2026, dashboard mock-up).

## Likes
- Collaboration: being asked for his ideas, and seeing original directions
  proposed (Oct 2026, from the brief that set this up)
- Modern typographic sizing and generous, considered spacing (Oct 2026)
- Composition that guides the eye and reads easily (Oct 2026)
- Foundations first: tokens, components and a style guide before pages
  (Oct 2026)
- Status shown by importance: the one thing that needs attention leads, the
  rest is a calm checklist, rather than a grid of equal big-number cards
  (Oct 2026, Hours page review)
- "New" markers only when he asks for them, behind a switch, never always
  on (Oct 2026)
- Phone-first for the dashboard: he uses it between sessions on his phone
  (Oct 2026)
- On a therapist's phone home page, the therapist's photo leads: large,
  centred, with clear space under the header and the headline close beneath
  it, so face then headline read as one introduction. He asked for the
  reasoning to come from how the eye actually reads a page (research), not
  taste alone (Nov 2026, robbiesemple.com hero)
- Phone navigation as a bottom tab bar (icon + short label, current page in
  a filled pill) rather than a Menu button; he carried it from his own site
  to Robbie's (Nov 2026)
- Short phone heroes: drop secondary lines on phones rather than stack
  them, and keep paired buttons side by side (Nov 2026, robbiesemple.com)
- One alignment axis on phones: under a centred photo he chose a centred
  headline and centred buttons, and moved the intro paragraph further down
  the page. Asked to declutter, he kept both actions (Book + About) over a
  single-CTA version, so offer "calmer" before "fewer choices" (Nov 2026,
  robbiesemple.com, picked option A of four)

- The phone dashboard home is for the end of a session: today's clients
  (is their next session booked?), one Schedule button and his free times
  (marked weekly / every 2 weeks / once). No money, accreditation or forms
  there; those live behind the tab bar. He was firm about it: design phone
  screens from the moment of use, not by shrinking the desktop (Nov 2026)

- Phone screens must fit an iPhone 16 (393pt wide) with nothing off the edge
  and nothing needing a sideways scroll to reach a button. Use Apple's
  guidelines: 44pt touch targets, 16px text boxes (smaller makes Safari zoom
  in and the page feels cut off), safe-area insets, `dvh` not `vh`, wide
  tables as stacked cards. Check by loading the REAL pages in a phone-sized
  browser with pretend data and measuring overflow on every screen, not by
  eye on one screen (Nov 2026, dashboard)

- The phone dashboard is one calm system (Nov 2026, "apply it throughout, think
  Apple or Google design"): a plain title with no date, status pill or
  header buttons; one primary action per screen; full-width segmented
  controls; pop-ups as bottom sheets (grab handle, light header, one close
  button, no letter-spaced label); lists as compact cards, never tables;
  text 16px, captions 14px+, no tracked-out capitals, secondary text dark
  enough to read; rare actions as quiet text buttons. All of it lives in the
  phone blocks at the end of `src/components/admin/admin.css`.

- For the therapist app he plans to sell, he wants colour that is bold and
  art-led, not "calm therapy" muted: he named Hilma af Klint, Matisse's
  cut-outs and pop art. Calm should come from space and layout, not from
  grey-toned colour (Nov 2026, rejected three muted palettes: slate and
  yellow, plum and amber, oxblood and duck-egg)
- Of the art-led options he liked af Klint's composition (a big split
  circle in the header) with Matisse's colours (cobalt, lemon, coral, a
  touch of green, warm paper), and asked for buttons and controls to be
  less saturated than the art. So: full colour lives in the artwork only;
  everything you tap uses softened versions (Nov 2026, app palette)
- He then chose af Klint's own palette from "The Ten Largest" (No. 1 and
  No. 2): powder blue, burnt orange, deep navy, olive, pink, pale yellow,
  cream. Explored as one painting per tab (blue for Today, orange for
  Calendar) with two overlapping circles and an olive overlap as the icon.
  Shapes are drawn in her manner, never copied (Nov 2026, app palette)
- "It is an app, not a painting": art stays to ONE shape per screen (the
  split circle in the header) plus a soft sense of flow (a wavy header edge,
  one fine flowing line). No lines and circles everywhere. Current pick:
  the Coral room layout in the paintings' colours: soft orange header,
  circle in navy, pale yellow, powder blue and cream with an olive centre;
  dusky navy buttons, pale-yellow free times, powder-blue labels (Nov 2026)

- Design for how the user feels: a busy therapist, often bad with tech and
  admin. Every design is checked against Fitts, Hick, Jakob, proximity and
  Von Restorff, by name (Nov 2026, therapist app)

- Therapist app palette, his own (Nov 2026): pink #F7B4B5 as the main
  colour (70%), orange #EA7025 (20%), yellow #FBB807 (10%). Chose the soft
  version: pink header, blush page, and a softened yellow for the main
  button instead of orange; orange stays in the artwork and dots only.
  Text in a dark plum-brown, since none of the three is dark enough.
  Then: the softer yellow (#F6CB52) for the button, and orange removed
  completely, trying a soft green (#9FBF9A) or af Klint's powder blue
  (#AFC3DE) in its place. Also exploring a flower medallion (after af
  Klint's Ten Largest No. 2: heart petals in a ring of pink scallops,
  powder-blue edge) as the header motif and icon (Nov 2026). Rejected: in
  pink, soft rounded petal and heart shapes read as anatomical. Keep the
  motifs geometric (circles, halves, lines), especially on pink grounds

## Dislikes
- Palettes that "AI uses everywhere": forest or sage with terracotta and
  cream, lavender, mint and teal, navy and coral, muted greys with one
  accent (Nov 2026, app palette)
- Heavy, dark drop shadows under cards: he wants cards lifted, not
  floating (a hairline edge plus a short soft shadow), site-wide (Nov 2026,
  robbiesemple.com)
- Anything that looks AI-made, including common AI fonts and an eyebrow
  label over every heading (Oct 2026). See the skill's
  `reference/not-ai.md`.

## Decisions
- Owen's therapy site brand is fixed by CLAUDE.md and docs/STYLE-GUIDE.md.

## Open questions
- His therapy site uses Poppins and Montserrat, and small-caps eyebrow
  labels (docs/STYLE-GUIDE.md), which are both on his own avoid list. Does
  he want to revisit them on that site, or keep them as they are?
- Favourite sites or apps, and what he likes about each.
