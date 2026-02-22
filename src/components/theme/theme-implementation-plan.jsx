================================================================================
THEME SYSTEM IMPLEMENTATION PLAN
Date: 22-Feb-2026
================================================================================

OBJECTIVE:
Complete theme support for light, dark, and future custom themes by replacing
all hard-coded color values with CSS variables and theme-aware utilities.

================================================================================
PHASE 1: CSS INFRASTRUCTURE CONSOLIDATION
================================================================================

STATUS: ⚠️ CRITICAL - Two CSS files with overlapping concerns

CURRENT STATE:
- `globals.css`: Contains shadcn theme variables + layout constants
- `src/index.css`: Contains shadcn theme variables + sidebar variables + custom app colors

ISSUES:
1. Duplicate theme variable definitions (--background, --foreground, etc.)
2. Custom app colors only in src/index.css (--primary-50, --success, --warning, etc.)
3. Sidebar variables only in src/index.css
4. --bg-subtle variable only in src/index.css
5. Potential conflicts and maintenance overhead

RECOMMENDED ACTION:
OPTION A (Recommended): Merge src/index.css into globals.css
  - Move sidebar variables to globals.css
  - Move custom app colors to globals.css
  - Move --bg-subtle to globals.css
  - Ensure dark mode overrides for all new variables
  - Delete src/index.css after merge

OPTION B: Keep separation but clarify purpose
  - globals.css: Base shadcn + layout constants only
  - src/index.css: App-specific theme extensions
  - Add clear documentation headers in both files

VARIABLES TO MIGRATE (if Option A):
From src/index.css → globals.css:
  - --sidebar-* (9 variables)
  - --primary-50, --primary-100, --primary-500, --primary-600, --primary-700
  - --success, --warning, --error
  - --bg-subtle (light + dark mode values)

================================================================================
PHASE 2: COMPONENT AUDIT - HARD-CODED VALUES
================================================================================

PRIORITY: HIGH - Blocks multi-theme support

────────────────────────────────────────────────────────────────────────────────
FILE: components/dashboard/QuickStats.jsx
────────────────────────────────────────────────────────────────────────────────
HARD-CODED VALUES:
  Line 15: gradient: "from-green-500 to-emerald-600"
  Line 16: bg: "bg-green-50"
  Line 17: textColor: "text-green-700"
  Line 23: gradient: "from-red-500 to-rose-600"
  Line 24: bg: "bg-red-50"
  Line 25: textColor: "text-red-700"
  Line 31: gradient: "from-blue-500 to-purple-600" / "from-orange-500 to-red-600"
  Line 32: bg: "bg-blue-50" / "bg-orange-50"
  Line 33: textColor: "text-blue-700" / "text-orange-700"
  Line 46: text-gray-500
  Line 50: text-gray-900

SOLUTION:
  - Create CSS variables for stat types:
    --stat-income-gradient-from, --stat-income-gradient-to
    --stat-income-bg, --stat-income-text
    --stat-expense-gradient-from, --stat-expense-gradient-to
    --stat-expense-bg, --stat-expense-text
    --stat-balance-positive-gradient-from, --stat-balance-positive-gradient-to
    --stat-balance-positive-bg, --stat-balance-positive-text
    --stat-balance-negative-gradient-from, --stat-balance-negative-gradient-to
    --stat-balance-negative-bg, --stat-balance-negative-text
  - Replace gray colors with --muted-foreground, --foreground

ESTIMATED EFFORT: 2 hours

────────────────────────────────────────────────────────────────────────────────
FILE: components/dashboard/BudgetOverview.jsx
────────────────────────────────────────────────────────────────────────────────
HARD-CODED VALUES:
  Line 34: color: category?.color || '#94A3B8' (fallback gray-400)
  Line 50: text-gray-400
  Line 58: hover:bg-gray-50
  Line 66-68: text-gray-900

SOLUTION:
  - Replace '#94A3B8' with 'hsl(var(--muted-foreground))'
  - Replace text-gray-400 with text-muted-foreground
  - Replace hover:bg-gray-50 with hover:bg-accent
  - Replace text-gray-900 with text-foreground

