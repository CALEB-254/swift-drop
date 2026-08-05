# Styles

All global CSS lives here. `src/index.css` is only an entry point that imports
these files (in order) and then the Tailwind directives.

| File             | What it holds                                                                 |
| ---------------- | ----------------------------------------------------------------------------- |
| `tokens.css`     | Design tokens: HSL colour variables, gradients, shadows, radius, sidebar theme. Edit colours here — never hardcode colours in components. |
| `base.css`       | Global element defaults: border colour, body background/text, Poppins typography for headings. |
| `utilities.css`  | Reusable helper classes: `gradient-*`, `shadow-card/glow`, `animate-*`, `section-accent`, `input-accent`. |
| `animations.css` | `@keyframes` used by the animation utilities.                                  |

Notes
- Tokens are HSL triplets (`145 63% 42%`) so Tailwind can wrap them in `hsl(var(--token))`.
- Add a new colour: define it in `tokens.css` (light + `.dark`) and map it in `tailwind.config.ts`.
- Imports are inlined by `postcss-import` before Tailwind runs, so `@layer` / `@apply` work normally here.
