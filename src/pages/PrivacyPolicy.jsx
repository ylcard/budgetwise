import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Database, Eye, Globe } from "lucide-react";

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen p-4 md:p-8 pb-24 bg-gray-50/50">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="text-center space-y-2 mb-8">
                    <Shield className="w-12 h-12 mx-auto text-blue-600" />
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Privacy Policy</h1>
                    <p className="text-gray-500">Last Updated: February 14, 2026</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Eye className="w-5 h-5" /> Introduction
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-sm max-w-none">
                        <p>
                            BudgetWise ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our personal finance management application.
                        </p>
                        <p className="font-semibold text-gray-900">
                            By using BudgetWise, you agree to the collection and use of information in accordance with this policy.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="w-5 h-5" /> Data We Collect
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-2">1. Personal Information</h3>
                            <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                                <li><strong>Account Data:</strong> Email address, full name, profile picture (if using Google authentication)</li>
                                <li><strong>Authentication:</strong> Login credentials, authentication tokens, session data</li>
                                <li><strong>User Settings:</strong> Display preferences, currency settings, date formats</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold text-gray-900 mb-2">2. Financial Information</h3>
                            <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                                <li><strong>Transactions:</strong> Income and expense records, amounts, dates, descriptions, categories</li>
                                <li><strong>Budgets:</strong> Budget goals, allocations, spending limits</li>
                                <li><strong>Bank Connections:</strong> Bank account details, transaction history (when using TrueLayer integration)</li>
                                <li><strong>Investment Data:</strong> eToro portfolio holdings, values, performance (when connected)</li>
                                <li><strong>Currency Data:</strong> Exchange rates, multi-currency transactions</li>
                                <li><strong>Recurring Transactions:</strong> Scheduled payments, bills, subscriptions</li>
                                <li><strong>Cash Wallet:</strong> Physical cash tracking data</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold text-gray-900 mb-2">3. Technical Information</h3>
                            <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                                <li><strong>Usage Data:</strong> Pages visited, features used, interaction patterns</li>
                                <li><strong>Device Data:</strong> Browser type, device type, operating system</li>
                                <li><strong>Log Data:</strong> IP address, timestamps, error logs</li>
                                <li><strong>Local Storage:</strong> Session data, cached preferences, temporary data</li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="w-5 h-5" /> Third-Party Services
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-gray-700">
                            We integrate with the following third-party services. Your data may be transmitted to these services:
                        </p>

                        <div className="space-y-3">
                            <div className="border-l-4 border-blue-500 pl-4">
                                <h4 className="font-semibold text-gray-900">Google Services</h4>
                                <p className="text-sm text-gray-600">Used for authentication and optional map features. Subject to <a href="https://policies.google.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Google's Privacy Policy</a>.</p>
                            </div>

                            <div className="border-l-4 border-green-500 pl-4">
                                <h4 className="font-semibold text-gray-900">TrueLayer</h4>
                                <p className="text-sm text-gray-600">Banking integration for automatic transaction sync. Subject to <a href="https://truelayer.com/privacy/" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">TrueLayer's Privacy Policy</a>.</p>
                            </div>

                            <div className="border-l-4 border-purple-500 pl-4">
                                <h4 className="font-semibold text-gray-900">eToro</h4>
                                <p className="text-sm text-gray-600">Investment portfolio tracking. Subject to <a href="https://www.etoro.com/customer-service/privacy-policy/" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">eToro's Privacy Policy</a>.</p>
                            </div>

                            <div className="border-l-4 border-orange-500 pl-4">
                                <h4 className="font-semibold text-gray-900">Frankfurter / ECB APIs</h4>
                                <p className="text-sm text-gray-600">Exchange rate data. Currency codes are transmitted for rate lookups. No personal financial data is sent.</p>
                            </div>

                            <div className="border-l-4 border-slate-500 pl-4">
                                <h4 className="font-semibold text-gray-900">Gemini AI / Groq AI</h4>
                                <p className="text-sm text-gray-600">Used for transaction categorization. Transaction descriptions (without sensitive details) may be processed for AI-powered categorization.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lock className="w-5 h-5" /> Security Measures
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-gray-700">
                            We implement industry-standard security measures to protect your data:
                        </p>

                        <ul className="list-disc pl-6 space-y-2 text-sm text-gray-700">
                            <li><strong>Encryption:</strong> All data transmitted between your device and our servers is encrypted using HTTPS/TLS protocols</li>
                            <li><strong>Authentication:</strong> Secure OAuth 2.0 authentication for Google login, password hashing for email/password accounts</li>
                            <li><strong>Access Control:</strong> Row-level security ensures users can only access their own data</li>
                            <li><strong>Token Management:</strong> Authentication tokens are securely stored and regularly rotated</li>
                            <li><strong>Bank Connections:</strong> We never store your bank login credentials. All bank integrations use OAuth tokens managed by TrueLayer</li>
                            <li><strong>Data Isolation:</strong> Your financial data is logically isolated and cannot be accessed by other users</li>
                        </ul>

                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                            <p className="text-sm text-amber-800">
                                <strong>Important:</strong> While we employ robust security measures, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>How We Use Your Data</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="list-disc pl-6 space-y-2 text-sm text-gray-700">
                            <li>To provide core budgeting and financial tracking features</li>
                            <li>To sync transactions from connected bank accounts</li>
                            <li>To categorize transactions automatically using AI</li>
                            <li>To generate financial reports and insights</li>
                            <li>To calculate exchange rates for multi-currency support</li>
                            <li>To send email notifications (if enabled by you)</li>
                            <li>To improve app performance and user experience</li>
                            <li>To detect and prevent fraud or security issues</li>
                        </ul>

                        <p className="text-sm text-gray-700 mt-4">
                            <strong>We do NOT:</strong>
                        </p>
                        <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                            <li>Sell your personal or financial data to third parties</li>
                            <li>Use your data for marketing purposes without consent</li>
                            <li>Share your data with advertisers</li>
                            <li>Access your data unless necessary for support or security</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Your Rights</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-gray-700">You have the right to:</p>
                        
                        <ul className="list-disc pl-6 space-y-2 text-sm text-gray-700">
                            <li><strong>Access:</strong> View all your personal and financial data stored in the app</li>
                            <li><strong>Export:</strong> Download your complete data in JSON format (available in Account Settings)</li>
                            <li><strong>Correct:</strong> Update or correct inaccurate information at any time</li>
                            <li><strong>Delete:</strong> Request complete deletion of your account and all associated data</li>
                            <li><strong>Revoke:</strong> Disconnect third-party integrations (banks, eToro) at any time</li>
                            <li><strong>Opt-Out:</strong> Disable email notifications or specific features</li>
                        </ul>

                        <p className="text-sm text-gray-600 mt-4">
                            To exercise any of these rights, visit your Account Settings or contact us directly.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Data Retention</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-700">
                            We retain your data for as long as your account is active. If you delete your account:
                        </p>
                        <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700 mt-2">
                            <li>All personal and financial data is immediately deleted from active systems</li>
                            <li>Backups may retain data for up to 90 days for disaster recovery purposes</li>
                            <li>Anonymized analytics data may be retained indefinitely</li>
                            <li>Data required for legal or regulatory compliance will be retained as required by law</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Children's Privacy</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-700">
                            BudgetWise is not intended for users under 18 years of age. We do not knowingly collect personal information from children. If you believe we have inadvertently collected data from a minor, please contact us immediately.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Changes to This Policy</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-700">
                            We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last Updated" date. Your continued use of the app after changes constitutes acceptance of the updated policy.
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50">
                    <CardHeader>
                        <CardTitle>Contact Us</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-700">
                            If you have questions about this Privacy Policy or your data, please contact us through the app's support channels or your account administrator.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}