ESTIMATED EFFORT: 30 minutes

────────────────────────────────────────────────────────────────────────────────
FILE: components/budgets/BudgetCard.jsx
────────────────────────────────────────────────────────────────────────────────
HARD-CODED VALUES:
  Line 93: defaultColor = budget.color || '#3B82F6'
  Line 155: h-1 bar uses theme.main (dynamic - OK)
  Line 161: text-gray-900, hover:text-blue-600
  Line 186: bg-amber-50, border-amber-200
  Line 187: text-amber-800
  Line 213: stroke="#F3F4F6" (track color)
  Line 246: text-gray-400 (multiple instances)
  Line 250: text-gray-700 / statusColor
  Line 274: text-gray-400
  Line 287: bg-gray-100
  Line 292-299: text-gray-900, text-amber-600, text-gray-300

SOLUTION:
  - Replace '#3B82F6' with 'hsl(var(--primary))'
  - Replace text-gray-900 with text-foreground
  - Replace hover:text-blue-600 with hover:text-primary
  - Replace bg-amber-50, border-amber-200, text-amber-800 with:
    --warning-bg, --warning-border, --warning-text CSS variables
  - Replace '#F3F4F6' with 'hsl(var(--muted))'
  - Replace text-gray-400 with text-muted-foreground
  - Replace text-gray-700 with text-card-foreground
  - Replace bg-gray-100 with bg-muted
  - Replace text-amber-600 with text-warning
  - Replace text-gray-300 with text-muted-foreground/50

ESTIMATED EFFORT: 2 hours

────────────────────────────────────────────────────────────────────────────────
FILE: components/transactions/TransactionCard.jsx
────────────────────────────────────────────────────────────────────────────────
HARD-CODED VALUES:
  Line 25: categoryColor = isIncome ? '#10B981' : (category?.color || '#6B7280')
  Line 42: bg-white, border-gray-200
  Line 78-80: text-gray-900
  Line 137: text-gray-900
  Line 139: text-gray-500
  Line 147-148: bg-green-100, text-green-600
  Line 151-152: bg-orange-100, text-orange-600
  Line 176: hover:bg-red-50, hover:text-red-600

SOLUTION:
  - Replace '#10B981' with 'hsl(var(--success))'
  - Replace '#6B7280' with 'hsl(var(--muted-foreground))'
  - Replace bg-white with bg-card
  - Replace border-gray-200 with border-border
  - Replace text-gray-900 with text-foreground
  - Replace text-gray-500 with text-muted-foreground
  - Create --success-bg, --success-text variables for paid status
  - Create --warning-bg, --warning-text variables for unpaid status
  - Replace hover:bg-red-50 with hover:bg-destructive/10
  - Replace hover:text-red-600 with hover:text-destructive

ESTIMATED EFFORT: 1.5 hours

────────────────────────────────────────────────────────────────────────────────
FILE: components/categories/CategoryCard.jsx
────────────────────────────────────────────────────────────────────────────────
HARD-CODED VALUES:
  Line 19: borderColor: isSelected ? '#3B82F6' : '#f3f4f6'
  Line 24: bg-blue-50, ring-blue-500
  Line 30: hover:bg-gray-50
  Line 32: text-gray-900
  Line 38: bg-white, border-gray-100
  Line 39: text-gray-400
  Line 50: bg-gray-100, text-gray-600
  Line 61: bg-blue-600, border-blue-600, border-gray-300, bg-white
  Line 69: bg-white/80
  Line 74: hover:bg-blue-50, hover:text-blue-600
  Line 84: hover:bg-red-50, hover:text-red-600
  Line 92: text-gray-400

