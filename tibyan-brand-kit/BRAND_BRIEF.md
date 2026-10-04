# Tibyan (تبيان) — Brand Identity Brief

## 1. Project context
- **Tibyan** is an Arabic-language web app built for a hackathon on serving **Islamic content with AI**.
- The UI must be **RTL-first Arabic**. The identity must feel modern, minimalist, trustworthy, and clearly Islamic without clichés.
- Core brand idea: *"verified" Islamic knowledge (trust) delivered by AI.*

## 2. The logo (APPROVED / final)
The approved logo is the end state of the animated intro (`animation/tibyan-intro-*.svg`).

### Concept (keep this story consistent everywhere)
1. A **checkmark** = trustworthiness / reliability.
2. The checkmark is rotated to the left, duplicated, and the copy is mirrored horizontally. The two checkmarks together form the **open book (Quran)** silhouette.
3. Above the book sit **two diamond dots** = the two dots of the Arabic letter **ت (ta)**, the first letter of "تبيان".
4. The dots are gold (light of knowledge); the checks are white or gradient.

### Files (`logo/`)
| File | Use |
|---|---|
| `tibyan-logo-white.svg` | Transparent bg. White checks + gold dots. For turquoise, teal, blue, dark backgrounds. |
| `tibyan-logo-color.svg` | Transparent bg. Turquoise→blue gradient checks + gold dots. For light backgrounds only. |
| `tibyan-logo-mono-dark.svg` / `-mono-white.svg` | Single color (print, stamps, low-fidelity). |
| `tibyan-app-icon.svg` | Turquoise gradient rounded square with white mark. App icon / avatar / favicon source. |
| `../icons/*` | Ready PNGs: 16, 32, 48, 192, 512, 1024, `maskable-512.png`, `apple-touch-icon-180.png`, `favicon.svg`. |

### Exact geometry (512×512 grid; regenerate from this if needed)
- Group transform: `translate(256,256) scale(1.05) translate(-256,-297)`.
- Left check: polyline `98.1,266.6  234,330  150.6,368.9`; right check = same points mirrored (x → 512 − x): `413.9,266.6  278,330  361.4,368.9`.
- Stroke: width **32**, round caps, round joins. Base unit u = 16 (stroke = 2u, gap between checks ≈ 1u).
- Dots: 40×40 squares, rx 6, rotated 45°, centered at (221.7, 238) and (290.3, 238).
- Gold gradient: top `#FFF0B8` → bottom `#E0B450` (vertical).
- App icon: corner radius 112/512 (≈ 21.9%), background `linear-gradient(135deg,#19D6C4,#0A8F94 50%,#05495A)` plus a faint white radial glow at top-center.

### Rules
- Clear space around the mark: at least **2 stroke widths** (64 units on the 512 grid).
- Minimum size: mark 24 px wide; app icon 32 px. At 16 px use the app icon (dots merge on the bare mark).
- Never recolor the dots, never stretch/rotate/outline the mark, never add a network graphic or text inside the mark.
- White/gold version on dark or saturated surfaces; gradient version only on light surfaces (not on turquoise or blue).

### Animated intro (`animation/`)
- `tibyan-intro-white.svg` and `tibyan-intro-color.svg`: transparent, plays once (~5.5 s), then holds the final logo.
- Sequence: checkmark draws → cinematic light sweep + anamorphic flare → rotates left → mirrored copy flips into place → ta dots pop in.
- Pure CSS animation inside SVG, no JS. Use via `<img src>`; replay by re-creating the element or appending `?v=n`.
- Agent must: add a `prefers-reduced-motion` fallback that shows the static logo instead; test in Chrome, Safari and Firefox (the animation has not been verified in a real browser yet).

## 3. The motif system (decorative shapes)
**Only motifs are in scope — no repeating pattern, no network/graph graphics, no lattices.**

### Concept
The two ta-dots, multiplied and **connected** into chains. Rounded diamonds (the same shape as the dots) joined by smooth hourglass "necks" suggest a neural network / AI, while staying one calm, friendly shape. Small **gold satellite** diamonds float beside the chain with a constant gap, like sparks of intelligence.

### Construction rules (so new shapes stay on-brand)
- Nodes are rounded squares rotated 45° on one 45° lattice; corner radius is constant.
- Nodes connect **tip-to-tip** with a smooth fluid neck; satellites sit on the edge-adjacent lattice cells with a constant gap (≈ 13 on a 60-unit half-diagonal) and are never fused.
- Chain gradient: turquoise `#19D6C4` → blue `#14529E` (vertical for tall shapes, horizontal for wide, diagonal for square-ish). Satellites: gold gradient. Nothing else.

