import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CustomButton } from '@/components/ui/CustomButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useTutorial } from '../components/tutorial/TutorialContext';
import { TUTORIALS } from '../components/tutorial/tutorialConfig';
import {
  BookOpen,
  Target,
  Wallet,
  TrendingUp,
  DollarSign,
  Calendar,
  Lightbulb,
  Play,
  CheckCircle2,
  ArrowRight,
  PiggyBank,
  BarChart3,
  Shield
} from 'lucide-react';

const CORE_CONCEPTS = [
  {
    id: 'system-budgets',
    title: 'System Budgets',
    icon: Wallet,
    color: 'from-blue-500 to-blue-600',
    description: 'Automated monthly budgets that adapt to your income',
    details: [
      'Essentials (Needs): Fixed expenses like rent, groceries, utilities',
      'Lifestyle (Wants): Flexible spending on entertainment, dining, hobbies',
      'Savings: Automatic calculation based on remaining income',
      'Dynamically adjusts each month based on your income'
    ],
    tutorialId: 'system_budgets'
  },
  {
    id: 'custom-budgets',
    title: 'Custom Budgets',
    icon: Target,
    color: 'from-purple-500 to-purple-600',
    description: 'Event-specific budgets for trips, projects, or goals',
    details: [
      'Create budgets for specific events or timeframes',
      'Track spending across multiple categories',
      'Manage both digital and cash allocations',
      'Perfect for vacations, weddings, or special projects'
    ],
    tutorialId: 'custom_budgets'
  },
  {
    id: 'goals',
    title: 'Financial Goals',
    icon: TrendingUp,
    color: 'from-green-500 to-green-600',
    description: 'Virtual goal ledger for tracking savings objectives',
    details: [
      'Set target amounts and deadlines',
      'Track progress with mental deposits',
      'Flexible funding rules (fixed or percentage)',
      'Get feasibility insights and recommendations'
    ],
    tutorialId: null
  },
  {
    id: 'transactions',
    title: 'Transactions',
    icon: DollarSign,
    color: 'from-orange-500 to-orange-600',
    description: 'Track your income and expenses with ease',
    details: [
      'Categorize expenses as Needs or Wants',
      'Assign to System or Custom Budgets',
      'Import from banks or CSV files',
      'Automatic categorization with smart rules'
    ],
    tutorialId: 'transactions'
  },
  {
    id: 'recurring',
    title: 'Recurring Transactions',
    icon: Calendar,
    color: 'from-pink-500 to-pink-600',
    description: 'Automate regular income and expenses',
    details: [
      'Set up recurring bills and income',
      'Automatic generation on schedule',
      'Track upcoming payments',
      'Never miss a regular expense'
    ],
    tutorialId: null
  }
];

const FINANCIAL_TIPS = [
  {
    id: 'rule-50-30-20',
    category: 'Budgeting',
    title: 'The 50/30/20 Rule',
    icon: PiggyBank,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    content: 'Allocate 50% of income to needs, 30% to wants, and 20% to savings. This app helps you track and adjust these ratios based on your actual spending patterns.'
  },
  {
    id: 'emergency-fund',
    category: 'Savings',
    title: 'Build an Emergency Fund',
    icon: Shield,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    content: 'Aim for 3-6 months of expenses in a separate savings account. Use the Goals feature to track your progress toward this critical safety net.'
  },
  {
    id: 'track-everything',
    category: 'Habits',
    title: 'Track Every Transaction',
    icon: BarChart3,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    content: 'Awareness is the first step to control. Import bank statements or manually log all spending to understand where your money actually goes.'
  },
  {
    id: 'pay-yourself-first',
    category: 'Savings',
    title: 'Pay Yourself First',
    icon: TrendingUp,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    content: 'Set aside savings as soon as you receive income, before paying bills. Use percentage-based Goals to automate this mindset.'
  },
  {
    id: 'review-monthly',
    category: 'Habits',
    title: 'Monthly Reviews',
    icon: Calendar,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    content: 'Review your spending patterns each month using the Reports page. Look for unexpected expenses and adjust your budget categories accordingly.'
  },
  {
    id: 'categorize-smart',
    category: 'Budgeting',
    title: 'Smart Categorization',
    icon: Lightbulb,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    content: 'Use Automation Rules to automatically categorize recurring expenses. Save time and ensure consistency in your tracking.'
  }
];