SOLUTION:
  - Replace '#3B82F6' with 'hsl(var(--primary))'
  - Replace '#f3f4f6' with 'hsl(var(--border))'
  - Replace bg-blue-50, ring-blue-500 with bg-primary/10, ring-primary
  - Replace hover:bg-gray-50 with hover:bg-accent
  - Replace text-gray-900 with text-foreground
  - Replace bg-white with bg-background
  - Replace border-gray-100 with border-border
  - Replace text-gray-400 with text-muted-foreground
  - Replace bg-gray-100, text-gray-600 with bg-muted, text-muted-foreground
  - Replace bg-blue-600, border-blue-600 with bg-primary, border-primary
  - Replace border-gray-300 with border-border
  - Replace bg-white/80 with bg-background/80
  - Replace hover:bg-blue-50 with hover:bg-primary/10
  - Replace hover:text-blue-600 with hover:text-primary
  - Replace hover:bg-red-50, hover:text-red-600 with hover:bg-destructive/10, hover:text-destructive

ESTIMATED EFFORT: 1.5 hours

────────────────────────────────────────────────────────────────────────────────
FILE: components/ui/CustomButton.jsx
────────────────────────────────────────────────────────────────────────────────
HARD-CODED VALUES:
  Lines 23-38: All variant definitions use hard-coded color classes
    - "bg-red-600", "hover:bg-red-700" (destructive, delete)
    - "bg-blue-600", "hover:bg-blue-700" (modify, primary)
    - "bg-green-600", "hover:bg-green-700" (success)
    - "bg-orange-600", "hover:bg-orange-700" (warning)
    - "bg-sky-600", "hover:bg-sky-700" (info)
    - Gradient definitions: "from-blue-600 to-purple-600"

SOLUTION:
  OPTION A: Use Tailwind arbitrary values with CSS variables
    - bg-[hsl(var(--destructive))]
    - hover:bg-[hsl(var(--destructive-hover))]
  
  OPTION B: Create custom Tailwind classes in globals.css
    - .btn-destructive { background: hsl(var(--destructive)); }
    - .btn-destructive:hover { background: hsl(var(--destructive-hover)); }
  
  OPTION C (Recommended): Extend Tailwind theme in tailwind.config.js
    - Add button-specific color variants
    - Use standard Tailwind classes with extended palette

REQUIRED CSS VARIABLES (add to globals.css):
  --btn-destructive, --btn-destructive-hover
  --btn-modify, --btn-modify-hover
  --btn-success, --btn-success-hover
  --btn-warning, --btn-warning-hover
  --btn-info, --btn-info-hover
  --btn-primary-gradient-from, --btn-primary-gradient-to

ESTIMATED EFFORT: 2 hours

────────────────────────────────────────────────────────────────────────────────
FILE: Layout.jsx
────────────────────────────────────────────────────────────────────────────────
HARD-CODED VALUES:
  Multiple instances of gray colors:
  - text-gray-500, text-gray-900, text-gray-400
  - bg-gray-50, hover:bg-gray-50
  - border-gray-100

SOLUTION:
  - Replace text-gray-500 with text-muted-foreground
  - Replace text-gray-900 with text-foreground
  - Replace text-gray-400 with text-muted-foreground/80
  - Replace bg-gray-50 with bg-accent
  - Replace hover:bg-gray-50 with hover:bg-accent
  - Replace border-gray-100 with border-border

ESTIMATED EFFORT: 1 hour

────────────────────────────────────────────────────────────────────────────────
FILE: globals.css - Calendar Styling (react-day-picker)
────────────────────────────────────────────────────────────────────────────────
HARD-CODED VALUES:
  Lines 249-291: react-day-picker custom styling
  Line 249: --rdp-accent-color: rgb(59 130 246) (blue-500)
  Line 251: --rdp-accent-background-color: rgb(239 246 255) (blue-50)
  Line 258: --rdp-accent-color: rgb(96 165 250) (blue-400 dark)
  Line 259: --rdp-accent-background-color: rgba(96, 165, 250, 0.15)
  Line 277: background-color: rgb(37 99 235) (blue-600)

SOLUTION:
  - Replace rgb(59 130 246) with hsl(var(--primary))
  - Replace rgb(239 246 255) with hsl(var(--primary) / 0.1)
  - Replace rgb(96 165 250) with hsl(var(--primary) / 0.9)
  - Replace rgba(96, 165, 250, 0.15) with hsl(var(--primary) / 0.15)
  - Replace rgb(37 99 235) with hsl(var(--primary) / 0.8)

