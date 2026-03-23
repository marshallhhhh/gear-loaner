import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Alert from '../../components/Alert.jsx';

const SUCCESS_MESSAGE =
  'If an account exists for that email address, we have sent password reset instructions.';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const { requestPasswordReset } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await requestPasswordReset(email.toLowerCase());
    } catch {
      // Always show the same success message to avoid account enumeration.
    } finally {
      setSubmitted(true);
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <h1 className="text-2xl font-bold mb-6 text-center">Forgot Password</h1>

      <p className="text-sm text-gray-600 mb-4 text-center">
        Enter your email and we will send you a link to reset your password.
      </p>

      {submitted && <Alert type="success">{SUCCESS_MESSAGE}</Alert>}
      <Alert type="error">{error}</Alert>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="forgot-password-email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <input
            id="forgot-password-email"
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value.toLowerCase())}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg font-medium disabled:opacity-50"
        >
          {loading ? 'Sending Reset Link…' : 'Send Reset Link'}
        </button>
      </form>

      <p className="text-center text-sm mt-4 text-gray-500">
        Remembered your password?{' '}
        <Link to="/login" className="text-primary-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
