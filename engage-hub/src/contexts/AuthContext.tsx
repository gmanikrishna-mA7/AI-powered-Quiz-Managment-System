import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, UserProfile, ApiError } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (fullName: string, email: string, password: string, passwordConfirm: string) => Promise<void>;
  googleLogin: (token: string, mode?: 'login' | 'register') => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    // Initialize from cache
    const cached = localStorage.getItem('auth_user_cache');
    return cached ? JSON.parse(cached) : null;
  });
  // If we have a user in cache, we are not loading. If not, we are loading (checking backend).
  const [loading, setLoading] = useState(!user);
  const { toast } = useToast();

  const checkAuth = async () => {
    try {
      const response = await api.checkAuth();
      if (response.success && response.data) {
        setUser(response.data);
        localStorage.setItem('auth_user_cache', JSON.stringify(response.data));
      }
    } catch (error) {
      // User is not authenticated
      setUser(null);
      localStorage.removeItem('auth_user_cache');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string, rememberMe?: boolean) => {
    try {
      setLoading(true);
      const response = await api.login({ email, password, remember_me: rememberMe });

      if (response.success && response.data) {
        setUser(response.data);
        localStorage.setItem('auth_user_cache', JSON.stringify(response.data));
        toast({
          title: 'Success',
          description: response.message || 'Login successful',
        });
      }
    } catch (error) {
      const apiError = error as ApiError;
      toast({
        title: 'Login Failed',
        description: apiError.message || 'Invalid email or password',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    fullName: string,
    email: string,
    password: string,
    passwordConfirm: string
  ) => {
    try {
      setLoading(true);
      const response = await api.register({
        full_name: fullName,
        email,
        password,
        password_confirm: passwordConfirm,
      });

      if (response.success && response.data) {
        setUser(response.data);
        localStorage.setItem('auth_user_cache', JSON.stringify(response.data));
        toast({
          title: 'Success',
          description: response.message || 'Registration successful',
        });
      }
    } catch (error) {
      const apiError = error as ApiError;
      let errorMessage = apiError.message || 'Registration failed';

      // Extract specific field errors if available
      if (apiError.errors) {
        const errorMessages = Object.entries(apiError.errors)
          .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
          .join('\n');
        errorMessage = errorMessages || errorMessage;
      }

      toast({
        title: 'Registration Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
      setUser(null);
      localStorage.removeItem('auth_user_cache');
      toast({
        title: 'Logged Out',
        description: 'You have been logged out successfully',
      });
    } catch (error) {
      const apiError = error as ApiError;
      toast({
        title: 'Logout Failed',
        description: apiError.message || 'Failed to logout',
        variant: 'destructive',
      });
    }
  };

  const googleLogin = async (token: string, mode?: 'login' | 'register') => {
    try {
      setLoading(true);
      const response = await api.googleSignIn(token, mode);

      if (response.success && response.data) {
        setUser(response.data);
        localStorage.setItem('auth_user_cache', JSON.stringify(response.data));
        // Success toast is handled in the component for better UX control (redirect etc)
        // or we can just return here and let component handle navigation
      }
    } catch (error) {
      // Error handling generally done here but we rethrow so component can handle specific redirects
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Set up interceptor for unauthorized responses
    api.onUnauthorized = () => {
      setUser(null);
      localStorage.removeItem('auth_user_cache');
      // Optional: Show a toast? But maybe too noisy if multiple requests fail at once.
      // The ProtectedRoute will handle the redirection.
    };

    checkAuth();

    // Cleanup
    return () => {
      api.onUnauthorized = null;
    };
  }, []);

  const value = {
    user,
    loading,
    login,
    register,
    googleLogin,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