ESTIMATED EFFORT: 30 minutes

================================================================================
PHASE 3: ADDITIONAL FILES TO AUDIT
================================================================================

HIGH PRIORITY (Likely contain hard-coded values):
  ☐ components/custombudgets/BudgetHealthCompact.jsx
  ☐ components/custombudgets/CustomBudgetCard.jsx
  ☐ components/custombudgets/BudgetBar.jsx
  ☐ components/custombudgets/VerticalBar.jsx
  ☐ components/dashboard/RemainingBudgetCard.jsx
  ☐ components/dashboard/MobileRemainingBudgetCard.jsx
  ☐ components/dashboard/CustomBudgetsDisplay.jsx
  ☐ components/dashboard/RecentTransactions.jsx
  ☐ components/dashboard/UpcomingTransactions.jsx
  ☐ components/dashboard/QuickAddBudget.jsx
  ☐ components/transactions/TransactionList.jsx
  ☐ components/transactions/TransactionItem.jsx
  ☐ components/transactions/TransactionFilters.jsx
  ☐ components/transactions/forms/ExpenseForm.jsx
  ☐ components/transactions/forms/IncomeForm.jsx
  ☐ components/ui/BudgetAvatar.jsx
  ☐ components/ui/LiquidHeader.jsx
  ☐ components/ui/VelocityWidget.jsx
  ☐ components/reports/TrendChart.jsx
  ☐ components/reports/PriorityChart.jsx
  ☐ components/reports/ProjectionChart.jsx
  ☐ components/cookies/CookieBanner.jsx
  ☐ components/cookies/CookieSettings.jsx
  ☐ components/notifications/NotificationItem.jsx
  ☐ pages/Budgets.jsx
  ☐ pages/Transactions.jsx
  ☐ pages/Categories.jsx
  ☐ pages/Reports.jsx

MEDIUM PRIORITY:
  ☐ All remaining components/ files
  ☐ All remaining pages/ files

================================================================================
PHASE 4: THEME VARIABLE ADDITIONS REQUIRED
================================================================================

Add to globals.css (in both :root and .dark):

COMPONENT-SPECIFIC COLORS:
  /* Stats Card Colors */
  --stat-income-gradient-from: 132 204 22;     /* green-500 */
  --stat-income-gradient-to: 5 150 105;        /* emerald-600 */
  --stat-income-bg: 240 253 244;               /* green-50 */
  --stat-income-text: 21 128 61;               /* green-700 */
  
  --stat-expense-gradient-from: 239 68 68;     /* red-500 */
  --stat-expense-gradient-to: 244 63 94;       /* rose-600 */
  --stat-expense-bg: 254 242 242;              /* red-50 */
  --stat-expense-text: 185 28 28;              /* red-700 */
  
  --stat-balance-positive-gradient-from: 59 130 246;  /* blue-500 */
  --stat-balance-positive-gradient-to: 147 51 234;    /* purple-600 */
  --stat-balance-positive-bg: 239 246 255;            /* blue-50 */
  --stat-balance-positive-text: 29 78 216;            /* blue-700 */
  
  --stat-balance-negative-gradient-from: 249 115 22;  /* orange-500 */
  --stat-balance-negative-gradient-to: 220 38 38;     /* red-600 */
  --stat-balance-negative-bg: 255 247 237;            /* orange-50 */
  --stat-balance-negative-text: 194 65 12;            /* orange-700 */

  /* Button Variants */
  --btn-destructive: 220 38 38;                /* red-600 */
  --btn-destructive-hover: 185 28 28;          /* red-700 */
  --btn-modify: 37 99 235;                     /* blue-600 */
  --btn-modify-hover: 29 78 216;               /* blue-700 */
  --btn-success: 22 163 74;                    /* green-600 */
  --btn-success-hover: 21 128 61;              /* green-700 */
  --btn-warning: 234 88 12;                    /* orange-600 */
  --btn-warning-hover: 194 65 12;              /* orange-700 */
  --btn-info: 2 132 199;                       /* sky-600 */
  --btn-info-hover: 3 105 161;                 /* sky-700 */
  --btn-primary-gradient-from: 37 99 235;      /* blue-600 */
  --btn-primary-gradient-to: 124 58 237;       /* purple-600 */

  /* Status Colors */
  --status-paid-bg: 220 252 231;               /* green-100 */
  --status-paid-text: 22 101 52;               /* green-600 */
  --status-unpaid-bg: 254 243 199;             /* orange-100 */
  --status-unpaid-text: 234 88 12;             /* orange-600 */

  /* Warning/Alert Colors */
  --warning-bg: 254 243 199;                   /* amber-50 */
  --warning-border: 253 230 138;               /* amber-200 */
  --warning-text: 146 64 14;                   /* amber-800 */

