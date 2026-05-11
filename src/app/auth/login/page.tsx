'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../../../utils/supabase/client';
import { LogIn, Loader2, Mail, Lock, Chrome, Facebook, Eye, EyeOff } from 'lucide-react';
import styles from '../Auth.module.css';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const message = searchParams.get('message');
    const errorParam = searchParams.get('error');
    if (message === 'existing_user') {
      setError('Please login with your existing account');
    } else if (errorParam) {
      setError(errorParam);
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError('This account does not exist or password is incorrect. Please check your email or sign up.');
      } else {
        setError(error.message);
      }
      setLoading(false);
      return;
    }

    if (authData?.user) {
      // Check if mail_verified is true in public.users
      const { data: publicUser } = await supabase
        .from('users')
        .select('mail_verified')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (publicUser && !publicUser.mail_verified) {
        setError('Your email is not verified yet. Please click the confirmation link sent to your inbox to log in.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
      
      router.push('/dashboard');
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) setError(error.message);
  };

  const handleFacebookLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'public_profile,email,pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish',
      },
    });

    if (error) setError(error.message);
  };

  return (
    <div className={styles.container}>
      <div className={styles.authCard}>
        <div className={styles.header}>
          <span className={styles.logo}>BrandPost AI</span>
          <h1 className={styles.title}>Welcome back!</h1>
          <p className={styles.subtitle}>Log in to manage your brand social content.</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form className={styles.form} onSubmit={handleLogin}>
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
            {loading ? <Loader2 size={18} className={styles.spinner} /> : <LogIn size={18} />}
            Log In
          </button>
        </form>

        <div className={styles.divider}>or</div>

        <button onClick={handleGoogleLogin} className={styles.socialBtn}>
          <Chrome size={18} /> Continue with Google
        </button>

        <button onClick={handleFacebookLogin} className={`${styles.socialBtn} ${styles.facebookBtn}`}>
          <Facebook size={18} /> Continue with Facebook
        </button>

        <p className={styles.footer}>
          Don&apos;t have an account? <Link href="/auth/signup">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
