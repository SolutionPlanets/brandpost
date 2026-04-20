'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../utils/supabase/client';
import { UserPlus, Loader2, Mail, Lock, Chrome, User, Eye, EyeOff } from 'lucide-react';
import styles from '../Auth.module.css';

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // If email confirmation is off, data.user will exist
      if (data.user) {
        router.push('/onboarding');
      } else {
        // If email confirmation is on
        setError('Check your email to confirm your account!');
        setLoading(false);
      }
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });

    if (error) setError(error.message);
  };

  return (
    <div className={styles.container}>
      <div className={styles.authCard}>
        <div className={styles.header}>
          <span className={styles.logo}>BrandPost AI</span>
          <h1 className={styles.title}>Start your free trial</h1>
          <p className={styles.subtitle}>Get 14 days of unlimited AI-powered brand growth.</p>
        </div>

        {error && (
          <div className={`${styles.error} ${error.includes('Check your email') ? styles.success : ''}`} style={error.includes('Check your email') ? { backgroundColor: '#f0fdf4', color: '#16a34a', borderColor: '#dcfce7' } : {}}>
            {error}
          </div>
        )}

        <form className={styles.form} onSubmit={handleSignup}>
          <div className={styles.formGroup}>
            <label htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              type="text"
              placeholder="John Doe"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="name@company.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password">Password</label>
            <div className={styles.passwordWrapper}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? <Loader2 size={18} className={styles.spinner} /> : <UserPlus size={18} />}
            Create My Account
          </button>
        </form>

        <div className={styles.divider}>or</div>

        <button onClick={handleGoogleLogin} className={styles.socialBtn}>
          <Chrome size={18} /> Sign up with Google
        </button>

        <p className={styles.footer}>
          Already have an account? <Link href="/auth/login">Log In</Link>
        </p>
      </div>
    </div>
  );
}
