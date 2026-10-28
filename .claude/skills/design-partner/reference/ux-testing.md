# Composition and usability review

## Your own pass (every design)

Look at the desktop and mobile screenshots and answer briefly:

- **Where does the eye go first, second, third?** Is that the order that
  matters? Squint (or blur the screenshot) and see what survives.
- **Five-second clarity:** from the first screen alone, can a visitor say
  who this is, what it offers, who it's for, why to trust it, and what to
  do next? Each page should have one purpose and a specific main heading,
  not a slogan.
- **Readability:** body size, line length, contrast (WCAG 2.2 AA: 4.5:1
  body text, 3:1 large text and UI parts), line-height, and whether the
  type is tied to the scale.
- **Obstacles to use:** anything between the visitor and the main action.
  That includes extra steps, unclear labels, modals, cookie walls, tiny
  targets, and surprises.
- **Obstacles to adoption:** what would make someone hesitate to trust or
  return? Missing price, unclear next step, nothing showing a real person.
- **Spacing:** proximity groups, rhythm between sections, alignment, and
  whether every value comes from a token.

## When to use the ux-tester subagent

Use it for anything a user will interact with (forms, navigation, booking,
onboarding) and for any new page before it ships. Give it the route or
screenshots, the main task, and two or three personas from the `impeccable`
skill's `reference/personas.md`, plus a project-specific one where useful
(for this practice: "anxious first-time visitor on a phone, deciding
whether to make contact"). Run several in parallel, one per persona, when
the stakes justify it.

Report the findings to Owen ranked by impact, with your proposed fix for
each. Don't apply them silently.

## Before a new site or page launches

Check what visitors hit but design reviews miss: every link and form
(including what arrives in the inbox), mobile layouts, two or more browser
engines, keyboard-only use and visible focus, Core Web Vitals on a phone
(PageSpeed Insights), titles, descriptions and OG images, redirects,
sitemap, analytics, cookie controls, and third-party embeds. For search
and AI-answer visibility (FAQ sections, schema, clear service
descriptions), use the `searchfit-seo` skills rather than improvising.
