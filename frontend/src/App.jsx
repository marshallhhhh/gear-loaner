import React, { lazy, Suspense } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

const Login = lazy(() => import('./pages/auth/Login.jsx'));
const SignUp = lazy(() => import('./pages/auth/SignUp.jsx'));
const GearLanding = lazy(() => import('./pages/public/GearLanding.jsx'));
const ReportLost = lazy(() => import('./pages/public/ReportLost.jsx'));
const ScanPage = lazy(() => import('./pages/public/ScanPage.jsx'));
const MyLoans = lazy(() => import('./pages/member/MyLoans.jsx'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard.jsx'));
const GearManagement = lazy(() => import('./pages/admin/GearManagement.jsx'));
const GearDetail = lazy(() => import('./pages/admin/GearDetail.jsx'));
const LoanHistory = lazy(() => import('./pages/admin/LoanHistory.jsx'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement.jsx'));
const PrintTags = lazy(() => import('./pages/admin/PrintTags.jsx'));

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
            <Route path="/gear/:id" element={<GearLanding />} />
            <Route path="/gear/:id/report-lost" element={<ReportLost />} />

            {/* Member (authenticated) */}
            <Route
              path="/scan"
              element={
                <ProtectedRoute>
                  <ScanPage />
                </ProtectedRoute>
              }
            />
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
              path="/admin/print-tags"
              element={
                <ProtectedRoute adminOnly>
                  <PrintTags />
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

function Home() {
  return (
    <div className="text-center py-16">
      <h1 className="text-4xl font-bold mb-4">🧗 TAS Climbing Gear</h1>
      <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
        Quick self-service checkout for climbing gear. Scan a QR code on any piece of equipment to
        check it out or return it.
      </p>
      <div className="flex gap-4 justify-center">
        <Link
          to="/scan"
          className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium"
        >
          📷 Scan QR Code
        </Link>
        <Link
          to="/login"
          className="border border-primary-600 text-primary-600 hover:bg-primary-50 px-6 py-3 rounded-lg font-medium"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="text-center py-20">
      <h1 className="text-4xl font-bold text-gray-300 mb-2">404</h1>
      <p className="text-gray-500">Page not found</p>
    </div>
  );
}
