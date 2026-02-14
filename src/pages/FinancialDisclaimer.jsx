import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, TrendingUp, Calculator, DollarSign } from "lucide-react";

export default function FinancialDisclaimer() {
    return (
        <div className="min-h-screen p-4 md:p-8 pb-24 bg-gray-50/50">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="text-center space-y-2 mb-8">
                    <AlertTriangle className="w-12 h-12 mx-auto text-amber-600" />
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Financial Disclaimer</h1>
                    <p className="text-gray-500">Last Updated: February 14, 2026</p>
                </div>

                <Card className="border-red-200 bg-red-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-900">
                            <AlertTriangle className="w-5 h-5" /> Critical Notice
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-red-800 font-semibold">
                            BudgetWise is a budgeting and financial tracking tool for informational and organizational purposes only. It is NOT financial advice, and we are NOT certified financial advisors, accountants, tax professionals, or investment advisors.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5" /> Not Financial Advice
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-gray-700">
                            All information, features, calculations, and suggestions provided by BudgetWise are for <strong>informational purposes only</strong> and should not be construed as:
                        </p>

                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <ul className="list-disc pl-6 space-y-2 text-sm text-gray-700">
                                <li><strong>Financial advice</strong> or recommendations on investments, budgeting strategies, or financial planning</li>
                                <li><strong>Tax advice</strong> or guidance on tax planning, deductions, or compliance</li>
                                <li><strong>Legal advice</strong> regarding financial contracts, debt, or obligations</li>
                                <li><strong>Investment recommendations</strong> or analysis of securities, stocks, or portfolios</li>
                                <li><strong>Accounting services</strong> or certified financial statements</li>
                                <li><strong>Credit counseling</strong> or debt management advice</li>
                            </ul>
                        </div>

                        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mt-4">
                            <p className="text-sm text-amber-900 font-semibold">
                                ⚠️ Always consult with qualified financial professionals before making significant financial decisions.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calculator className="w-5 h-5" /> Accuracy of Data & Calculations
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-gray-700">
                            While we strive to provide accurate and reliable tools, we make <strong>no guarantees</strong> about the accuracy, completeness, or reliability of:
                        </p>

                        <div className="space-y-3">
                            <div className="border-l-4 border-blue-500 pl-4">
                                <h5 className="font-semibold text-gray-900">Data Processing</h5>
                                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-600">
                                    <li>Transaction categorization (including AI-powered suggestions)</li>
                                    <li>Budget calculations and projections</li>
                                    <li>Exchange rate conversions and multi-currency calculations</li>
                                    <li>Investment portfolio valuations (eToro data)</li>
                                </ul>
                            </div>

                            <div className="border-l-4 border-purple-500 pl-4">
                                <h5 className="font-semibold text-gray-900">Third-Party Data</h5>
                                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-600">
                                    <li>Bank transaction data synced via TrueLayer</li>
                                    <li>Investment data from eToro API</li>
                                    <li>Exchange rates from Frankfurter/ECB APIs</li>
                                    <li>Any data imported from CSV files or external sources</li>
                                </ul>
                            </div>

                            <div className="border-l-4 border-green-500 pl-4">
                                <h5 className="font-semibold text-gray-900">Reports & Visualizations</h5>
                                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-600">
                                    <li>Charts and graphs generated using Recharts library</li>
                                    <li>Date-based calculations using moment.js and date-fns</li>
                                    <li>Financial health scores and projections</li>
                                    <li>Recurring transaction estimates and forecasts</li>
                                </ul>
                            </div>
                        </div>

                        <div className="bg-red-50 border border-red-300 rounded-lg p-4 mt-4">
                            <p className="text-sm text-red-800">
                                <strong>Errors May Occur:</strong> Software bugs, integration failures, or user input errors may result in inaccurate calculations. Always verify critical financial data independently.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>No Liability for Financial Decisions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-gray-700">
                            <strong>You are solely responsible</strong> for all financial decisions you make. BudgetWise and its creators, employees, and affiliates shall not be held liable for:
                        </p>

                        <ul className="list-disc pl-6 space-y-2 text-sm text-gray-700">
                            <li>Financial losses resulting from decisions based on app data or features</li>
                            <li>Missed payments, overdrafts, or late fees due to reliance on app notifications or reminders</li>
                            <li>Tax penalties or legal issues arising from incorrect categorization or record-keeping</li>
                            <li>Investment losses related to portfolio tracking features</li>
                            <li>Errors in budget projections or spending forecasts</li>
                            <li>Inaccurate exchange rate conversions affecting multi-currency transactions</li>
                            <li>Any damages caused by third-party data providers or integrations</li>
                        </ul>

                        <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 mt-4">
                            <p className="text-sm text-gray-700 font-semibold">
                                ⚖️ Use of this app constitutes acknowledgment that all financial decisions are your own and that you bear full responsibility for outcomes.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" /> Investment Data Disclaimer
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-gray-700">
                            If you connect investment accounts (e.g., eToro), please note:
                        </p>

                        <ul className="list-disc pl-6 space-y-2 text-sm text-gray-700">
                            <li><strong>Past Performance:</strong> Historical portfolio performance is not indicative of future results</li>
                            <li><strong>Real-Time Data:</strong> Investment values displayed may not be real-time and may have delays</li>
                            <li><strong>No Trading:</strong> BudgetWise does not execute trades or manage investments. It is a tracking tool only.</li>
                            <li><strong>Third-Party Accuracy:</strong> Investment data accuracy depends on third-party APIs (eToro). We cannot guarantee correctness.</li>
                            <li><strong>Not Investment Advice:</strong> Portfolio tracking features do not constitute buy/sell recommendations</li>
                        </ul>

                        <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 mt-4">
                            <p className="text-sm text-blue-800">
                                <strong>Consult a Financial Advisor:</strong> For investment decisions, always seek guidance from licensed investment professionals who understand your specific financial situation and risk tolerance.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>User Responsibility</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-gray-700">
                            As a user of BudgetWise, you are responsible for:
                        </p>

                        <ul className="list-disc pl-6 space-y-2 text-sm text-gray-700">
                            <li><strong>Data Accuracy:</strong> Ensuring all manually entered transactions, budgets, and financial information are correct</li>
                            <li><strong>Verification:</strong> Cross-checking app calculations and reports with official bank statements and financial records</li>
                            <li><strong>Tax Compliance:</strong> Maintaining proper records for tax purposes and consulting tax professionals</li>
                            <li><strong>Security:</strong> Protecting your account credentials and monitoring for unauthorized access</li>
                            <li><strong>Professional Advice:</strong> Seeking qualified financial, legal, or tax advice when needed</li>
                            <li><strong>Due Diligence:</strong> Performing your own research and analysis before making financial decisions</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>No Warranty</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-700">
                            BudgetWise is provided "as is" without any warranties, express or implied. We do not warrant that:
                        </p>
                        <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700 mt-2">
                            <li>The app will meet your specific financial planning needs</li>
                            <li>Calculations or categorizations will be error-free</li>
                            <li>Third-party integrations will always function correctly</li>
                            <li>The service will be available uninterrupted or secure</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Regional Considerations</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-700 mb-4">
                            Financial regulations, tax laws, and best practices vary by country and region. BudgetWise:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-sm text-gray-700">
                            <li>Does not provide region-specific financial or tax guidance</li>
                            <li>May not be compliant with all local financial regulations</li>
                            <li>Should not be used as a substitute for local accounting or financial services</li>
                            <li>Requires users to understand their local tax obligations and reporting requirements</li>
                        </ul>

                        <p className="text-sm text-gray-600 mt-4">
                            Users are responsible for ensuring their use of the app complies with local laws and regulations.
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50">
                    <CardHeader>
                        <CardTitle>Questions?</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-700">
                            If you have questions about this disclaimer or need clarification on the limitations of BudgetWise, please contact us through the app's support channels. For financial advice, please consult qualified professionals.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}