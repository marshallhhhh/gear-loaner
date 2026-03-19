import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { isAuthenticated, isAdmin, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    setOpen(false);
    navigate('/');
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const menuId = 'main-navigation';

  return (
    <header className="bg-primary-700 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" onClick={() => setOpen(false)} className="text-xl font-bold tracking-tight">
          TUMC Gear
        </Link>

        <div className="flex items-center">
          <nav className="hidden sm:flex items-center gap-4 text-sm" aria-label="Main navigation">
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
                    <Link to="/admin/found-reports" className="hover:text-primary-200">
                      Found Reports
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

          <button
            className="sm:hidden ml-3 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-white"
            aria-controls={menuId}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              {open ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M3 12h18M3 6h18M3 18h18" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div id={menuId} className="sm:hidden bg-primary-700 border-t border-primary-600">
          <div className="px-4 pt-2 pb-4 space-y-2">
            {isAuthenticated ? (
              <>
                <Link to="/scan" onClick={() => setOpen(false)} className="block py-2">
                  Scan QR
                </Link>
                <Link to="/my-loans" onClick={() => setOpen(false)} className="block py-2">
                  My Loans
                </Link>
                {isAdmin && (
                  <>
                    <Link to="/admin" onClick={() => setOpen(false)} className="block py-2">
                      Dashboard
                    </Link>
                    <Link to="/admin/gear" onClick={() => setOpen(false)} className="block py-2">
                      Gear
                    </Link>
                    <Link to="/admin/users" onClick={() => setOpen(false)} className="block py-2">
                      Users
                    </Link>
                    <Link to="/admin/loans" onClick={() => setOpen(false)} className="block py-2">
                      All Loans
                    </Link>
                    <Link
                      to="/admin/found-reports"
                      onClick={() => setOpen(false)}
                      className="block py-2"
                    >
                      Found Reports
                    </Link>
                  </>
                )}
                <div className="pt-2 border-t border-primary-600">
                  <div className="text-primary-200 text-xs py-2">{profile?.email}</div>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-center bg-primary-800 hover:bg-primary-900 px-3 py-2 rounded text-sm"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="block py-2 bg-primary-800 text-white px-3 py-2 rounded font-medium hover:bg-primary-900"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setOpen(false)}
                  className="block py-2 bg-primary-50 text-primary-700 px-3 py-2 rounded font-medium hover:bg-primary-100"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
