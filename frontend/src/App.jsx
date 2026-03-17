import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/auth/Login.jsx';
import SignUp from './pages/auth/SignUp.jsx';
import GearLanding from './pages/public/GearLanding.jsx';
import ReportLost from './pages/public/ReportLost.jsx';
import ScanPage from './pages/public/ScanPage.jsx';
import MyLoans from './pages/member/MyLoans.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import GearManagement from './pages/admin/GearManagement.jsx';
import GearDetail from './pages/admin/GearDetail.jsx';
import LoanHistory from './pages/admin/LoanHistory.jsx';
import UserManagement from './pages/admin/UserManagement.jsx';

export default function App() {
  return (
    <Layout>
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

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
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
        <a
          href="/scan"
          className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium"
        >
          📷 Scan QR Code
        </a>
        <a
          href="/login"
          className="border border-primary-600 text-primary-600 hover:bg-primary-50 px-6 py-3 rounded-lg font-medium"
        >
          Sign In
        </a>
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
