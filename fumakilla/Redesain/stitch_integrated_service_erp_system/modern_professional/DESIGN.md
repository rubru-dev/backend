---
name: Modern Professional
colors:
  surface: '#f9faf1'
  surface-dim: '#d9dbd2'
  surface-bright: '#f9faf1'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4ec'
  surface-container: '#edefe6'
  surface-container-high: '#e8e9e0'
  surface-container-highest: '#e2e3db'
  on-surface: '#1a1c17'
  on-surface-variant: '#42493d'
  inverse-surface: '#2f312c'
  inverse-on-surface: '#f0f1e9'
  outline: '#73796c'
  outline-variant: '#c2c9ba'
  surface-tint: '#3f692d'
  primary: '#0a3000'
  on-primary: '#ffffff'
  primary-container: '#1f470f'
  on-primary-container: '#88b671'
  inverse-primary: '#a4d48c'
  secondary: '#5d5f5f'
  on-secondary: '#ffffff'
  secondary-container: '#dfe0e0'
  on-secondary-container: '#616363'
  tertiary: '#3e2100'
  on-tertiary: '#ffffff'
  tertiary-container: '#5d3400'
  on-tertiary-container: '#f49100'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#bff0a5'
  primary-fixed-dim: '#a4d48c'
  on-primary-fixed: '#052100'
  on-primary-fixed-variant: '#285017'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#ffdcbe'
  tertiary-fixed-dim: '#ffb870'
  on-tertiary-fixed: '#2c1600'
  on-tertiary-fixed-variant: '#693c00'
  background: '#f9faf1'
  on-background: '#1a1c17'
  surface-variant: '#e2e3db'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  gutter: 16px
  margin: 24px
---

# Design System

## Brand & Style
The brand identity is rooted in reliability and precision, shifting from its previous warm, organic tone to a crisp, professional, and tech-forward aesthetic. It utilizes a **Corporate / Modern** design style, prioritizing clarity and functional elegance. The target audience includes professionals who value efficiency and trust. The visual language is defined by high-contrast primary elements, clean Inter typography, and subtle rounded corners that bridge the gap between technical rigor and user-friendly accessibility.

## Colors
The color palette has transitioned to a sophisticated high-contrast scheme. The **Primary Color** is a deep, authoritative Forest Green (#1f470f), used for core branding and high-priority actions. The **Secondary Color** is pure White (#ffffff), emphasizing clean backgrounds and spacious layouts. An energetic **Tertiary Color** of Amber (#FF9800) provides a functional accent for highlights or status indicators. Neutral tones are derived semantically from the primary hue to ensure a cohesive, grounded feel across the interface.

## Typography
The system has moved away from Public Sans to **Inter**, a typeface specifically designed for screen readability. This change introduces a more geometric and modern feel. Headlines use a heavier weight for clear information hierarchy, while body text leverages Inter’s excellent legibility at smaller sizes. The scale is optimized for clarity, with generous line heights to prevent visual fatigue in information-dense environments.

## Layout & Spacing
The layout follows a **Fluid Grid** philosophy, allowing content to breathe across various screen sizes. A base 8px spacing unit (consistent with the spacing value of 2) governs all margins and padding, ensuring mathematical harmony. On desktop, a 12-column grid is standard, transitioning to a 4-column grid for mobile devices. Breakpoints are set at 600px (mobile), 900px (tablet), and 1200px (desktop).

## Elevation & Depth
Depth is communicated through **Tonal Layers** and subtle ambient shadows. Surfaces use light grey or white backgrounds to indicate elevation levels. Higher-level components, like modals or floating action buttons, utilize soft, diffused shadows with a low-opacity primary tint to maintain a sense of integration with the brand color.

## Shapes
The design has moved from sharp 0px corners to a **Rounded** shape language (Level 2). Standard UI elements like buttons and input fields feature a 0.5rem (8px) corner radius. Larger containers, such as cards, utilize 1rem (16px) radius, creating a friendlier and more modern interface while maintaining its professional character.

## Components
- **Buttons:** Primary buttons use the Forest Green background with White text and 8px rounded corners.
- **Input Fields:** Feature a subtle 1px border using semantic neutral tones and Inter body-md typography.
- **Cards:** White surfaces with a soft elevation shadow and 16px corner radius.
- **Chips:** Utilize the Tertiary Amber for high-visibility status or semantic primary tints for low-priority categorization.
- **Checkboxes/Radio Buttons:** Follow the Primary Green for active states, providing high contrast against the White background.