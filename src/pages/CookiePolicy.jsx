import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cookie, Info, Settings, Shield } from "lucide-react"; // UPDATED 14-Feb-2026: Added Shield icon

export default function CookiePolicy() {
    return (
        <div className="min-h-screen p-4 md:p-8 pb-24 bg-gray-50/50">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="text-center space-y-2 mb-8">
                    <Cookie className="w-12 h-12 mx-auto text-blue-600" />
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Cookie & Storage Policy</h1>
                    <p className="text-gray-500">Last Updated: February 14, 2026</p>
                </div>

                <Card className="border-blue-200 bg-blue-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-900">
                            <Info className="w-5 h-5" /> What This Policy Covers
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-blue-800">
                            This policy explains how BudgetWise uses cookies, local storage, session storage, and similar technologies to store data on your device. By using the app, you consent to the use of these technologies as described below.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>1. What Are Cookies and Local Storage?</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Cookies</h4>
                            <p className="text-sm text-gray-700">
                                Cookies are small text files stored on your browser by websites. They help remember your preferences and authentication state.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Local Storage</h4>
                            <p className="text-sm text-gray-700">
                                Local Storage is a browser feature that allows websites to store larger amounts of data on your device. Unlike cookies, this data persists even after closing the browser.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Session Storage</h4>
                            <p className="text-sm text-gray-700">
                                Session Storage is similar to Local Storage but is cleared when you close the browser tab. We use it for temporary, session-specific data.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>2. What We Store on Your Device</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <div className="border-l-4 border-green-500 pl-4">
                                <h5 className="font-semibold text-gray-900">Strictly Necessary Storage</h5>
                                <p className="text-sm text-gray-600 mb-2">Required for core app functionality. Cannot be disabled.</p>
                                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                                    <li><strong>Authentication Tokens:</strong> Used to keep you logged in securely</li>
                                    <li><strong>Session Data:</strong> Temporary data needed for the current session</li>
                                    <li><strong>Security Tokens:</strong> CSRF protection and security measures</li>
                                    <li><strong>User ID:</strong> To associate actions with your account</li>
                                </ul>
                            </div>

                            <div className="border-l-4 border-blue-500 pl-4">
                                <h5 className="font-semibold text-gray-900">Functional Storage</h5>
                                <p className="text-sm text-gray-600 mb-2">Enhances functionality and remembers your preferences.</p>
                                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                                    <li><strong>Display Settings:</strong> Currency format, date format, theme preferences</li>
                                    <li><strong>UI State:</strong> Expanded/collapsed sections, selected filters</li>
                                    <li><strong>Period Selection:</strong> Current month/year you're viewing</li>
                                    <li><strong>Form Data:</strong> Temporarily saved form inputs (e.g., draft transactions)</li>
                                </ul>
                            </div>

                            <div className="border-l-4 border-purple-500 pl-4">
                                <h5 className="font-semibold text-gray-900">Performance Storage</h5>
                                <p className="text-sm text-gray-600 mb-2">Improves app speed and reduces server requests.</p>
                                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                                    <li><strong>Cached Data:</strong> Recent transactions, categories, budgets (React Query cache)</li>
                                    <li><strong>Query State:</strong> Prevents redundant API calls for recently fetched data</li>
                                    <li><strong>Loading States:</strong> Optimistic UI updates for better responsiveness</li>
                                </ul>
                            </div>

                            <div className="border-l-4 border-orange-500 pl-4">
                                <h5 className="font-semibold text-gray-900">Analytics Storage (Minimal)</h5>
                                <p className="text-sm text-gray-600 mb-2">Basic usage tracking to improve the app.</p>
                                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                                    <li><strong>Event Tracking:</strong> Anonymized events like button clicks (via base44.analytics.track)</li>
                                    <li><strong>Error Logs:</strong> Client-side errors for debugging purposes</li>
                                    <li><strong>Feature Usage:</strong> Which features are used most (no personal financial data included)</li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>3. Third-Party Cookies & Storage</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-gray-700">
                            Some features integrate with third-party services that may set their own cookies or storage:
                        </p>

                        <div className="space-y-3">
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <h5 className="font-semibold text-gray-900 mb-1">Google Services</h5>
                                <p className="text-sm text-gray-600">
                                    If you use Google Sign-In or Google Maps features, Google may set cookies as described in <a href="https://policies.google.com/technologies/cookies" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Google's Cookie Policy</a>.
                                </p>
                            </div>

                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <h5 className="font-semibold text-gray-900 mb-1">TrueLayer (Banking)</h5>
                                <p className="text-sm text-gray-600">
                                    When connecting bank accounts, TrueLayer may use cookies for authentication and security. See <a href="https://truelayer.com/privacy/" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">TrueLayer's Privacy Policy</a>.
                                </p>
                            </div>

                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <h5 className="font-semibold text-gray-900 mb-1">eToro (Investments)</h5>
                                <p className="text-sm text-gray-600">
                                    If you connect eToro for portfolio tracking, eToro may set cookies. See <a href="https://www.etoro.com/customer-service/privacy-policy/" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">eToro's Cookie Policy</a>.
                                </p>
                            </div>
                        </div>

                        <p className="text-sm text-gray-600 mt-4">
                            <strong>Note:</strong> We do not control third-party cookies. Review their policies for details on how they use cookies.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>4. GDPR Compliance (EU Users)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-gray-700">
                            Under the General Data Protection Regulation (GDPR), we are required to inform EU users about the use of cookies and storage technologies.
                        </p>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h5 className="font-semibold text-blue-900 mb-2">Your Rights</h5>
                            <ul className="list-disc pl-6 space-y-1 text-sm text-blue-800">
                                <li><strong>Right to Know:</strong> You have the right to know what data is stored locally</li>
                                <li><strong>Right to Delete:</strong> You can clear your browser storage at any time</li>
                                <li><strong>Right to Object:</strong> You can disable non-essential cookies (though this may limit functionality)</li>
                                <li><strong>Right to Withdraw Consent:</strong> You can revoke consent by clearing browser data</li>
                            </ul>
                        </div>

                        <p className="text-sm text-gray-700">
                            By continuing to use BudgetWise, you consent to the storage of data as described in this policy. If you are located in the EU and wish to withdraw consent, you must clear your browser storage and discontinue use of the app.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="w-5 h-5" /> 5. Managing Cookies & Storage
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <h4 className="font-semibold text-gray-900">Browser Settings</h4>
                        <p className="text-sm text-gray-700">
                            You can manage or delete cookies and local storage through your browser settings:
                        </p>

                        <div className="grid md:grid-cols-2 gap-4 mt-3">
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <h5 className="font-semibold text-gray-900 text-sm mb-1">Chrome</h5>
                                <p className="text-xs text-gray-600">Settings → Privacy and security → Clear browsing data</p>
                            </div>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <h5 className="font-semibold text-gray-900 text-sm mb-1">Firefox</h5>
                                <p className="text-xs text-gray-600">Settings → Privacy & Security → Cookies and Site Data</p>
                            </div>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <h5 className="font-semibold text-gray-900 text-sm mb-1">Safari</h5>
                                <p className="text-xs text-gray-600">Preferences → Privacy → Manage Website Data</p>
                            </div>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <h5 className="font-semibold text-gray-900 text-sm mb-1">Edge</h5>
                                <p className="text-xs text-gray-600">Settings → Privacy, search, and services → Clear browsing data</p>
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                            <p className="text-sm text-amber-800">
                                <strong>Warning:</strong> Clearing cookies and local storage will log you out and may reset your preferences. Some app functionality may not work properly without these technologies.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>6. Privacy Signal Support (DNT & GPC)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
                            <h5 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                                Global Privacy Control (GPC) - FULLY SUPPORTED
                            </h5>
                            <p className="text-sm text-green-800 mb-3">
                                BudgetWise <strong>strictly honors</strong> the Global Privacy Control (GPC) signal as required by California Consumer Privacy Act (CCPA), General Data Protection Regulation (GDPR), and other privacy laws.
                            </p>
                            <div className="bg-white/50 rounded p-3 mb-3">
                                <p className="text-sm text-gray-800 mb-2"><strong>When GPC is enabled, we:</strong></p>
                                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                                    <li><strong>Block all non-essential tracking</strong> immediately upon detection</li>
                                    <li><strong>Disable analytics tracking</strong> (including base44.analytics.track)</li>
                                    <li><strong>Prevent third-party tracking cookies</strong> where technically feasible</li>
                                    <li><strong>Restrict data sharing</strong> with external services (except essential operations)</li>
                                    <li><strong>Display a confirmation banner</strong> confirming GPC enforcement</li>
                                </ul>
                            </div>
                            <p className="text-xs text-green-700">
                                <strong>Legal Status:</strong> GPC is legally binding under CCPA (§1798.135) and must be treated as an opt-out request. We comply fully with these requirements.
                            </p>
                        </div>

                        <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-4">
                            <h5 className="font-semibold text-blue-900 mb-2">Do Not Track (DNT) - HONORED (Best Effort)</h5>
                            <p className="text-sm text-blue-800 mb-3">
                                We honor Do Not Track (DNT) browser signals on a best-effort basis, though DNT is not legally binding and lacks industry standardization.
                            </p>
                            <div className="bg-white/50 rounded p-3">
                                <p className="text-sm text-gray-800 mb-2"><strong>When DNT is enabled, we:</strong></p>
                                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                                    <li><strong>Disable our own analytics tracking</strong></li>
                                    <li><strong>Minimize data collection</strong> to essential functionality only</li>
                                    <li><strong>Request third-party services respect DNT</strong> (though we cannot guarantee compliance)</li>
                                    <li><strong>Store only necessary cookies</strong> for authentication and preferences</li>
                                </ul>
                            </div>
                        </div>

                        <div className="bg-amber-50 border-2 border-amber-500 rounded-lg p-4">
                            <h5 className="font-semibold text-amber-900 mb-2">⚠️ Third-Party Service Disclaimer</h5>
                            <p className="text-sm text-amber-800 mb-3">
                                <strong>IMPORTANT:</strong> While we strictly enforce GPC and DNT within our own systems, we cannot fully guarantee compliance by third-party services we integrate with:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-sm text-amber-800">
                                <li>
                                    <strong>Google Services:</strong> Google Sign-In and Google Maps may set cookies regardless of privacy signals. See <a href="https://policies.google.com/technologies/cookies" className="underline" target="_blank" rel="noopener noreferrer">Google's Cookie Policy</a>.
                                </li>
                                <li>
                                    <strong>TrueLayer (Banking):</strong> Bank connection flows require authentication cookies. TrueLayer operates under UK/EU regulations. See <a href="https://truelayer.com/privacy/" className="underline" target="_blank" rel="noopener noreferrer">TrueLayer's Privacy Policy</a>.
                                </li>
                                <li>
                                    <strong>eToro (Investments):</strong> Portfolio tracking requires API access which may involve cookies. See <a href="https://www.etoro.com/customer-service/privacy-policy/" className="underline" target="_blank" rel="noopener noreferrer">eToro's Privacy Policy</a>.
                                </li>
                                <li>
                                    <strong>Currency APIs (Frankfurter/ECB):</strong> These services do not set cookies and are privacy-friendly.
                                </li>
                            </ul>
                            <p className="text-sm text-amber-800 mt-3">
                                We have implemented technical measures to minimize third-party tracking, but some essential services require cookies for authentication and security. If you have GPC or DNT enabled and wish to avoid all third-party tracking, we recommend not using these integrations.
                            </p>
                        </div>

                        <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                            <h5 className="font-semibold text-gray-900 mb-2">How to Enable GPC or DNT</h5>
                            <div className="space-y-2 text-sm text-gray-700">
                                <div>
                                    <p className="font-medium">Global Privacy Control (GPC):</p>
                                    <ul className="list-disc pl-6 text-xs mt-1">
                                        <li><strong>Chrome/Edge:</strong> Install the <a href="https://globalprivacycontrol.org/" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">GPC browser extension</a></li>
                                        <li><strong>Firefox:</strong> Built-in support (Settings → Privacy & Security → Send websites a "Do Not Track" signal)</li>
                                        <li><strong>Brave:</strong> Automatically enabled by default</li>
                                        <li><strong>DuckDuckGo Privacy Browser:</strong> Automatically enabled</li>
                                    </ul>
                                </div>
                                <div className="mt-3">
                                    <p className="font-medium">Do Not Track (DNT):</p>
                                    <ul className="list-disc pl-6 text-xs mt-1">
                                        <li><strong>Chrome:</strong> Settings → Privacy and security → Send a "Do Not Track" request</li>
                                        <li><strong>Firefox:</strong> Settings → Privacy & Security → Send websites a "Do Not Track" signal</li>
                                        <li><strong>Safari:</strong> Preferences → Privacy → Ask websites not to track me</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="bg-green-50 border border-green-300 rounded-lg p-4">
                            <h5 className="font-semibold text-green-900 mb-2">✅ Verification & Transparency</h5>
                            <p className="text-sm text-green-800">
                                When GPC or DNT is detected, BudgetWise will display a confirmation banner at the top of the app indicating that enhanced privacy mode is active. You can verify privacy signal enforcement by checking your browser's developer console (F12) for privacy signal detection logs.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>7. Data Retention</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-700 mb-3">Storage technologies retain data for varying durations:</p>
                        <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                            <li><strong>Session Storage:</strong> Cleared when you close the browser tab</li>
                            <li><strong>Authentication Tokens:</strong> Valid for 30 days or until you log out</li>
                            <li><strong>Local Storage Preferences:</strong> Retained indefinitely until manually cleared</li>
                            <li><strong>Cached Data:</strong> Automatically refreshed and replaced with newer data (typically 5-10 minutes)</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>8. Changes to This Policy</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-700">
                            We may update this Cookie Policy from time to time to reflect changes in technology or legal requirements. Changes will be posted on this page with an updated "Last Updated" date. Continued use of the app after changes constitutes acceptance of the updated policy.
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50">
                    <CardHeader>
                        <CardTitle>Questions?</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-700">
                            If you have questions about how we use cookies or local storage, please contact us through the app's support channels or review our full Privacy Policy.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}