# SignatureVerify Design System & Guidelines

## 1. Design Philosophy
Our design follows a **"Trust & Precision"** aesthetic, combining the reliability needed for security software with the modern, fluid experience users expect from premium SaaS applications.

### Core Principles
- **Clarity:** Content is presented with ample whitespace and clear hierarchy.
- **Feedback:** Every interaction (hover, click, submit) provides immediate visual feedback.
- **Fluidity:** Layouts adapt seamlessly from mobile to desktop using fluid typography and spacing.
- **Depth:** Usage of glassmorphism and layered shadows to create a sense of hierarchy and modernity.

## 2. Color Palette

### Primary (Trust & Technology)
- **Primary:** `#6366f1` (Indigo) - Represents intelligence and security.
- **Primary Gradient:** `linear-gradient(135deg, #667eea, #764ba2)` - Adds vibrancy and motion.

### Functional
- **Success:** `#22c55e` - For genuine signatures and successful actions.
- **Error:** `#ef4444` - For forged signatures and alerts.
- **Warning:** `#f59e0b` - For non-critical issues.

### Neutral
- **Background:** `#f8fafc` (Slate 50) - Reduces eye strain compared to pure white.
- **Surface:** `#ffffff` (White) - Card backgrounds.
- **Text:** `#0f172a` (Slate 900) for headings, `#475569` (Slate 600) for body.

## 3. Typography
We use **Inter** for its excellent readability at all sizes and neutral personality.

- **Headings:** Bold (700/800), tight letter-spacing (`-0.02em`) for a modern look.
- **Body:** Regular (400), loose line-height (`1.6`) for readability.
- **Fluid Sizing:** `clamp()` functions are used to ensure text scales smoothly between devices without breakpoints.

## 4. UI Components

### Cards
- **Style:** Clean white background with subtle border (`1px solid #e2e8f0`).
- **Elevation:** Soft shadow (`0 4px 6px -1px rgba(0, 0, 0, 0.1)`) that deepens on hover (`transform: translateY(-5px)`).
- **Radius:** Large border-radius (`16px-24px`) for a friendly, modern feel.

### Buttons
- **Primary:** Gradient background with shadow glow.
- **Secondary:** Outline style with transparent background.
- **Interaction:** All buttons scale slightly (`transform: scale(1.02)`) on hover for tactile feel.

### Forms
- **Inputs:** Clean background (`#f1f5f9`) that focus-transitions to white with a primary color ring.
- **Labels:** Clear, bold labels placed outside the input for persistent context.

## 5. Animations
Animations are used to guide the user's eye and smooth out state changes, not just for decoration.

- **Fade In:** Elements load with a staggered fade-in effect to reduce cognitive load.
- **Scroll:** Content reveals gently as the user scrolls.
- **Toast Notifications:** Slide in from the bottom-right to notify without blocking the view.

## 6. Accessibility
- **Contrast:** High contrast ratios for text.
- **Focus States:** Clear focus rings for keyboard navigation.
- **Semantic HTML:** Proper use of `<main>`, `<nav>`, `<section>`, and aria-labels.