export default function LearnPage() {
  const { startTutorial } = useTutorial();
  const [activeTab, setActiveTab] = useState('concepts');
  const [expandedConcept, setExpandedConcept] = useState(null);

  const handleStartTutorial = (tutorialId) => {
    if (tutorialId && TUTORIALS[tutorialId]) {
      startTutorial(tutorialId);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <BookOpen className="w-8 h-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Learning Center</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Master your finances with guided tutorials, core concepts, and expert tips
          </p>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
            <TabsTrigger value="concepts">Core Concepts</TabsTrigger>
            <TabsTrigger value="tutorials">Tutorials</TabsTrigger>
            <TabsTrigger value="tips">Tips & Articles</TabsTrigger>
          </TabsList>

          {/* Core Concepts Tab */}
          <TabsContent value="concepts" className="space-y-4 mt-6">
            <div className="grid md:grid-cols-2 gap-4">
              {CORE_CONCEPTS.map((concept) => {
                const Icon = concept.icon;
                const isExpanded = expandedConcept === concept.id;

                return (
                  <Card
                    key={concept.id}
                    className="group hover:shadow-lg transition-all duration-300 cursor-pointer"
                    onClick={() => setExpandedConcept(isExpanded ? null : concept.id)}
                  >
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${concept.color} shrink-0`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg">{concept.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {concept.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {isExpanded && (
                        <ul className="space-y-2">
                          {concept.details.map((detail, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {concept.tutorialId && (
                        <CustomButton
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartTutorial(concept.tutorialId);
                          }}
                          className="w-full mt-2"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Start Interactive Tutorial
                        </CustomButton>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Tutorials Tab */}
          <TabsContent value="tutorials" className="space-y-4 mt-6">
            <div className="grid md:grid-cols-2 gap-4">
              {Object.entries(TUTORIALS).map(([key, tutorial]) => (
                <Card key={key} className="group hover:shadow-lg transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {tutorial.title}
                          <Badge variant="secondary" className="text-xs">
                            {tutorial.steps.length} steps
                          </Badge>
                        </CardTitle>
                        <CardDescription className="mt-2">
                          {tutorial.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CustomButton
                      variant="create"
                      size="sm"
                      onClick={() => startTutorial(key)}
                      className="w-full"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start Tutorial
                    </CustomButton>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Tips & Articles Tab */}
          <TabsContent value="tips" className="space-y-6 mt-6">
            {/* Financial Tips Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {FINANCIAL_TIPS.map((tip) => {
                const Icon = tip.icon;
                return (
                  <Card key={tip.id} className="group hover:shadow-lg transition-all">
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${tip.bgColor} shrink-0`}>
                          <Icon className={`w-5 h-5 ${tip.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Badge variant="secondary" className="text-xs mb-2">
                            {tip.category}
                          </Badge>
                          <CardTitle className="text-base">{tip.title}</CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {tip.content}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Best Practices Section */}
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-primary" />
                  Getting the Most from BudgetWise
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">1</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Start with Income</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Add your monthly income first. The app uses this to calculate your System Budgets automatically.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">2</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Categorize Your Expenses</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Mark each expense as a Need or Want. This helps the app assign them to the right System Budget.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">3</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Use Custom Budgets for Events</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Planning a trip or special event? Create a Custom Budget to track all related expenses separately.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">4</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Set Financial Goals</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Use the Goals feature to track savings objectives without moving real money. Perfect for planning future purchases.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">5</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Review Monthly Reports</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Check the Reports page to analyze spending trends, identify patterns, and make informed decisions.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Tips */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Smart Habits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>✓ Import bank statements weekly to stay current</p>
                  <p>✓ Use automation rules to save time on categorization</p>
                  <p>✓ Enable notifications for important updates</p>
                  <p>✓ Review your budget health score regularly</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-sky-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-blue-600" />
                    Pro Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>✓ Use recurring transactions for regular bills</p>
                  <p>✓ Create Custom Budgets before major events</p>
                  <p>✓ Set percentage-based goals for flexible saving</p>
                  <p>✓ Check feasibility before committing to goals</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}