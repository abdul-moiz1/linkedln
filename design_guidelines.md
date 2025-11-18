# LinkedIn OAuth2 Demo - Design Guidelines

## Design Approach
**System-Based Approach**: Drawing from developer-focused productivity tools like Linear and GitHub, prioritizing clarity, functionality, and professional aesthetics. This technical demonstration requires clean information hierarchy and efficient user flows.

## Typography System

**Font Family**: 
- Primary: Inter or SF Pro Display via Google Fonts CDN
- Monospace: JetBrains Mono for tokens and technical data

**Hierarchy**:
- Page Titles: text-4xl font-bold
- Section Headers: text-2xl font-semibold
- Subsections: text-lg font-medium
- Body Text: text-base font-normal
- Code/Tokens: text-sm font-mono
- Labels: text-sm font-medium uppercase tracking-wide

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, and 8 consistently
- Component padding: p-6 or p-8
- Section spacing: space-y-6 or space-y-8
- Form field gaps: gap-4
- Button padding: px-6 py-3

**Container Strategy**:
- Max width: max-w-2xl for main content (forms, profile data)
- Centered: mx-auto with px-4 for mobile safety
- Full-width header/footer: w-full with inner max-w-6xl

**Grid System**: Single column primary layout with occasional 2-column splits for profile data display (grid-cols-1 md:grid-cols-2)

## Component Library

### Navigation Header
- Full-width container with centered content
- Logo/title on left, authentication status on right
- Height: h-16 with border-b border treatment
- Sticky positioning: sticky top-0 with backdrop blur

### Authentication States

**Logged Out View**:
- Centered card container (max-w-md)
- Large "Sign in with LinkedIn" primary button
- Brief explanatory text above button
- LinkedIn logo icon from Heroicons or Font Awesome

**Logged In View**:
- Profile card with data grid layout
- Profile picture (rounded-full, w-24 h-24)
- User details in definition list format (dt/dd pairs)
- Access token display in monospace with copy button
- Logout button (secondary style)

### Forms

**Post Creation Form**:
- Textarea for post content (min-h-32)
- Character counter below textarea (text-sm)
- Submit button aligned right
- Clear visual separation from profile section (border-t with pt-8)
- Success/error message display area

### Buttons

**Primary Action** (LinkedIn Login, Submit Post):
- Large tap target: px-6 py-3
- Rounded corners: rounded-lg
- Font weight: font-semibold
- Icon + text combination where applicable

**Secondary Actions** (Logout, Copy):
- Reduced visual weight
- Border treatment
- Same sizing as primary for consistency

**Icon-Only Buttons** (Copy token):
- Square: w-10 h-10
- Icon size: 20px from chosen icon library
- Tooltip on hover for accessibility

### Data Display

**Profile Information**:
- Definition list structure (dl/dt/dd)
- Key-value pairs with clear hierarchy
- dt: text-sm font-medium with reduced opacity
- dd: text-base font-normal
- Vertical spacing: space-y-3

**Token Display**:
- Monospace font background panel
- Subtle border treatment
- Truncate with ellipsis, full reveal on interaction
- Copy button positioned top-right of panel
- Visual feedback on copy action

### Status Messages

**Success/Error States**:
- Alert-style containers with rounded-lg
- Icon leading the message (checkmark/warning from icon library)
- Dismissible option for non-critical messages
- Position: Fixed top-right or inline contextual

## Icons
**Library**: Heroicons (outline style)
- Authentication: user-circle, arrow-right-on-rectangle
- Actions: clipboard, share, x-mark
- Status: check-circle, exclamation-circle
- Social: LinkedIn logo via Font Awesome brand icons

## Responsive Behavior

**Breakpoints**:
- Mobile (base): Single column, full-width cards with px-4
- Tablet (md:): Maintain single column, increased max-width
- Desktop (lg:): Profile data can use 2-column grid for key-value pairs

**Mobile Optimizations**:
- Increase button sizes: py-4 on mobile
- Stack all elements vertically
- Ensure 44px minimum touch targets
- Full-width primary actions on mobile

## Page Structure

**Homepage (Logged Out)**:
1. Header with app title
2. Centered authentication card (vertical center using flex items-center justify-center min-h-screen)
3. Single "Sign in with LinkedIn" call-to-action

**Profile Page (Logged In)**:
1. Header with logout option
2. Profile section (card with user data + token display)
3. Divider
4. Post creation section (form card)
5. Footer with minimal info

## Accessibility
- All interactive elements have visible focus states (ring-2 ring-offset-2)
- ARIA labels for icon-only buttons
- Form labels explicitly associated with inputs
- Skip-to-content link for keyboard navigation
- Color-independent status indicators (icons + text)

## Key Design Principles
1. **Clarity Over Decoration**: Minimal chrome, maximum content clarity
2. **Developer-Friendly**: Monospace for technical data, clear hierarchy for API responses
3. **Progressive Disclosure**: Show what's needed when it's needed
4. **Consistent Spacing**: Maintain rhythm with 4/6/8 unit system
5. **Touch-Friendly**: All interactive elements meet 44px minimum