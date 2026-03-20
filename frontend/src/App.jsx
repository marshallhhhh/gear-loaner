import React, { lazy, Suspense, useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { CameraIcon } from '@heroicons/react/24/outline';
import Alert from './components/Alert.jsx';
import QRScanner from './components/QRScanner.jsx';

const Login = lazy(() => import('./pages/auth/Login.jsx'));
const SignUp = lazy(() => import('./pages/auth/SignUp.jsx'));
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

function Home() {
  const { isAuthenticated } = useAuth();
  const [shortId, setShortId] = useState('');
  const [error, setError] = useState('');

  function handleSearch() {
    const shortIdRegex = /^[A-Za-z]{3}-\d{3}$/;
    if (shortIdRegex.test(shortId.trim())) {
      setError('');
      window.location.href = `/gear/${shortId.trim()}`;
    } else {
      setError('Please enter a valid short ID (e.g. SHO-123)');
    }
  }

  function handleScan(decodedText) {
    // Match /gear/{shortId} (AAA-XXX) or /gear/{uuid}
    const match = decodedText.match(/\/gear\/([A-Za-z0-9]{3}-[A-Za-z0-9]+|[a-f0-9-]{36})/i);
    if (match) {
      navigate(`/gear/${match[1]}`);
    } else {
      setError('Invalid QR code. Expected a gear URL.');
    }
  }

  return (
    <div className="text-center py-16">
      <h1 className="text-4xl font-bold mb-4">TUMC Gear</h1>
      <p className="text-lg text-gray-600 mb-4 max-w-md mx-auto">
        Self-service checkout for climbing gear. Scan or enter the code on any piece of gear to check it out or return it.
      </p>
      <div className="flex gap-4 justify-center">
        <QRScanner onScan={handleScan} onError={(msg) => setError(msg)} />
        {!isAuthenticated && (
          <Link
            to="/login"
            className="border border-primary-600 text-primary-600 hover:bg-primary-50 px-6 py-3 rounded-lg font-medium inline-flex items-center text-xl"
          >
            Sign In
          </Link>
        )}
      </div>
      <p className="py-3 text-gray-500">or enter a short ID</p>
      <form onSubmit={(e) => {e.preventDefault(); handleSearch();}} className="flex justify-center max-w-sm mx-auto">
        <input
            type="text"
            placeholder="SHO-123"
            className="flex-1 border rounded-lg px-2 py-2 focus:ring-2 focus:ring-primary-500 outline-none text-center text-xl"
            value={shortId}
            onChange={(e) => setShortId(e.target.value.toUpperCase())}
        />
        <button className="flex-1 border rounded-lg px-2 py-2 mx-2 focus:ring-2 focus:ring-primary-500 outline-none text-center text-xl" onClick={handleSearch}>Submit</button>
      </form>
      <Alert type="error" className="max-w-md mx-auto mt-8 text-lg">{error}</Alert>
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
