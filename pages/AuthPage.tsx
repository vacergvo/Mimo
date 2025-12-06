import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
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
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <div className="pt-2">
            <Button type="submit" isLoading={loading}>
              {isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <Button 
            variant="secondary" 
            onClick={() => setIsLogin(!isLogin)}
            className="w-full mt-2"
          >
            {isLogin ? "Sign Up" : "Log In"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;