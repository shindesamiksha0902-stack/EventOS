---
name: Eventos Editorial Intelligence
colors:
  surface: '#fff8f7'
  surface-dim: '#e8d6d5'
  surface-bright: '#fff8f7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff0ef'
  surface-container: '#fceae8'
  surface-container-high: '#f6e4e3'
  surface-container-highest: '#f0dedd'
  on-surface: '#231919'
  on-surface-variant: '#564241'
  inverse-surface: '#382e2d'
  inverse-on-surface: '#ffedeb'
  outline: '#897271'
  outline-variant: '#dcc0bf'
  surface-tint: '#9f3e41'
  primary: '#9f3e41'
  on-primary: '#ffffff'
  primary-container: '#f98383'
  on-primary-container: '#711b21'
  inverse-primary: '#ffb3b1'
  secondary: '#615e57'
  on-secondary: '#ffffff'
  secondary-container: '#e7e2d8'
  on-secondary-container: '#67645c'
  tertiary: '#934844'
  on-tertiary: '#ffffff'
  tertiary-container: '#e88d87'
  on-tertiary-container: '#672624'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad8'
  primary-fixed-dim: '#ffb3b1'
  on-primary-fixed: '#410007'
  on-primary-fixed-variant: '#80272b'
  secondary-fixed: '#e7e2d8'
  secondary-fixed-dim: '#cbc6bd'
  on-secondary-fixed: '#1d1b16'
  on-secondary-fixed-variant: '#494740'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3ae'
  on-tertiary-fixed: '#3c0708'
  on-tertiary-fixed-variant: '#75312e'
  background: '#fff8f7'
  on-background: '#231919'
  surface-variant: '#f0dedd'
typography:
  display-lg:
    fontFamily: Noto Serif
    fontSize: 56px
    fontWeight: '400'
    lineHeight: 64px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Noto Serif
    fontSize: 36px
    fontWeight: '400'
    lineHeight: 44px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Noto Serif
    fontSize: 36px
    fontWeight: '500'
    lineHeight: 44px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Noto Serif
    fontSize: 28px
    fontWeight: '500'
    lineHeight: 36px
    letterSpacing: 0em
  headline-md:
    fontFamily: Noto Serif
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
    letterSpacing: 0em
  headline-sm:
    fontFamily: Noto Serif
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: 0.005em
  body-lg:
    fontFamily: Anybody
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: 0.01em
  body-md:
    fontFamily: Anybody
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0.01em
  body-sm:
    fontFamily: Anybody
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.015em
  label-lg:
    fontFamily: Archivo Narrow
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.04em
  label-md:
    fontFamily: Archivo Narrow
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.06em
  label-sm:
    fontFamily: Archivo Narrow
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.08em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  space-3xs: 0.125rem
  space-2xs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
  space-3xl: 4.5rem
  gutter-mobile: 1rem
  gutter-desktop: 1.5rem
  margin-mobile: 1rem
  margin-desktop: 2.5rem
---

## Brand & Style

This design system serves a dual-sided event intelligence platform catering to both discerning visitors and professional organizers. The brand marries the tactile grace of boutique hospitality print materials with the crisp utility of geographical exploration tools and modern operational software. 

The aesthetic philosophy balances warmth, restraint, and decisive typographic presence:
- **Human & Editorial:** Grounded in rich, literary serif typography, tactile paper textures, and generous breathing room. It avoids sterile corporate SaaS formulas, bright neon tech accents, and dark sci-fi HUD tropes.
- **Trustworthy & Architectural:** High-density event logistics, interactive maps, and agenda schedules are organized using deliberate baseline grids, crisp borders, and subtle contrast shifts.
- **Dual Perspective:** Visitor interfaces prioritize effortless discovery, atmospheric imagery, and serene narrative pacing. Organizer consoles provide high-information-density workflows, operational telemetry, and management dashboards without losing the warm, tactile materiality.

## Colors

The palette is rooted in an organic, parchment-and-ink sensibility, accented by an energetic coral highlight.

- **Primary (`#F98383` - Living Coral):** Reserved for primary interactive touchpoints, active category chips, map pinpoint highlights, live event badges, and critical calls-to-action.
- **Secondary (`#FCF6EC` - Warm Paper Canvas):** The foundational backdrop across all interfaces. Evoking archival heavy-stock paper, it softens ocular fatigue and establishes warmth.
- **Tertiary (`#450D0D` - Deep Oxblood):** Used for commanding headlines, high-contrast dark buttons, structural divider accents, and primary navigational framing.
- **Neutral (`#827473` - Warm Umber Grey):** Handles secondary captions, timestamps, microcopy, inactive borders, and structural grid rules.

### Functional Status Indicators
Operational and live monitoring metrics utilize muted, naturalistic tones to avoid visual friction against the warm backdrop:
- **Status Success (Operational / On Schedule):** `#2D6A4F`
- **Status Warning (Capacity / Delayed):** `#D97706`
- **Status Critical (Sold Out / Closed / Alert):** `#9E2A2B`
- **Surface Elevation (Card Container):** `#FFFFFF` (pure white for elevated surfaces resting on `#FCF6EC`)

## Typography

The typographic hierarchy establishes clear roles for editorial presence, interactive clarity, and dense data formatting:

