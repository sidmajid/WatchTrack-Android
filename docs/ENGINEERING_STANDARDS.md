# WatchTrack UI and Engineering Standards

These are the project-specific rules distilled from the two requested reference repositories. They apply to the website and to the Android APK because the APK packages the same web interface in a WebView.

## Upstream references

- [dickwu/apple-design-skill](https://github.com/dickwu/apple-design-skill) — begin with [SKILL.md](https://github.com/dickwu/apple-design-skill/blob/main/SKILL.md), then use its [HIG lookup](https://github.com/dickwu/apple-design-skill/blob/main/references/hig-lookup.md) to select relevant references. For cross-platform UI, the skill explicitly applies the foundations and design principles to web apps while reserving Apple-specific conventions for Apple platforms.
- [emilkowalski/skills](https://github.com/emilkowalski/skills) — relevant skills: [emil-design-eng](https://github.com/emilkowalski/skills/blob/main/skills/emil-design-eng/SKILL.md), [animate](https://github.com/emilkowalski/skills/blob/main/skills/animate/SKILL.md), [review-animations](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/SKILL.md), [animation-performance](https://github.com/emilkowalski/skills/blob/main/skills/animation-performance/SKILL.md), [mobile-native](https://github.com/emilkowalski/skills/blob/main/skills/mobile-native/SKILL.md), and [break-ui](https://github.com/emilkowalski/skills/blob/main/skills/break-ui/SKILL.md).

Consult the latest upstream instructions for substantial UI changes instead of assuming this summary captures every detail. Do not bulk-copy Apple HIG pages into the project.

## 1. Design intent and craft

- Identify the screen's primary job and the user's next action before changing its layout.
- Keep the existing WatchTrack visual language coherent. Use product-specific details rather than defaulting to a generic dashboard template or decorative effects without a purpose.
- Establish hierarchy through spacing, typography, alignment, contrast, and meaningful grouping. Remove decoration that does not help comprehension.
- Prefer concise, clear labels. Error messages should explain what happened and how the user can recover. Empty states should offer an appropriate next step.
- Review the flow across home, search, profile, title details, and episode tracking—not just the component in isolation.

## 2. Accessibility and responsive behavior

- Use semantic elements and native controls wherever practical. Every control needs an accessible name; inputs need visible labels or equivalent programmatic labels.
- Preserve keyboard access and visible focus. Do not make hover the only way to discover or operate a feature.
- Check contrast with actual color values; aim for WCAG AA (4.5:1 for normal text and 3:1 for large text and essential non-text UI).
- Keep layouts usable at narrow phone widths, in landscape, with long titles, translated labels, and larger text. Avoid fixed heights that clip content.
- Keep tap targets comfortably large (aim for at least 44 × 44 CSS px for web controls; use Android's applicable target guidance for native controls).
- Never disable pinch zoom. On mobile, avoid small input text that triggers browser zoom and account for dynamic viewport height and safe areas where the app uses edge-to-edge layouts.
- Provide clear loading, no-results, empty-library, offline/API-error, and failed-image states. Do not rely on color alone to communicate status.

## 3. Animation and interaction

Before adding motion, decide whether it serves feedback, spatial consistency, state indication, preventing a jarring content change, explanation, or rare delight. If no clear purpose exists, do not animate it.

- Reuse existing motion tokens and consult the upstream skills for exact curves and durations. Do not add a second token system.
- Avoid `transition: all`; list only the properties that should transition.
- Prefer `transform` and `opacity` for motion. Do not animate layout-triggering properties unless the interaction requires it and testing justifies the trade-off. Add `will-change` only after profiling or observing a concrete rendering issue.
- Do not start UI elements at `scale(0)`. Avoid sluggish `ease-in` UI interactions; use the relevant upstream guidance to choose responsive easing for the specific state.
- Keep frequent actions immediate. Keyboard-triggered actions and frequently repeated navigation should not acquire decorative delays or large transitions.
- Every motion change must include reduced-motion handling. Under `prefers-reduced-motion: reduce`, remove spatial/overshoot motion or replace it with a brief, less disruptive alternative while preserving state feedback.
- Gate hover-only effects with `@media (hover: hover) and (pointer: fine)`. Keep touch press feedback through an appropriate active state.
- Prefer CSS transitions/animations for simple predetermined motion; do not add a motion library just for a fade or button press.

## 4. Mobile web and Android WebView

- Treat touch, mouse, keyboard, and trackpad as potentially coexisting inputs. Use capability media queries rather than user-agent sniffing.
- Keep touch feedback immediate; use `touch-action: manipulation` where it fits the interaction.
- Use `100dvh`/ `100svh` where appropriate instead of relying blindly on `100vh`. Add safe-area insets only for layouts that need them.
- Keep input text readable on phones (16px is the practical web baseline for avoiding iOS focus zoom). Do not disable zoom as a workaround.
- Test on real Android hardware for final claims about keyboard behavior, scrolling, safe areas, and tap interactions. Browser emulation is useful but does not fully replace hardware testing.

## 5. Edge cases and resilience

When a change affects cards, lists, search, profile, or episode tracking, test realistic variations:
- very long but plausible movie/show titles and episode names;
- missing artwork, missing optional metadata, and failed network requests;
- empty, one-item, and many-item lists;
- large but plausible counts and durations;
- no search results, API rate/error responses, and offline loading;
- narrow screens, keyboard open, and reduced motion.

Prefer fixtures or test seams that exercise the same data path as production. Do not alter component markup just to make a test case appear to pass.

## 6. Code quality and release hygiene

- Keep `web/` canonical and synchronize its files into the Android assets directory; verify the copies are identical.
- Keep changes focused and preserve existing behavior unless the requested change intentionally changes it.
- Avoid new dependencies without a concrete need. Keep secrets and tokens out of source, logs, screenshots, archives, and APKs.
- Do not commit `.gradle/`, `build/`, `intermediates/`, local SDK data, or other machine-generated build caches. Publish only intended release artifacts.
- Before shipping, run JavaScript syntax checks, HTML/CSS checks, responsive browser checks, the Android debug build, and a focused animation review when motion changes.
- Distinguish automated checks from manual checks and real-device checks in the final report.

## Review output for UI or animation changes

For a review, give concrete, file-specific findings. When comparing a problem to a fix, use a **Before / After / Why** table rather than vague adjectives. State what works as well as what needs changing, and do not manufacture findings when the implementation is already sound.
