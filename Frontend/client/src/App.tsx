import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";

// Public pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

// Student pages
import StudentDashboard from "./pages/student/StudentDashboard";
import PocketMoney from "./pages/student/PocketMoney";
import SemesterBudget from "./pages/student/SemesterBudget";
import ProjectExpenses from "./pages/student/ProjectExpenses";
import SavingsGoals from "./pages/student/SavingsGoals";
import ReceiptScanner from "./pages/student/ReceiptScanner";
import VoiceExpense from "./pages/student/VoiceExpense";

// Professional pages
import ProfessionalDashboard from "./pages/professional/ProfessionalDashboard";
import Income from "./pages/professional/Income";
import Predictions from "./pages/professional/Predictions";
import EmergencyFund from "./pages/professional/EmergencyFund";
import Subscriptions from "./pages/professional/Subscriptions";

// Shared pages
import Expenses from "./pages/shared/Expenses";
import Budget from "./pages/shared/Budget";
import Transactions from "./pages/shared/Transactions";
import AIInsights from "./pages/shared/AIInsights";
import Analytics from "./pages/shared/Analytics";
import Reports from "./pages/shared/Reports";
import Settings from "./pages/shared/Settings";
import Notifications from "./pages/shared/Notifications";

function Router() {
  return (
    <Switch>
      {/* ── Public ── */}
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/signup" component={Register} />

      {/* ── Student routes ── */}
      <Route path="/student">
        <ProtectedRoute allowedRole="student"><StudentDashboard /></ProtectedRoute>
      </Route>
      <Route path="/student/pocket-money">
        <ProtectedRoute allowedRole="student"><PocketMoney /></ProtectedRoute>
      </Route>
      <Route path="/student/expenses">
        <ProtectedRoute allowedRole="student"><Expenses /></ProtectedRoute>
      </Route>
      <Route path="/student/budget">
        <ProtectedRoute allowedRole="student"><Budget /></ProtectedRoute>
      </Route>
      <Route path="/student/semester-budget">
        <ProtectedRoute allowedRole="student"><SemesterBudget /></ProtectedRoute>
      </Route>
      <Route path="/student/project-expenses">
        <ProtectedRoute allowedRole="student"><ProjectExpenses /></ProtectedRoute>
      </Route>
      <Route path="/student/savings-goals">
        <ProtectedRoute allowedRole="student"><SavingsGoals /></ProtectedRoute>
      </Route>
      <Route path="/student/emergency-fund">
        <ProtectedRoute allowedRole="student"><EmergencyFund /></ProtectedRoute>
      </Route>
      <Route path="/student/predictions">
        <ProtectedRoute allowedRole="student"><Predictions /></ProtectedRoute>
      </Route>
      <Route path="/student/ai-insights">
        <ProtectedRoute allowedRole="student"><AIInsights /></ProtectedRoute>
      </Route>
      <Route path="/student/analytics">
        <ProtectedRoute allowedRole="student"><Analytics /></ProtectedRoute>
      </Route>
      <Route path="/student/reports">
        <ProtectedRoute allowedRole="student"><Reports /></ProtectedRoute>
      </Route>
      <Route path="/student/receipt-scanner">
        <ProtectedRoute allowedRole="student"><ReceiptScanner /></ProtectedRoute>
      </Route>
      <Route path="/student/voice-expense">
        <ProtectedRoute allowedRole="student"><VoiceExpense /></ProtectedRoute>
      </Route>
      <Route path="/student/subscriptions">
        <ProtectedRoute allowedRole="student"><Subscriptions /></ProtectedRoute>
      </Route>
      <Route path="/student/transactions">
        <ProtectedRoute allowedRole="student"><Transactions /></ProtectedRoute>
      </Route>
      <Route path="/student/notifications">
        <ProtectedRoute allowedRole="student"><Notifications /></ProtectedRoute>
      </Route>
      <Route path="/student/settings">
        <ProtectedRoute allowedRole="student"><Settings /></ProtectedRoute>
      </Route>

      {/* ── Professional routes ── */}
      <Route path="/professional">
        <ProtectedRoute allowedRole="professional"><ProfessionalDashboard /></ProtectedRoute>
      </Route>
      <Route path="/professional/income">
        <ProtectedRoute allowedRole="professional"><Income /></ProtectedRoute>
      </Route>
      <Route path="/professional/expenses">
        <ProtectedRoute allowedRole="professional"><Expenses /></ProtectedRoute>
      </Route>
      <Route path="/professional/budget">
        <ProtectedRoute allowedRole="professional"><Budget /></ProtectedRoute>
      </Route>
      <Route path="/professional/savings-goals">
        <ProtectedRoute allowedRole="professional"><SavingsGoals /></ProtectedRoute>
      </Route>
      <Route path="/professional/emergency-fund">
        <ProtectedRoute allowedRole="professional"><EmergencyFund /></ProtectedRoute>
      </Route>
      <Route path="/professional/predictions">
        <ProtectedRoute allowedRole="professional"><Predictions /></ProtectedRoute>
      </Route>
      <Route path="/professional/ai-insights">
        <ProtectedRoute allowedRole="professional"><AIInsights /></ProtectedRoute>
      </Route>
      <Route path="/professional/analytics">
        <ProtectedRoute allowedRole="professional"><Analytics /></ProtectedRoute>
      </Route>
      <Route path="/professional/reports">
        <ProtectedRoute allowedRole="professional"><Reports /></ProtectedRoute>
      </Route>
      <Route path="/professional/receipt-scanner">
        <ProtectedRoute allowedRole="professional"><ReceiptScanner /></ProtectedRoute>
      </Route>
      <Route path="/professional/voice-expense">
        <ProtectedRoute allowedRole="professional"><VoiceExpense /></ProtectedRoute>
      </Route>
      <Route path="/professional/subscriptions">
        <ProtectedRoute allowedRole="professional"><Subscriptions /></ProtectedRoute>
      </Route>
      <Route path="/professional/transactions">
        <ProtectedRoute allowedRole="professional"><Transactions /></ProtectedRoute>
      </Route>
      <Route path="/professional/notifications">
        <ProtectedRoute allowedRole="professional"><Notifications /></ProtectedRoute>
      </Route>
      <Route path="/professional/settings">
        <ProtectedRoute allowedRole="professional"><Settings /></ProtectedRoute>
      </Route>

      {/* ── Fallback ── */}
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <TooltipProvider>
            <Toaster position="top-right" />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
