import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Alert from '../../components/Alert.jsx';

const INVALID_FULL_NAME_MESSAGE = 'Please use your real full name';

function isValidFullName(value) {
  const trimmedValue = value.trim();
  const nameParts = trimmedValue.split(/\s+/).filter(Boolean);

  if (nameParts.length < 2) {
    return false;
  }

  return nameParts.every((part) => /^[\p{L}\p{M}]+(?:[.'’-][\p{L}\p{M}]+)*$/u.test(part));
}

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmedFullName = fullName.trim();

    setError('');

    if (!isValidFullName(trimmedFullName)) {
      setError(INVALID_FULL_NAME_MESSAGE);
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password, trimmedFullName);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto mt-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Check Your Email</h1>
        <p className="text-gray-600 mb-4">
          We've sent a confirmation link to <strong>{email}</strong>. Please click it to activate
          your account.
        </p>
        <Link to="/login" className="text-primary-600 hover:underline">
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <h1 className="text-2xl font-bold mb-6 text-center">Create Account</h1>

      <Alert type="error">{error}</Alert>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="signup-name" className="block text-sm font-medium mb-1">
            Full Name
          </label>
          <input
            id="signup-name"
            type="text"
            required
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (error === INVALID_FULL_NAME_MESSAGE) {
                setError('');
              }
            }}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>

        <div>
          <label htmlFor="signup-email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <input
            id="signup-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>

        <div>
          <label htmlFor="signup-password" className="block text-sm font-medium mb-1">
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg font-medium disabled:opacity-50"
        >
          {loading ? 'Creating Account…' : 'Sign Up'}
        </button>
      </form>

      <p className="text-center text-sm mt-4 text-gray-500">
        Already have an account?{' '}
        <Link to="/login" className="text-primary-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
