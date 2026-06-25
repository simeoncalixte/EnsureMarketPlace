import { expect, userEvent, within } from '@storybook/test'

/**
 * Composable building blocks for Storybook `play` functions.
 *
 * The goal: stop hand-writing the same "find a control → click it → assert the
 * destination" dance in every story. Everything here is a small, deterministic
 * factory — give it a target/value and it returns a reusable function. Stories
 * then read as a declarative list of steps:
 *
 *   play: play(
 *     click(button(/create your workspace/i)),
 *     seeHeading(/create your workspace/i),
 *   )
 *
 * The factories (`button`, `click`, `seeHeading`, …) are pure: same arguments →
 * same closure, no shared mutable state. The returned steps perform the actual
 * DOM interaction/assertion when the story runs.
 */

export type Canvas = ReturnType<typeof within>

/** A single unit of work against the rendered story canvas. */
export type Step = (canvas: Canvas) => Promise<void>

/** What `play(...)` produces — assignable to a Storybook story's `play`. */
export type PlayFunction = (context: { canvasElement: HTMLElement }) => Promise<void>

/** Which match to take when a role+name query resolves to several elements. */
export type Nth = number | 'first' | 'last'

/** A control addressed by ARIA role + accessible name (optionally disambiguated). */
export type RoleTarget = {
  role: string
  name: RegExp | string
  /** When multiple elements match, pick this one (DOM order). Default: 'first'. */
  nth?: Nth
}

// ---------------------------------------------------------------------------
// Target builders — name a control by role.
// ---------------------------------------------------------------------------

/** Address a `<button>` (or role="button") by its accessible name. */
export const button = (name: RegExp | string, nth: Nth = 'first'): RoleTarget => ({ role: 'button', name, nth })

/** Address a link (`<a href>` / role="link") by its accessible name. */
export const link = (name: RegExp | string, nth: Nth = 'first'): RoleTarget => ({ role: 'link', name, nth })

/** Address any element by an explicit role + name. */
export const role = (role: string, name: RegExp | string, nth: Nth = 'first'): RoleTarget => ({ role, name, nth })

// ---------------------------------------------------------------------------
// Primitives — resolve and act on elements. Usable directly, or via the steps.
// ---------------------------------------------------------------------------

/** Wrap a story's `canvasElement` in a Testing Library canvas. */
export const canvasOf = (canvasElement: HTMLElement): Canvas => within(canvasElement)

const pickNth = <T,>(items: T[], nth: Nth): T | undefined => {
  if (nth === 'first') return items[0]
  if (nth === 'last') return items[items.length - 1]
  return items[nth]
}

/**
 * Resolve a {@link RoleTarget} to a single element, waiting for it to appear.
 * Throws a descriptive error if the requested occurrence is absent — surfacing
 * "found 0/2 at nth=last" instead of an opaque Testing Library failure.
 */
export async function findTarget(canvas: Canvas, target: RoleTarget): Promise<HTMLElement> {
  const { role, name, nth = 'first' } = target
  const matches = (await canvas.findAllByRole(role, { name })) as HTMLElement[]
  const element = pickNth(matches, nth)
  if (!element) {
    throw new Error(`No element for role="${role}" name=${String(name)} at nth=${String(nth)} (found ${matches.length})`)
  }
  return element
}

/** Click a resolved {@link RoleTarget}; returns the element that was clicked. */
export async function clickTarget(canvas: Canvas, target: RoleTarget): Promise<HTMLElement> {
  const element = await findTarget(canvas, target)
  await userEvent.click(element)
  return element
}

/** Assert a heading with the given accessible name is present. */
export async function expectHeading(canvas: Canvas, name: RegExp | string): Promise<void> {
  await expect(await canvas.findByRole('heading', { name })).toBeInTheDocument()
}

/** Assert a link resolves to `href` (without following it — right for plain anchors). */
export async function expectLinkTarget(
  canvas: Canvas,
  name: RegExp | string,
  href: string,
  nth: Nth = 'first',
): Promise<void> {
  const element = await findTarget(canvas, link(name, nth))
  await expect(element).toHaveAttribute('href', href)
}

// ---------------------------------------------------------------------------
// Steps — declarative wrappers over the primitives, for use inside `play(...)`.
// ---------------------------------------------------------------------------

/** Step: click a control. */
export const click = (target: RoleTarget): Step => async (canvas) => {
  await clickTarget(canvas, target)
}

/** Step: type `value` into the field labelled `label`. */
export const fill = (label: RegExp | string, value: string): Step => async (canvas) => {
  await userEvent.type(await canvas.findByLabelText(label), value)
}

/** Step: assert a heading with `name` is present (e.g. the destination page). */
export const seeHeading = (name: RegExp | string): Step => async (canvas) => {
  await expectHeading(canvas, name)
}

/** Step: assert arbitrary text is present. */
export const seeText = (text: RegExp | string): Step => async (canvas) => {
  await expect(await canvas.findByText(text)).toBeInTheDocument()
}

/** Step: assert text is NOT present. */
export const notSeeText = (text: RegExp | string): Step => async (canvas) => {
  await expect(canvas.queryByText(text)).not.toBeInTheDocument()
}

/** Step: assert a link points at `href` (no navigation — for plain `<a href>`). */
export const linkGoesTo = (name: RegExp | string, href: string, nth: Nth = 'first'): Step => async (canvas) => {
  await expectLinkTarget(canvas, name, href, nth)
}

/** Step: assert a role-addressed element carries `attribute=value`. */
export const seeAttribute = (target: RoleTarget, attribute: string, value: string): Step => async (canvas) => {
  const element = await findTarget(canvas, target)
  await expect(element).toHaveAttribute(attribute, value)
}

/** Step: assert a button is in the pressed/selected state (`aria-pressed="true"`). */
export const seePressed = (name: RegExp | string, nth: Nth = 'first'): Step =>
  seeAttribute(button(name, nth), 'aria-pressed', 'true')

// ---------------------------------------------------------------------------
// Composer — turn a list of steps into a Storybook `play` function.
// ---------------------------------------------------------------------------

/**
 * Compose steps into a `play` function, run in order against the story canvas.
 *
 *   play: play(click(link(/register/i)), seeHeading(/create your workspace/i))
 */
export const play = (...steps: Step[]): PlayFunction => async ({ canvasElement }) => {
  const canvas = canvasOf(canvasElement)
  for (const step of steps) {
    await step(canvas)
  }
}
