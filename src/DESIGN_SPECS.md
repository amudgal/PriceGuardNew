# PriceGuard Design Specifications

## Version 1.0 | November 2025

---

## Table of Contents
1. [Color Palette](#color-palette)
2. [Typography](#typography)
3. [Spacing & Layout](#spacing--layout)
4. [Components](#components)
5. [Page Specifications](#page-specifications)
6. [Responsive Breakpoints](#responsive-breakpoints)
7. [Interactive States](#interactive-states)

---

## Color Palette

### Primary Colors
- **Primary Magenta**: `#E91E8C`
  - Used for: Primary CTA buttons, links, accents, badges
  - Hover state: `#D11A7C`
  
- **Dark Gray (Navigation)**: `#3D3D3D`
  - Used for: Header/navigation background
  - Border variant: `#2D2D2D`

### Neutral Colors
- **White**: `#FFFFFF`
  - Used for: Main backgrounds, card backgrounds
  
- **Light Gray**: `#F9FAFB` (gray-50)
  - Used for: Page backgrounds, subtle sections
  
- **Medium Gray**: `#6B7280` (gray-500)
  - Used for: Secondary text, placeholders
  
- **Soft Dark Gray**: `#374151` (gray-700)
  - Used for: Body text, primary text content

### Status Colors
- **Blue (Info)**: `#3B82F6` (blue-500)
  - Alert background: `#EFF6FF` (blue-50)
  - Alert border: `#BFDBFE` (blue-200)
  - Alert text: `#1E3A8A` (blue-900)

### Payment Card Colors
- **Visa**: `#1434CB`
- **Mastercard Red**: `#EB001B`
- **Mastercard Orange**: `#F79E1B`
- **Mastercard Blend**: `#FF5F00`
- **Amex Blue**: `#006FCF`

---

## Typography

### Font Family
- **Primary**: System font stack (default Tailwind CSS)
  - Font family is managed through `styles/globals.css`

### Text Hierarchy
**Note**: Font sizes, weights, and line-heights are controlled via `styles/globals.css` and should not be overridden with Tailwind classes unless specifically requested.

#### Headings
- **H1 (Page Title)**: 
  - Size: 30px / 1.875rem
  - Use: Main page headings ("Join PriceGuard")
  
- **H2 (Section Title)**: 
  - Size: 24px / 1.5rem
  - Use: Section headings ("Choose Your Membership")
  
- **Card Title**: 
  - Size: 18px / 1.125rem
  - Use: Card headings, component titles

#### Body Text
- **Base Text**: 16px / 1rem
- **Small Text**: 14px / 0.875rem
- **Extra Small**: 12px / 0.75rem

### Text Colors
- **Primary Text**: `text-gray-700` (#374151)
- **Secondary Text**: `text-gray-600` (#4B5563)
- **Muted Text**: `text-gray-500` (#6B7280)
- **White Text**: `text-white` (#FFFFFF)

---

## Spacing & Layout

### Container Widths
- **Max Width (Desktop)**: `max-w-7xl` (1280px)
- **Max Width (Content)**: `max-w-6xl` (1152px)
- **Max Width (Forms)**: `max-w-md` (448px)

### Padding Scale
- **Page Container**: `px-4 sm:px-6 lg:px-8`
  - Mobile: 16px
  - Small: 24px
  - Large: 32px

### Gap/Space Scale (Tailwind)
- **xs**: 4px (space-1)
- **sm**: 8px (space-2)
- **md**: 16px (space-4)
- **lg**: 24px (space-6)
- **xl**: 32px (space-8)

### Component Spacing
- **Card padding**: `p-6` (24px)
- **Card gap**: `space-y-4` (16px between elements)
- **Form field gap**: `space-y-4` (16px)
- **Section gap**: `space-y-6` (24px)

---

## Components

### Buttons

#### Primary Button
```
Background: #E91E8C
Hover: #D11A7C
Text: White
Padding: 8px 16px (default)
Border Radius: 6px
Font Weight: Medium
```

#### Secondary Button (Ghost)
```
Background: Transparent
Hover Background: #2D2D2D (in dark header)
Text: Gray-300 → White on hover
Padding: 8px 16px
Border Radius: 6px
```

#### Disabled State
```
Opacity: 0.5
Cursor: not-allowed
```

### Cards

#### Default Card
```
Background: White
Border: 1px solid #E5E7EB (gray-200)
Border Radius: 8px
Padding: 24px
Shadow: sm (0 1px 2px rgba(0,0,0,0.05))
```

#### Selected Card (Plan Selection)
```
Border: 2px solid #E91E8C
Ring: 2px #E91E8C
```

#### Hover State
```
Border: 1px solid #D1D5DB (gray-300)
Transition: all 150ms
```

### Input Fields

#### Standard Input
```
Height: 40px
Border: 1px solid #D1D5DB (gray-300)
Border Radius: 6px
Padding: 8px 12px
Focus Border: 2px solid #E91E8C
Focus Ring: 2px #E91E8C with opacity
```

#### Input with Icon
```
Right padding: 40px (to accommodate icon)
Icon position: absolute right-3 (12px from right)
Icon size: 20px (h-5 w-5)
Icon color: #9CA3AF (gray-400)
```

### Badges

#### Popular Badge
```
Background: #E91E8C
Text: White
Padding: 2px 8px
Border Radius: 4px
Font Size: 12px
Font Weight: Medium
```

### Navigation Header

```
Background: #3D3D3D
Height: 64px (h-16)
Border Bottom: 1px solid #2D2D2D
Logo Size: 32px (h-8 w-8)
Logo Color: #E91E8C
```

### Payment Card Logos

#### Container Specs
```
Height: 32px (h-8)
Width: 48px (w-12)
Background: White
Border: 1px solid #E5E7EB (gray-200)
Border Radius: 4px
Display: flex
Align: center
Justify: center
Gap between logos: 8px (gap-2)
```

### Alerts

#### Info Alert (Disclaimer)
```
Background: #EFF6FF (blue-50)
Border: 1px solid #BFDBFE (blue-200)
Padding: 16px
Border Radius: 6px
Icon Size: 16px (h-4 w-4)
Icon Color: #2563EB (blue-600)
Text Size: 12px
Text Color: #1E3A8A (blue-900)
```

---

## Page Specifications

### Login/Signup Page

#### Layout
```
Structure: Two-column grid (lg:grid-cols-2)
Gap: 32px (gap-8)
Mobile: Stacked layout
```

#### Form Section (Left)
```
Width: 50% on desktop, 100% on mobile
Card max-width: Full width within column
```

#### Plans Section (Right)
```
Width: 50% on desktop, 100% on mobile
Card spacing: 16px gap (space-y-4)
```

### Payment Information Section

```
Border Top: 1px solid #E5E7EB
Padding Top: 16px (pt-4)
Margin Top: 16px (mt-4)

Header Layout:
- Display: flex
- Justify: space-between
- Align: center
- Margin Bottom: 16px (mb-4)

Card Input:
- Full width
- Icon positioned right
- Max length: 19 characters (with spaces)

Expiry & CVV:
- Grid: 2 columns (grid-cols-2)
- Gap: 16px (gap-4)
- Expiry max length: 5 characters
- CVV max length: 4 characters
- CVV type: password (masked)
```

### Dashboard

#### Tab Navigation
```
Background: White
Border Bottom: 2px solid current
Active Color: #E91E8C
Inactive Color: #6B7280
Padding: 12px 16px
```

#### Stats Cards
```
Background: White
Border: 1px solid #E5E7EB
Padding: 24px
Border Radius: 8px
```

---

## Responsive Breakpoints

### Tailwind Breakpoints
- **sm**: 640px
- **md**: 768px
- **lg**: 1024px
- **xl**: 1280px
- **2xl**: 1536px

### Key Responsive Behaviors

#### Mobile (< 640px)
- Single column layouts
- Full width cards
- Reduced padding (px-4)
- Stack navigation items

#### Tablet (640px - 1024px)
- Maintain single column for forms
- Increase padding (px-6)
- Larger touch targets

#### Desktop (> 1024px)
- Two column layouts (lg:grid-cols-2)
- Maximum padding (px-8)
- Side-by-side content
- Hover states active

---

## Interactive States

### Hover States

#### Buttons
```
Primary: Background darkens (#D11A7C)
Ghost: Background appears (#2D2D2D)
Transition: all 150ms ease
```

#### Cards
```
Border: Changes to gray-300
Cursor: pointer
Transition: all 150ms ease
```

#### Links
```
Text Decoration: underline
Color: #E91E8C
Hover: Maintains color, adds underline
```

### Focus States

#### Input Fields
```
Border: 2px solid #E91E8C
Ring: 2px #E91E8C with reduced opacity
Outline: None (removed default)
```

#### Buttons
```
Ring: 2px offset ring in primary color
Outline: None (removed default)
```

### Active/Selected States

#### Selected Plan Card
```
Border: 2px solid #E91E8C
Ring: 2px ring-[#E91E8C]
Background: Remains white
```

#### Active Tab
```
Border Bottom: 2px solid #E91E8C
Text Color: #E91E8C
Font Weight: Medium
```

### Disabled States

#### Buttons
```
Opacity: 0.5
Cursor: not-allowed
Background: Retains color but faded
Hover: No hover effect
```

#### Input Fields
```
Background: #F9FAFB (gray-50)
Cursor: not-allowed
Text Color: #9CA3AF (gray-400)
```

---

## Form Validation

### Error States
```
Border Color: #EF4444 (red-500)
Text Color: #DC2626 (red-600)
Icon: Alert circle, red
```

### Success States
```
Border Color: #10B981 (green-500)
Text Color: #059669 (green-600)
Icon: Check circle, green
```

---

## Icons

### Icon Library
**Lucide React** - https://lucide.dev

### Common Icons & Sizes
- **Navigation Icons**: 20px (h-5 w-5)
- **Feature Icons**: 24px (h-6 w-6)
- **Large Icons**: 32px (h-8 w-8)
- **Small Icons**: 16px (h-4 w-4)

### Icon Colors
- **Primary**: #E91E8C
- **Secondary**: #6B7280 (gray-500)
- **White**: #FFFFFF
- **Muted**: #9CA3AF (gray-400)

---

## Shadow Scale

### Card Shadows
```
Default: shadow-sm (0 1px 2px rgba(0,0,0,0.05))
Hover: shadow-md (0 4px 6px rgba(0,0,0,0.1))
Modal: shadow-xl (0 20px 25px rgba(0,0,0,0.15))
```

---

## Animations & Transitions

### Standard Transitions
```
Duration: 150ms
Timing: ease-in-out
Properties: all, background-color, border-color, opacity
```

### Hover Transitions
```
Group hover: opacity-0 → opacity-100
Transition: transition-opacity
Duration: 150ms
```

---

## Grid Systems

### Two-Column Layout (Forms + Plans)
```
Desktop: lg:grid-cols-2
Mobile: grid-cols-1
Gap: 32px (gap-8)
```

### Three-Column Layout (Feature Cards)
```
Desktop: lg:grid-cols-3
Tablet: md:grid-cols-2
Mobile: grid-cols-1
Gap: 24px (gap-6)
```

---

## Z-Index Scale

```
Header: z-10
Dropdown: z-20
Modal Overlay: z-40
Modal Content: z-50
Tooltip: z-60
```

---

## Accessibility

### Focus Indicators
- All interactive elements have visible focus states
- Focus ring: 2px offset, primary color
- Keyboard navigation supported

### Color Contrast
- All text meets WCAG AA standards (4.5:1 minimum)
- Primary button: #E91E8C background with white text (sufficient contrast)

### Screen Reader Support
- All form inputs have associated labels
- Icons have `sr-only` text where needed
- Semantic HTML structure

---

## File Structure

```
/App.tsx                          - Main entry point
/components/
  ├── Login.tsx                   - Login/Signup page
  ├── Dashboard.tsx               - Dashboard with tabs
  ├── Homepage.tsx                - Marketing homepage
  └── ui/                         - ShadCN UI components
      ├── button.tsx
      ├── input.tsx
      ├── card.tsx
      ├── tabs.tsx
      └── ...
/styles/
  └── globals.css                 - Global styles and CSS variables
```

---

## Design Tokens (CSS Variables)

These are defined in `/styles/globals.css`:

```css
:root {
  --primary: #E91E8C;
  --primary-hover: #D11A7C;
  --dark-gray: #3D3D3D;
  --border-gray: #2D2D2D;
  /* Additional tokens defined in globals.css */
}
```

---

## Implementation Notes

### Tailwind CSS Version
- **Version**: 4.0
- **Configuration**: No `tailwind.config.js` needed
- **Tokens**: Defined in `styles/globals.css`

### Component Library
- **ShadCN UI**: Located in `/components/ui`
- **Icons**: Lucide React
- **Charts**: Recharts (for dashboard)

### Best Practices
1. Do NOT use Tailwind classes for font-size, font-weight, or line-height unless specifically needed
2. Typography is managed through `styles/globals.css`
3. Maintain consistent spacing using Tailwind's spacing scale
4. Use semantic HTML elements
5. Ensure all interactive elements are keyboard accessible

---

## Credit Card Input Specifications

### Card Number Field
```
Format: Auto-formatted with spaces every 4 digits
Max Length: 19 characters (16 digits + 3 spaces)
Placeholder: "1234 5678 9012 3456"
Icon: CreditCard (Lucide React)
Icon Position: Absolute right, centered vertically
```

### Expiration Date Field
```
Format: MM/YY
Max Length: 5 characters
Placeholder: "MM/YY"
Width: 50% of row (grid-cols-2)
```

### CVV Field
```
Format: Numeric
Max Length: 4 characters
Type: Password (masked)
Placeholder: "123"
Width: 50% of row (grid-cols-2)
```

### Payment Logos Row
```
Layout: Horizontal flex
Gap: 8px (gap-2)
Position: Top right of payment section
Logos: Visa, Mastercard, Amex
Logo Size: 32px height, 48px width
```

---

## Membership Plans

### Plan Cards Specifications

#### Dimensions
```
Width: Full width within column
Min Height: Auto
Padding: 24px (p-6)
Gap: 16px (space-y-4)
```

#### Pricing Display
```
Price Font Size: 32px (text-2xl)
Period Font Size: 14px (text-sm)
Color: text-gray-500
Alignment: Right
```

#### Features List
```
Gap: 8px (space-y-2)
Icon: Check (Lucide React)
Icon Size: 16px (h-4 w-4)
Icon Color: #E91E8C
Font Size: 14px (text-sm)
```

#### Popular Badge Position
```
Position: Inline with plan name
Margin Left: 8px (ml-2)
Vertical Align: Center
```

---

## Footer Specifications

```
Background: #3D3D3D
Text Color: #D1D5DB (gray-300)
Padding: 48px 16px (py-12 px-4)
Border Top: 1px solid #2D2D2D
```

---

## Export Information

**Document Version**: 1.0  
**Last Updated**: November 12, 2025  
**Format**: Markdown (.md)  
**Design System**: PriceGuard  
**Framework**: React + Tailwind CSS 4.0  
**Component Library**: ShadCN UI  

---

## Change Log

### Version 1.0 (November 12, 2025)
- Initial design specifications
- Complete color palette definition
- Typography system
- Component specifications
- Payment card input specifications
- Responsive breakpoints
- Interactive states
- Accessibility guidelines

---

**End of Design Specifications**
