// import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { SettingsProvider } from '@/components/utils/SettingsContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import "react-day-picker/style.css";
import { ThemeProvider } from "next-themes";

// Page Imports for Nested Routing
import ManagePage, { PreferencesSection, AccountSection } from './pages/Manage';
import Categories from './pages/Categories';
import Automation from './pages/Automation';
import BankSync from './pages/BankSync';
import TransactionsPage from './pages/Transactions';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
    <Layout currentPageName={currentPageName}>{children}</Layout>
    : <>{children}</>;

const AuthenticatedApp = () => {
    // const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();

    // Destructure 'user' so we can pass it to the setup hook
    const { user, isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();

    // Show loading spinner while checking app public settings or auth
    if (isLoadingPublicSettings || isLoadingAuth) {
        return (
            <div className="fixed inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    // Handle authentication errors
    if (authError) {
        if (authError.type === 'user_not_registered') {
            return <UserNotRegisteredError />;
        } else if (authError.type === 'auth_required') {
            // Redirect to login automatically
            navigateToLogin();
            return null;
        }
    }

    // Render the main app
    return (
        <LayoutWrapper currentPageName={mainPageKey}>
            <Routes>
                <Route path="/" element={<MainPage />} />

                {/* Transactions Route */}
                <Route path="/transactions" element={<TransactionsPage />} />

                {/* Manage Nested Routes */}
                <Route path="/manage" element={<ManagePage />}>
                    <Route index element={<Navigate to="preferences" replace />} />
                    <Route path="preferences" element={<PreferencesSection />} />
                    <Route path="categories" element={<Categories />} />
                    <Route path="automation" element={<Automation />} />
                    <Route path="banksync" element={<BankSync />} />
                    <Route path="account" element={<AccountSection />} />
                </Route>

                {/* Standard Page Fallback */}
                {Object.entries(Pages).map(([path, Page]) => (
                    // Skip routes we handled manually
                    (path !== 'manage' && path !== 'transactions') ?
                        <Route key={path} path={`/${path}`} element={<Page />} /> : null
                ))}
                <Route path="*" element={<PageNotFound />} />
            </Routes>
        </LayoutWrapper>
    );
};


function App() {

    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <AuthProvider>
                <SettingsProvider>
                    <QueryClientProvider client={queryClientInstance}>
                        <Router>
                            <NavigationTracker />
                            <AuthenticatedApp />
                        </Router>
                        <Toaster />
                        <VisualEditAgent />
                    </QueryClientProvider>
                </SettingsProvider>
            </AuthProvider>
        </ThemeProvider>
    )
}

export default App
