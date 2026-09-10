# Premium UI/UX Design Instructions

Redesign the entire application so it feels like a premium, professionally designed SaaS product — NOT like a generic AI/vibecoded website.

The design direction should feel inspired by the quality and restraint of products like Linear, Stripe, Vercel, and Apple, while still having its own visual identity.

## CORE PHILOSOPHY

- Minimal
- Premium
- Modern
- Clean
- Confident
- Professional
- Spacious
- Consistent
- Functional before decorative
- Subtle rather than flashy

The goal is: "I would happily pay for this." NOT: "An AI generated a dashboard."

Do not blindly redesign every screen independently. First inspect the existing application and establish one unified design system. Then apply that system consistently across the entire app.

## 1. COLOR SYSTEM

Use a restrained color palette.

### LIGHT MODE

- Background: `#F8F9FB`
- Primary surface: `#FFFFFF`
- Primary text: `#111318`
- Secondary text: `#626875`
- Muted text: `#8B919D`
- Border: `#E7E9EE`
- Primary brand/accent: `#635BFF`

Use the brand color sparingly for: primary buttons, active navigation, important interactive elements, selected states, progress indicators, important highlights.

DO NOT make the entire application purple. Do not use random colors throughout the interface.

- Success: subtle green.
- Warning: subtle amber.
- Error: subtle red.

Avoid neon colors. Avoid rainbow gradients. Avoid excessive purple/blue AI gradients.

### 2. DARK MODE

If dark mode exists, design it intentionally rather than simply inverting the light theme.

- Background: `#0B0D10`
- Surface: `#111419`
- Elevated surface: `#171A20`
- Border: `#252932`
- Primary text: `#F5F7FA`
- Secondary text: `#9BA1AD`

Keep the brand accent but adjust it when necessary for readability.

Dark mode should feel like a premium productivity/SaaS application, not gaming RGB software.

## 3. TYPOGRAPHY

Use Inter or another high-quality modern UI font.

Create a clear typography hierarchy:

- Display: 48–64px, weight 650–700
- Page title: 32–40px, weight 650–700
- Section title: 20–24px, weight 600–650
- Body: 15–16px, weight 400–450
- Secondary: 13–14px

Do not use excessive font weights. Do not make every heading huge. Do not use ALL CAPS unnecessarily.

Typography should create hierarchy and make the interface easy to scan.

## 4. SPACING SYSTEM

Use a consistent 4px-based spacing system. Preferred values: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80px.

Do not randomly use values such as 17px, 23px, 29px, etc. unless absolutely necessary. Use whitespace intentionally. The interface should breathe.

## 5. CARDS

Do NOT turn every section into a card. This is one of the biggest signs of generic AI-generated UI.

Only use cards when they provide meaningful grouping or hierarchy. Cards should use: 12–16px border radius, subtle border, minimal or no shadow, generous internal spacing, clear hierarchy.

Preferred border: `1px solid #E7E9EE`.

Avoid: giant shadows, glowing borders, random gradients, excessive rounded rectangles, cards inside cards inside cards.

If something can exist naturally on the page without a card, do that instead.

## 6. BORDER RADIUS

- Small: 8px
- Medium: 12px
- Large: 16px
- Pill: 999px
- Buttons: 8–10px
- Inputs: 8–10px
- Cards: 12–16px

Do not make everything rounded-full.

## 7. BUTTONS

Buttons should be clean and premium.

**Primary button**: brand background, white text, medium/bold weight, 8–10px radius, 40–44px height, subtle hover transition.

**Secondary button**: neutral/light background or transparent, subtle border, dark text.

Do NOT create huge gradient buttons. Do NOT use excessive shadows. Primary actions should visually dominate secondary actions.

## 8. NAVIGATION

Keep navigation simple and professional.

Desktop sidebar: approximately 240–260px wide. Use consistent icons, clear active state, comfortable spacing, simple typography.

Active navigation item: subtle brand-tinted background, brand-colored icon/text, small radius.

Do not add unnecessary navigation categories. Do not make the logo unnecessarily huge. The user should immediately understand where they are.

## 9. ICONS

Use one consistent icon library/style throughout the entire application. Prefer clean outline icons. Recommended sizes: 16, 18, 20, 24px.

Do not mix random icon styles. Do not randomly mix emojis, filled icons, outline icons, different icon libraries. Consistency is more important than decorative complexity.

## 10. SHADOWS

Use shadows very sparingly.

- Default UI: no shadow or extremely subtle shadow.
- Dropdowns/modals: subtle shadow.
- Elevated elements: subtle shadow.

Do not give every component a giant shadow. Create hierarchy primarily through spacing, contrast, borders, surface colors.

## 11. GRADIENTS

Do NOT use gradients as the default design language.

Avoid: purple → blue backgrounds, pink → purple gradients, rainbow gradients, glowing backgrounds, giant gradient text.

