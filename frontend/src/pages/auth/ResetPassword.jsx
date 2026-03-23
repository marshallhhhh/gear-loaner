import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { supabase } from '../../config/supabase.js';
import Alert from '../../components/Alert.jsx';

const MIN_PASSWORD_LENGTH = 6;

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [validLink, setValidLink] = useState(false);
  const { resetPassword } = useAuth();

  useEffect(() => {
    let mounted = true;

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (hashParams.get('error_description')) {
      setError('This reset link is invalid or has expired. Please request a new one.');
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY' || !!session) {
        setValidLink(true);
        setCheckingLink(false);
      }
    });

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        setValidLink(!!session);
      })
      .catch(() => {
        if (!mounted) return;
        setValidLink(false);
      })
      .finally(() => {
        if (mounted) setCheckingLink(false);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await resetPassword(password);
      setSuccess(true);
    } catch (err) {
      if (err?.message) {
        setError(err.message);
      } else {
        setError('Unable to reset password. Please request a new reset link.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (checkingLink) {
    return (
      <div className="max-w-md mx-auto mt-12 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4" />
        <p className="text-gray-600">Checking reset link…</p>
      </div>
    );
  }

  if (!validLink && !success) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <h1 className="text-2xl font-bold mb-6 text-center">Reset Password</h1>
        <Alert type="error">
          This reset link is invalid or has expired. Please request a new password reset email.
        </Alert>
        <p className="text-center text-sm mt-4 text-gray-500">
          <Link to="/forgot-password" className="text-primary-600 hover:underline">
            Request new reset link
          </Link>
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto mt-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Password Updated</h1>
        <p className="text-gray-600 mb-4">Your password has been updated successfully.</p>
        <Link to="/login" className="text-primary-600 hover:underline">
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <h1 className="text-2xl font-bold mb-6 text-center">Reset Password</h1>

      <Alert type="error">{error}</Alert>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="reset-password" className="block text-sm font-medium mb-1">
            New Password
          </label>
          <input
            id="reset-password"
            type="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>

        <div>
          <label htmlFor="reset-password-confirm" className="block text-sm font-medium mb-1">
            Confirm New Password
          </label>
          <input
            id="reset-password-confirm"
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg font-medium disabled:opacity-50"
        >
          {loading ? 'Updating Password…' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
