# WatchTrack Agent Instructions

These rules apply to every change to the WatchTrack website, Android WebView app, UI, animations, documentation, screenshots, and release workflow. Read this file before editing.

## Required design references

Use these upstream sources as working references, not as vague inspiration. Consult the latest version of the relevant skill before substantial UI or animation work; load only the sections that apply to the screen or interaction.

- [Apple Design Skill](https://github.com/dickwu/apple-design-skill/blob/main/SKILL.md) — use its design-review process and relevant foundational references for accessibility, layout, typography, color, writing, motion, and privacy.
- [Emil Kowalski: Design Engineering](https://github.com/emilkowalski/skills/blob/main/skills/emil-design-eng/SKILL.md) — product-specific polish, interaction feedback, and animation decisions.
- [Animate](https://github.com/emilkowalski/skills/blob/main/skills/animate/SKILL.md) — consult before adding or changing motion.
- [Review Animations](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/SKILL.md) — review every meaningful motion change.
- [Animation Performance](https://github.com/emilkowalski/skills/blob/main/skills/animation-performance/SKILL.md) — use when motion affects performance or when choosing animated properties.
- [Mobile Native](https://github.com/emilkowalski/skills/blob/main/skills/mobile-native/SKILL.md) — use for touch, viewport, hover, input, and safe-area behavior.
- [Break UI](https://github.com/emilkowalski/skills/blob/main/skills/break-ui/SKILL.md) — stress-test changed screens with plausible edge-case data.

Do not copy entire upstream repositories or Apple HIG text into this project. Link to upstream material and record the project-specific application in [docs/ENGINEERING_STANDARDS.md](docs/ENGINEERING_STANDARDS.md).

## Platform interpretation

WatchTrack is a web app packaged in an Android WebView. Apply the Apple Design Skill's cross-platform foundations and design principles; **do not impose Apple-only navigation or control conventions on Android**. Use familiar web behavior and Android conventions where they fit.

## Non-negotiable workflow

1. Inspect the existing implementation, shared tokens, navigation, data flow, and responsive states before changing them.
2. State the user's task and the reason for the change in implementation notes or the commit description. Keep changes scoped; avoid unrelated rewrites.
3. Prefer semantic HTML, native controls, and existing dependencies. Do not add a library for a small effect that CSS or the platform already supports.
4. Treat accessibility, loading, empty, error, and reduced-motion states as part of the feature—not follow-up polish.
5. Keep `web/` as the website source of truth and synchronize its files into `WatchTrack-Android/app/src/main/assets/www/`. Verify the two directories match after synchronization.
6. Never commit API tokens, private watch history, machine-specific files, Gradle caches, or generated build intermediates. Only publish the intended APK/release artifacts.
7. Run the relevant checks before committing, and report exactly what passed, what was not tested, and any remaining limitations. Never claim real-device testing unless it happened.

## Required UI and motion checks

- Follow the decision process: should it animate, what user-facing purpose does it serve, how often is it used, what is the cheapest suitable implementation, and how will reduced-motion users experience it?
- Reuse the project's existing motion tokens. Do not invent parallel easing or duration systems.
- Do not use `transition: all`, animate layout properties without a compelling measured reason, start an element at `scale(0)`, or use sluggish `ease-in` easing for UI interactions. Prefer explicit properties and compositor-friendly `transform`/ `opacity`; measure before adding `will-change`.
- Use motion sparingly for high-frequency and keyboard-triggered actions. Entrances should respond immediately; movement should have a clear purpose and remain interruptible when appropriate.
- Include `prefers-reduced-motion` handling with the change. Gate hover-only effects using pointer/hover capability media queries; provide press feedback for touch.
- Never disable browser zoom. Keep inputs usable on phones, use dynamic viewport units where appropriate, and do not detect device types from user-agent strings when CSS capability queries suffice.

## Verification expectations

For website/UI changes, run the available JavaScript syntax checks, inspect HTML/CSS, and test at a narrow phone width and a desktop width. Check keyboard navigation and visible focus, labels/accessible names, empty/error/loading states, reduced motion, and realistic long titles/counts/missing artwork. Use browser automation when available.

For Android changes, build the debug APK with the project's configured Java/Gradle/Android SDK versions and confirm the website assets in the APK match `web/`. Test on a real Android device when available; if not, say that hardware behavior remains unverified.

For animation changes, perform a focused review against the linked `review-animations` rules. For changes to rendered cards, lists, search, profile, or episode tracking, use realistic worst-case data based on the actual data shape and test the empty and one-item states too.

For every commit, give a concise summary of the changed behavior, checks performed, and any checks that could not be run.