A gradient may be used only when it serves a specific branding purpose. If removing a gradient makes the design look more professional, remove it.

## 12. GLASSMORPHISM

Do not use glassmorphism everywhere. Avoid putting backdrop blur on random cards. Only use glass effects when they have a clear UX purpose.

## 13. AI UI

The product is an AI application, but do not make the entire interface scream "✨ AI MAGIC ✨". Avoid excessive sparkle icons. Avoid putting an AI badge on everything. AI should feel like a powerful core capability of the product, not a visual gimmick. Use subtle AI indicators when necessary.

## 14. DASHBOARD

The dashboard should immediately answer: What is happening? What matters most? What changed? What should the user do next?

Do not create meaningless statistics simply to fill space. Do not create generic cards such as Revenue/Users/Growth/AI Score unless they provide actual value.

Prioritize meaningful information. Most important information: large and prominent. Supporting information: smaller. Secondary information: quiet and unobtrusive.

## 15. EMPTY STATES

Empty states should feel intentional. Do not simply say "Nothing here yet." Instead explain what this section does, why it is empty, what the user should do next. Provide one obvious action. Keep illustrations simple and premium.

## 16. ANIMATIONS

Use subtle, fast animations. Preferred duration: 150–250ms.

Use animation for: hover states, navigation, opening/closing, loading, state changes, confirmation.

Avoid: bouncing everything, excessive spring animations, constant spinning, unnecessary page transitions, animating every component.

Motion should communicate change, not distract from the product.

## 17. RESPONSIVE DESIGN

The application must feel intentionally designed on desktop, tablet, mobile. Do not simply shrink the desktop version.

On mobile: collapse navigation intelligently, make important actions accessible, collapse grids appropriately, make content full-width when appropriate, reduce spacing slightly, scale typography appropriately.

## 18. DESIGN TOKENS

Create a centralized design system. Define reusable tokens for colors, typography, spacing, border radius, shadows, borders, transitions. Reuse these tokens throughout the application. Do not hardcode slightly different versions of the same color, spacing, radius, or shadow in different components.

## 19. COMPONENT CONSISTENCY

Create reusable components: Button, Input, Select, Modal, Card, Badge, Navigation, Tabs, Dropdown, Tooltip, Table, EmptyState, LoadingState, Toast.

Do not create five different versions of the same component. If two components serve the same purpose, make them use the same base component.

## 20. VISUAL HIERARCHY

Every page must have a clear hierarchy. The user should immediately know: what is most important, what can I click, what should I do next.

Use typography, spacing, contrast, position, size to communicate hierarchy. Do not rely on color alone.

## 21. REMOVE "VIBECODE" PATTERNS

Actively identify and remove common AI-generated design patterns. Remove unnecessary: gradients, glass cards, giant rounded containers, excessive shadows, random icons, excessive badges, sparkles, decorative blobs, huge headings, too many cards, random statistics, excessive animations, multiple competing accent colors, unnecessary sections, fake-looking testimonials, generic AI marketing language.

The interface should look designed, not decorated.

## 22. PREMIUM DESIGN TEST

Before considering each page finished, ask:

- Does this look like a template? If yes, redesign it.
- Are there too many cards? Remove some.
- Are there too many colors? Simplify.
- Are there too many gradients? Remove them.
- Are there too many rounded elements? Standardize them.
- Are there too many font sizes? Simplify the hierarchy.
- Does everything have a shadow? Remove most of them.
- Does the page feel empty? Do NOT automatically add cards — improve hierarchy, typography, spacing, and meaningful content instead.
- Does the page feel crowded? Remove unnecessary elements and increase whitespace.

## 23. PRODUCT-DESIGN STANDARD

The final application should feel like a real commercial SaaS product. Think: Linear, Stripe, Vercel, Notion, Apple. Use those products as inspiration for restraint, hierarchy, spacing, consistency, interaction design, typography, component quality.

Do NOT copy their designs. Develop an original visual identity for this application.

## 24. IMPORTANT IMPLEMENTATION RULE

Do not simply add CSS effects to make the existing UI look "prettier." First identify the structural problems. Then, in order:

1. Establish the design tokens.
2. Establish typography.
3. Establish spacing.
4. Establish colors.
5. Establish component styles.
6. Establish navigation.
7. Establish page hierarchy.
8. Refactor existing components.
9. Remove unnecessary visual elements.
10. Apply the design system consistently across the entire application.
11. Test every page for visual consistency.
12. Test responsive layouts.

Do not redesign one page beautifully while leaving the rest of the application inconsistent.

## FINAL GOAL

Make the application feel: premium, intentional, modern, trustworthy, fast, clean, professional.

It should look like a product that has had a real product designer working on it for months. The user should never think "Yeah, this was vibecoded." They should think "Wait... this is actually a serious product."
