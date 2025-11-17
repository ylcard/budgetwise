import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Categories from './pages/Categories';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Budgets from './pages/Budgets';
import BudgetDetail from './pages/BudgetDetail';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Transactions": Transactions,
    "Categories": Categories,
    "Reports": Reports,
    "Settings": Settings,
    "Budgets": Budgets,
    "BudgetDetail": BudgetDetail,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};