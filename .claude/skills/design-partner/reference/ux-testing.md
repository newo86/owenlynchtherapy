# Composition and usability review

## Your own pass (every design)

Look at the desktop and mobile screenshots and answer briefly:

- **Where does the eye go first, second, third?** Is that the order that
  matters? Squint (or blur the screenshot) and see what survives.
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