### Files (`motif/`)
| File | Shape | Suggested use |
|---|---|---|
| `shapes/…01-chain-3.svg` | vertical chain, 3 nodes + 2 gold satellites (the original, owner's favorite) | hero/splash side accent, onboarding |
| `…02-chain-2.svg` | short chain | small cards, empty states |
| `…03-line-3.svg` | horizontal line of 3 | under headings, section headers |
| `…04-corner.svg` | L-shaped chain | card or hero corner |
| `…05-hub.svg` | center node with 4 arms | "AI is thinking" / feature highlight |
| `…06-stairs.svg` | staircase | progress / steps illustrations |
| `…07-branch.svg` | T-shaped branch (mihrab feel) | landing/section accents |
| `…08-ta-dots.svg` | chain with two gold dots on top (the ta dots) | brand sign-offs, about page |
| `…09-graded.svg` | chain shrinking in size | loaders, transitions |
| `…10-divider.svg` | thin horizontal strip | dividers (weakest shape; enlarge or use sparingly) |
| `tibyan-motif-sprite.svg` | all shapes as `<symbol id="tibyan-01-chain-3">` … | `<svg><use href="#tibyan-05-hub"/></svg>` |
| `tibyan-motif-chain-mono.svg` | chain-3 in one color | print, single-color contexts |

Each file has unique gradient ids, so several can be inlined on one page safely.

### Usage rules
- **One motif per view or section**, used as an accent; never tiled, never repeated into a field, never joined to another motif into a graph.
- Place at an edge/corner or beside a heading; keep generous empty space around it.
- Do not put a motif next to the logo at the same size; the logo always leads.
- On photos or dark surfaces, a large motif may be used at low opacity (12–20 %) as a watermark.
- Gold satellites stay gold. Do not recolor the chain outside the tokens.
- Motion (optional): nodes may light up in sequence along the chain for loaders; reuse the `pop` easing from the intro.

## 4. Color — each color carries one idea
| Color | Token | Idea |
|---|---|---|
| Turquoise `#19D6C4` → `#0A8F94` → `#05495A` | `turquoise-300/500`, `teal-900` | **Islam / heritage** (tile-and-dome turquoise of Islamic architecture). The dominant brand color. |
| Blue `#14529E` (deep `#0F2A5C`) | `blue-600/900` | **Trustworthiness** (the checkmark). Gradient partner of turquoise. |
| Gold `#FFF0B8` → `#E0B450` | `gold-100/500` | **Knowledge / light**: the ta dots and motif satellites. Accent only. |
| Violet `#7B4FD6` | `violet-500` (optional) | **AI**. Owner's idea; not in the logo. If used, keep it a small accent (e.g. a corner glow), never a dominant color. |

Tokens: `tokens/design-tokens.json` and `tokens/tokens.css` (light + dark surfaces, gradients, radii, easing).

### Contrast (WCAG)
| Pair | Ratio | Result |
|---|---|---|
| `#FFFFFF` on `#19D6C4` | 1.83 | fails |
| `#0A2A33` on `#19D6C4` | 8.23 | AA |
| `#FFFFFF` on `#0A8F94` | 3.91 | AA large only |
| `#FFFFFF` on `#05495A` | 9.97 | AA |
| `#FFFFFF` on `#14529E` | 7.69 | AA |
| `#E0B450` on `#05495A` | 5.13 | AA |
| `#0A2A33` on `#EEF6F6` | 13.76 | AA |
| `#0A8F94` on `#FFFFFF` | 3.91 | AA large only |
| `#19D6C4` on `#061A21` | 9.73 | AA |

Implications: never put white text on `#19D6C4`; use `#0A2A33` text there. White text on turquoise-500 is for large text only. Body text on teal-900 or blue is fine in white.

## 5. Typography (suggested, not finalized)
- Arabic UI: **Tajawal** (500/700/800), used in the demo intro page. Fall back to system Arabic fonts.
- No approved wordmark yet: "تبيان" in Tajawal ExtraBold was used only as a placeholder. Do not treat it as final artwork.

## 6. Implementation checklist for the agent
1. Import `tokens/tokens.css`; build light/dark themes from it; set `<html lang="ar" dir="rtl">`.
2. Set favicon (`icons/favicon.svg` + PNG fallbacks), apple-touch icon, PWA manifest icons (192, 512, `maskable-512`).
3. App header uses `tibyan-logo-white.svg` or `-color.svg` depending on surface; app icon/avatar uses `tibyan-app-icon.svg`.
4. Splash/intro screen: `animation/tibyan-intro-*.svg` with reduced-motion fallback to the static logo.
5. Place motifs per section 3 (one per view). Use the sprite for inline use.
6. Primary buttons: turquoise-500/teal gradient with proper contrast; accents gold sparingly; links use `--tb-accent`.
7. Keep the visual language minimal: flat shapes, rounded corners, lots of white space, no extra ornament.
8. Verify contrast for every text/background pair against section 4.

## 7. Not decided yet / out of scope
- Final Arabic wordmark and typography.
- Whether to use the violet accent.
- Pattern and network graphics were **explicitly excluded** by the owner; do not add them.
