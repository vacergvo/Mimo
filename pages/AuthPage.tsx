
import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import Button from '../components/Button';
import Input from '../components/Input';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // For new signups
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (name) {
          await updateProfile(userCredential.user, { displayName: name });
        }
      }
    } catch (err: any) {
      console.error(err);
      let msg = "An error occurred.";
      if (err.code === 'auth/invalid-email') msg = "Invalid email address.";
      if (err.code === 'auth/wrong-password') msg = "Incorrect password.";
      if (err.code === 'auth/user-not-found') msg = "User not found.";
      if (err.code === 'auth/email-already-in-use') msg = "Email already in use.";
      if (err.code === 'auth/weak-password') msg = "Password should be at least 6 characters.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, provider);
      // Auth state listener in App.tsx will handle the rest
    } catch (err: any) {
      console.error("Google Sign In Error:", err);
      if (err.code === 'auth/unauthorized-domain') {
        // dynamically show the current domain so the user can copy it
        const currentDomain = window.location.hostname;
        setError(`Domain not authorized: ${currentDomain}. Please add this to Firebase Console > Auth > Settings.`);
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError("Sign in cancelled.");
      } else {
        setError("Failed to sign in with Google.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-6 animate-gradient transition-all duration-300">
      <div className="w-full max-w-md bg-[var(--bg-card)]/30 backdrop-blur-lg rounded-3xl p-8 shadow-xl border border-white/20">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[var(--text-main)] mb-2 tracking-tight">Mimo</h1>
          <p className="text-[var(--text-sub)]">Navigate the city in peace 🌿</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <Input 
              type="text" 
              placeholder="Your Name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required={!isLogin}
            />
          )}
          
          <Input 
            type="email" 
            placeholder="Email address" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          
          <Input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <p className="text-center text-xs text-[var(--text-sub)]">
            Password needs to include at least 6 characters
          </p>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 break-words">
              {error}
            </div>
          )}

          <div className="pt-2">
            <Button type="submit" isLoading={loading}>
              {isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </div>
        </form>

        <Button 
            type="button" 
            variant="secondary" 
            onClick={handleGoogleSignIn}
            className="mt-6 w-full flex items-center justify-center gap-3 font-medium bg-white hover:bg-gray-50 text-gray-700 border-none shadow-sm"
        >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
        </Button>

        <div className="mt-6 text-center">
          <Button 
            variant="ghost" 
            onClick={() => setIsLogin(!isLogin)}
            className="w-full mt-2"
          >
            {isLogin ? "No account? Sign Up" : "Have an account? Log In"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
