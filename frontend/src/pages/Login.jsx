import { useState } from 'react';
import { useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Route, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    const dest = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={dest} replace />;
  }

  function validate() {
    const next = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Password is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);

    if (result.success) {
      navigate('/dashboard', { replace: true });
    } else {
      setServerError('Invalid email or password');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-route-500 text-white">
            <Route size={22} />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-ink-900">TransitOps</span>
          <p className="text-sm text-ink-500">Fleet Manager · Driver · Safety Officer · Financial Analyst</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="card px-8 py-8">
          <h1 className="mb-6 text-lg font-bold text-ink-900">Sign in to your account</h1>

          <div className="mb-4">
            <label htmlFor="email" className="label">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="label">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="input pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-300 hover:text-ink-700"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="field-error">{errors.password}</p>}
          </div>

          <div className="mb-6 flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input type="checkbox" className="h-4 w-4 rounded border-ink-100 text-route-500 focus:ring-route-500" />
              Remember me
            </label>
          </div>

          {serverError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-status-cancelled">
              {serverError}
            </div>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5">
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Signing in…
              </>
            ) : (
              'Sign In'
            )}
          </button>

          <p className="mt-5 text-center text-sm text-ink-500">
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold text-route-500 hover:underline">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
