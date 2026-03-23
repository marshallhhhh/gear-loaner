import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import NotFound from './pages/public/NotFound.jsx';
import Home from './pages/public/Home.jsx';

const Login = lazy(() => import('./pages/auth/Login.jsx'));
const SignUp = lazy(() => import('./pages/auth/SignUp.jsx'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword.jsx'));
const GearLanding = lazy(() => import('./pages/public/GearLanding.jsx'));
const ReportFound = lazy(() => import('./pages/public/ReportFound.jsx'));
const MyLoans = lazy(() => import('./pages/member/MyLoans.jsx'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard.jsx'));
const GearManagement = lazy(() => import('./pages/admin/GearManagement.jsx'));
const GearDetail = lazy(() => import('./pages/admin/GearDetail.jsx'));
const LoanHistory = lazy(() => import('./pages/admin/LoanHistory.jsx'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement.jsx'));
const UserDetail = lazy(() => import('./pages/admin/UserDetail.jsx'));
const PrintTags = lazy(() => import('./pages/admin/PrintTags.jsx'));
const FoundReports = lazy(() => import('./pages/admin/FoundReports.jsx'));

function PageSpinner() {
  return (
    <div className="flex justify-center items-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center py-20">
          <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
          <p className="text-gray-500 mb-4">An unexpected error occurred.</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <Layout>
        <Suspense fallback={<PageSpinner />}>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/gear/:id" element={<GearLanding />} />
            <Route path="/gear/:id/report-found" element={<ReportFound />} />

            {/* Member (authenticated) */}
            <Route
              path="/my-loans"
              element={
                <ProtectedRoute>
                  <MyLoans />
                </ProtectedRoute>
              }
            />

            {/* Admin */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/gear"
              element={
                <ProtectedRoute adminOnly>
                  <GearManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/gear/:id"
              element={
                <ProtectedRoute adminOnly>
                  <GearDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/loans"
              element={
                <ProtectedRoute adminOnly>
                  <LoanHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute adminOnly>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users/:id"
              element={
                <ProtectedRoute adminOnly>
                  <UserDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/print-tags"
              element={
                <ProtectedRoute adminOnly>
                  <PrintTags />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/found-reports"
              element={
                <ProtectedRoute adminOnly>
                  <FoundReports />
                </ProtectedRoute>
              }
            />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Layout>
    </ErrorBoundary>
  );
}