DARK MODE OVERRIDES (in .dark):
  All of the above with adjusted values for dark mode visibility

================================================================================
PHASE 5: IMPLEMENTATION STRATEGY
================================================================================

STEP 1: CSS Infrastructure (Week 1)
  ☐ Merge src/index.css into globals.css (or clarify separation)
  ☐ Add all new theme variables to globals.css
  ☐ Add dark mode overrides for all new variables
  ☐ Test theme switching on basic elements

STEP 2: Core UI Components (Week 2)
  ☐ Update CustomButton.jsx
  ☐ Update CategoryCard.jsx
  ☐ Update TransactionCard.jsx
  ☐ Update BudgetCard.jsx
  ☐ Test all components in light/dark mode

STEP 3: Dashboard Components (Week 3)
  ☐ Update QuickStats.jsx
  ☐ Update BudgetOverview.jsx
  ☐ Update RemainingBudgetCard.jsx
  ☐ Update MobileRemainingBudgetCard.jsx
  ☐ Update CustomBudgetsDisplay.jsx
  ☐ Update RecentTransactions.jsx
  ☐ Update UpcomingTransactions.jsx

STEP 4: Remaining Components (Week 4)
  ☐ Audit and update all HIGH PRIORITY files
  ☐ Audit and update all MEDIUM PRIORITY files
  ☐ Update calendar styling
  ☐ Update Layout.jsx

STEP 5: Testing & Validation (Week 5)
  ☐ Test light theme
  ☐ Test dark theme
  ☐ Test system preference switching
  ☐ Create custom theme example (e.g., "ocean" theme)
  ☐ Document theme creation process
  ☐ Create theme migration guide for future themes

================================================================================
FUTURE THEME EXTENSIBILITY
================================================================================

To add a new theme (e.g., "ocean", "sunset", "forest"):

1. Add new theme class in globals.css:
   .theme-ocean {
     --background: ...;
     --foreground: ...;
     /* etc. */
   }

2. Update theme toggle logic in Layout.jsx to support > 2 themes

3. Add theme preference to UserSettings entity

4. Persist theme choice in SettingsContext

ESTIMATED TOTAL EFFORT: 4-5 weeks (80-100 hours)

================================================================================
RISKS & CONSIDERATIONS
================================================================================

1. REGRESSION RISK: High
   - Many components depend on specific color values
   - Visual regressions likely during migration
   - Recommend thorough visual testing after each phase

2. MAINTENANCE COMPLEXITY:
   - Two CSS files create confusion
   - Recommend consolidation or clear documentation

3. GRADIENT SUPPORT:
   - Tailwind gradients don't support CSS variables directly
   - May need to use inline styles or custom classes

4. THIRD-PARTY COMPONENTS:
   - react-day-picker, recharts, etc. may have limited theme support
   - May require additional CSS overrides

================================================================================
NOTES
================================================================================

- This plan is comprehensive but not exhaustive
- Additional hard-coded values will likely be discovered during implementation
- Consider creating a theme preview page to test all components at once
- Document color decisions for accessibility (WCAG contrast ratios)
- Consider creating a theme testing checklist

================================================================================
END OF IMPLEMENTATION PLAN
================================================================================