- **Headlines (`Noto Serif`):** Conveys prestige, cultural depth, and editorial cadence. Headlines should embrace classical proportions with tight negative tracking on larger display instances.
- **Body & Interactive (`Anybody`):** A modern, highly flexible grotesque that remains human and readable across complex schedules, descriptions, and interactive elements without feeling sterile.
- **Labels, Metrics & Data (`Archivo Narrow`):** Used strictly for metadata tags, geo-coordinates, ticket categories, table figures, status pills, and system navigation markers. Archivo Narrow provides high vertical efficiency and condensed spatial utility for dense organizer metrics.

## Layout & Spacing

This design system uses a flexible 12-column grid system paired with strict rhythmic spacing scales based on an 8px root grid (with 4px and 2px micro-subdivisions).

- **Desktop (1024px+):** 12 columns, 24px gutters, 40px outer margins. Split-screen views (e.g., interactive map alongside a curated list or telemetry pane) anchor the interface into distinct, scroll-independent panels.
- **Tablet (768px - 1023px):** 8 columns, 20px gutters, 24px outer margins. Collapses multi-pane navigation into sliding sheets and expandable drawers.
- **Mobile (320px - 767px):** 4 columns, 16px gutters, 16px outer margins. Organizes complex multi-day schedules into sticky header tabs and horizontal carousels with fixed-bottom action docks.

Whitespace is structural: broad outer margins isolate dense modules to prevent cognitive fatigue during extended operational use.

## Elevation & Depth

Rather than relying on heavy drop shadows or generic digital blurs, elevation is expressed through tonal layering and warm-tinted ambient containment:

- **Base Layer (Ground):** `#FCF6EC` forms the global root surface.
- **Surface Layer (Cards & Panels):** `#FFFFFF` surfaces sit directly on the background, framed by a soft, hairline border (`1px solid rgba(130, 116, 115, 0.18)`).
- **Floating Overlays & Menus:** Layered elements use an ambient warm shadow tinted with oxblood: `0px 8px 24px -4px rgba(69, 13, 13, 0.08), 0px 2px 6px -1px rgba(69, 13, 13, 0.04)`.
- **Modals & Flyouts:** Deep scrim of `rgba(69, 13, 13, 0.4)` accompanied by elevated card styling: `0px 20px 40px -8px rgba(69, 13, 13, 0.16)`.
- **Map & Spatial Containers:** Map canvases are inset with a subtle inner edge line, keeping data legible against cartographic terrain without jarring contrasts.

## Shapes

The design uses a soft, architectural shape language (`level 1`), preserving crisp lines reminiscent of broadsheet periodicals, printed stationery, and modern cartography tools.

- **Base Radius (0.25rem / 4px):** Applied to form inputs, buttons, map pins, data cells, and inline status badges.
- **Card & Surface Radius (0.5rem / 8px):** Applied to content cards, modal containers, and navigation sidebars.
- **Sheet Radius (0.75rem / 12px):** Applied to mobile bottom sheets and high-level structural overlays.
- **Pill (Full Round / 9999px):** Applied exclusively to category filters, real-time status chips, and avatar markers.

## Components

### Buttons
- **Primary:** Filled `#F98383` with `#450D0D` typography for maximum clarity and warmth. Hover state darkens slightly to `#F76B6B`. Focus ring is `2px solid #450D0D` offset by `2px`.
- **Secondary (Oxblood):** Filled `#450D0D` with `#FCF6EC` text. Used for primary organizer actions and final confirmations.
- **Tertiary / Ghost:** Transparent surface, `1px solid rgba(130, 116, 115, 0.3)` border, `#450D0D` label text. On hover: background becomes `rgba(249, 131, 131, 0.08)`.

### Chips & Filters
- Compact horizontal elements with `label-md` typography.
- Inactive: `#FCF6EC` background, `#827473` text, `1px solid rgba(130, 116, 115, 0.25)`.
- Active: `#F98383` background, `#450D0D` text, zero border.

### Input Fields & Controls
- Form controls feature a `#FFFFFF` fill on the `#FCF6EC` canvas with a `1px solid rgba(130, 116, 115, 0.35)` border.
- Active focus transitions to a `1.5px solid #450D0D` perimeter without heavy glow rings.
- Checkboxes and Radio Buttons use `#450D0D` for selected glyph states and borders, with an optional subtle `#F98383` highlight on checked validation.

### Cards
- **Editorial Event Card:** Pure white background, `1px solid rgba(130, 116, 115, 0.2)` border. Features prominent `Noto Serif` event titling, clear date ribbons rendered in `Archivo Narrow`, and a designated slot for high-contrast category badges.
- **Organizer Metric Tile:** Pure white background, structured vertical baseline with tiny uppercase `Archivo Narrow` labels (`label-sm`), large numerals in `Anybody`, and concise status indicator dots.

### Navigation & Map Overlays
- **Floating Controls:** Map zoom, orientation controls, and floating layer selectors sit inside white modular card clusters anchored with subtle oxblood-tinted drop shadows.
- **Timeline/Schedule Rows:** Clean horizontal list items with dotted or fine hairline divider lines (`rgba(130, 116, 115, 0.15)`), distinct time markers in `label-lg`, and interactive hover treatments revealing venue locations and capacity thresholds.