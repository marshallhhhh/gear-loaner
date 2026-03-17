import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Layout({ children }) {
  const { isAuthenticated, isAdmin, profile, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-primary-700 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-tight">
            🧗 TAS Climbing Gear
          </Link>

          <nav className="flex items-center gap-4 text-sm">
            {isAuthenticated ? (
              <>
                <Link to="/scan" className="hover:text-primary-200">
                  Scan QR
                </Link>
                <Link to="/my-loans" className="hover:text-primary-200">
                  My Loans
                </Link>
                {isAdmin && (
                  <>
                    <Link to="/admin" className="hover:text-primary-200">
                      Dashboard
                    </Link>
                    <Link to="/admin/gear" className="hover:text-primary-200">
                      Gear
                    </Link>
                    <Link to="/admin/users" className="hover:text-primary-200">
                      Users
                    </Link>
                    <Link to="/admin/loans" className="hover:text-primary-200">
                      All Loans
                    </Link>
                  </>
                )}
                <span className="text-primary-200 text-xs hidden sm:inline">{profile?.email}</span>
                <button
                  onClick={handleSignOut}
                  className="bg-primary-800 hover:bg-primary-900 px-3 py-1 rounded text-sm"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hover:text-primary-200">
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="bg-white text-primary-700 px-3 py-1 rounded font-medium hover:bg-primary-50"
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">{children}</main>

      <footer className="text-center text-xs text-gray-400 py-4 border-t">
        TAS University Climbing Club — Gear Management System
      </footer>
    </div>
  );
}
