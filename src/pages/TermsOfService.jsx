import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, AlertTriangle, Ban, XCircle } from "lucide-react";

export default function TermsOfService() {
    return (
        <div className="min-h-screen p-4 md:p-8 pb-24 bg-gray-50/50">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="text-center space-y-2 mb-8">
                    <FileText className="w-12 h-12 mx-auto text-blue-600" />
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Terms of Service</h1>
                    <p className="text-gray-500">Last Updated: February 14, 2026</p>
                </div>

                <Card className="border-amber-200 bg-amber-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-amber-900">
                            <AlertTriangle className="w-5 h-5" /> Important Notice
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-amber-800">
                            <strong>Please read these Terms of Service carefully before using BudgetWise.</strong> By accessing or using the app, you agree to be bound by these terms. If you do not agree, you must discontinue use immediately.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>1. Acceptance of Terms</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-gray-700">
                            By creating an account and using BudgetWise ("the Service"), you confirm that:
                        </p>
                        <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                            <li>You have read, understood, and agree to these Terms of Service</li>
                            <li>You have read and agree to our Privacy Policy and Cookie Policy</li>
                            <li>You meet the eligibility requirements outlined below</li>
                            <li>You will comply with all applicable laws and regulations</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>2. User Eligibility</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-gray-700">To use BudgetWise, you must:</p>
                        
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <ul className="list-disc pl-6 space-y-2 text-sm text-gray-700">
                                <li><strong>Be at least 18 years old</strong> or the age of majority in your jurisdiction</li>
                                <li>Have the legal capacity to enter into binding contracts</li>
                                <li>Provide accurate and complete registration information</li>
                                <li>Maintain the security of your account credentials</li>
                                <li>Not be prohibited from using the Service under applicable laws</li>
                            </ul>
                        </div>

                        <p className="text-sm text-gray-700">
                            <strong>Parental Supervision:</strong> If you are between 13-17 years old and your local laws permit use with parental consent, you may use the Service only under the direct supervision of a parent or legal guardian who agrees to these terms.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>3. Account Responsibilities</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <h4 className="font-semibold text-gray-900 mb-2">You are responsible for:</h4>
                        <ul className="list-disc pl-6 space-y-2 text-sm text-gray-700">
                            <li>Maintaining the confidentiality of your login credentials</li>
                            <li>All activities that occur under your account</li>
                            <li>Notifying us immediately of any unauthorized access</li>
                            <li>Ensuring your account information is accurate and up-to-date</li>
                            <li>The accuracy of all financial data you enter into the app</li>
                        </ul>

                        <p className="text-sm text-gray-600 mt-4">
                            <strong>Note:</strong> We are not responsible for losses resulting from unauthorized use of your account if you fail to maintain adequate security measures.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Ban className="w-5 h-5 text-red-600" /> 4. Prohibited Conduct
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-gray-700">You agree NOT to:</p>

                        <div className="space-y-3">
                            <div className="border-l-4 border-red-500 pl-4">
                                <h5 className="font-semibold text-gray-900">4.1 Misuse the Service</h5>
                                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-600">
                                    <li>Use the app for illegal activities or money laundering</li>
                                    <li>Enter fraudulent or misleading financial information</li>
                                    <li>Attempt to manipulate, exploit, or abuse app features</li>
                                    <li>Use automated systems (bots, scrapers) without authorization</li>
                                </ul>
                            </div>

                            <div className="border-l-4 border-red-500 pl-4">
                                <h5 className="font-semibold text-gray-900">4.2 Compromise Security</h5>
                                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-600">
                                    <li>Attempt to gain unauthorized access to other users' accounts or data</li>
                                    <li>Introduce viruses, malware, or harmful code</li>
                                    <li>Circumvent security measures or access controls</li>
                                    <li>Probe, scan, or test vulnerabilities without permission</li>
                                </ul>
                            </div>

                            <div className="border-l-4 border-red-500 pl-4">
                                <h5 className="font-semibold text-gray-900">4.3 Violate Third-Party Rights</h5>
                                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-600">
                                    <li>Share or access another person's account without permission</li>
                                    <li>Connect bank accounts or financial services you don't own</li>
                                    <li>Violate intellectual property rights or privacy rights</li>
                                    <li>Impersonate another person or entity</li>
                                </ul>
                            </div>

                            <div className="border-l-4 border-red-500 pl-4">
                                <h5 className="font-semibold text-gray-900">4.4 Commercial Misuse</h5>
                                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-600">
                                    <li>Resell, redistribute, or commercially exploit the Service</li>
                                    <li>Use the app to provide services to third parties</li>
                                    <li>Reverse engineer, decompile, or extract source code</li>
                                    <li>Remove or alter copyright notices or branding</li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-red-600" /> 5. Account Termination
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <h4 className="font-semibold text-gray-900">5.1 Termination by You</h4>
                        <p className="text-sm text-gray-700">
                            You may terminate your account at any time through the Account Settings page. Upon termination:
                        </p>
                        <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                            <li>Your access to the Service will cease immediately</li>
                            <li>All your data will be permanently deleted within 90 days</li>
                            <li>You may export your data before deletion using the Data Export feature</li>
                        </ul>

                        <h4 className="font-semibold text-gray-900 mt-6">5.2 Termination by Us</h4>
                        <p className="text-sm text-gray-700">
                            We reserve the right to suspend or terminate your account immediately, without notice, if:
                        </p>
                        <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                            <li>You violate these Terms of Service</li>
                            <li>Your account is used for illegal or fraudulent activities</li>
                            <li>We detect suspicious security issues or unauthorized access</li>
                            <li>You fail to pay applicable fees (if any)</li>
                            <li>We are required to do so by law or court order</li>
                        </ul>

                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                            <p className="text-sm text-red-800">
                                <strong>Important:</strong> Termination does not absolve you of any obligations incurred before termination. We are not liable for any damages or losses resulting from account suspension or termination.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>6. Intellectual Property</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-700 mb-4">
                            All content, features, and functionality of BudgetWise (including but not limited to software, design, text, graphics, logos) are owned by us or our licensors and are protected by copyright, trademark, and other intellectual property laws.
                        </p>

                        <h4 className="font-semibold text-gray-900 mb-2">License Grant</h4>
                        <p className="text-sm text-gray-700">
                            Subject to these terms, we grant you a limited, non-exclusive, non-transferable, revocable license to access and use BudgetWise for your personal, non-commercial use only.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>7. Disclaimer of Warranties</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <p className="text-sm text-gray-700 font-semibold mb-2">THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE"</p>
                            <p className="text-sm text-gray-700">
                                We make no warranties or representations about:
                            </p>
                            <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700 mt-2">
                                <li>Accuracy, reliability, or completeness of financial data</li>
                                <li>Uninterrupted or error-free operation</li>
                                <li>Security against unauthorized access or data breaches</li>
                                <li>Compatibility with your devices or other software</li>
                                <li>Suitability for your specific financial needs</li>
                            </ul>
                        </div>

                        <p className="text-sm text-gray-600">
                            You use the Service at your own risk. We disclaim all warranties, express or implied, including merchantability, fitness for a particular purpose, and non-infringement.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>8. Limitation of Liability</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-700 mb-4">
                            TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-sm text-gray-700">
                            <li>Any indirect, incidental, consequential, or punitive damages</li>
                            <li>Loss of profits, revenue, data, or business opportunities</li>
                            <li>Financial decisions made based on app data or calculations</li>
                            <li>Errors or inaccuracies in transaction categorization or reporting</li>
                            <li>Losses resulting from third-party service failures (banks, eToro, etc.)</li>
                            <li>Unauthorized access to your account due to your negligence</li>
                        </ul>

                        <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 mt-4">
                            <p className="text-sm text-gray-700">
                                <strong>Maximum Liability:</strong> Our total liability for all claims shall not exceed the amount you paid us (if any) in the 12 months preceding the claim, or $100, whichever is greater.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>9. Indemnification</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-700">
                            You agree to indemnify, defend, and hold harmless BudgetWise, its affiliates, and their respective officers, directors, employees, and agents from any claims, liabilities, damages, losses, or expenses (including legal fees) arising from:
                        </p>
                        <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700 mt-2">
                            <li>Your violation of these Terms</li>
                            <li>Your misuse of the Service</li>
                            <li>Your violation of any third-party rights</li>
                            <li>Any data you provide to the Service</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>10. Changes to Terms</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-700">
                            We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting. Material changes will be communicated via email or in-app notification. Your continued use of the Service after changes constitutes acceptance of the updated Terms.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>11. Governing Law</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-700">
                            These Terms shall be governed by and construed in accordance with the laws of your jurisdiction, without regard to conflict of law principles. Any disputes shall be resolved in the courts of your jurisdiction.
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50">
                    <CardHeader>
                        <CardTitle>Contact & Support</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-700">
                            For questions about these Terms or to report violations, please contact us through the app's support channels or your account administrator.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}