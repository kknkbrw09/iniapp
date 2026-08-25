import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SafeStorage } from '../utils/storage';
import { UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import CryptoJS from 'crypto-js';

interface AuthContextType {
  role: UserRole | null;
  adminName: string | null;
  adminUsername: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  updateAdminCredentials: (
    newUsername: string,
    currentPassword: string,
    newPassword?: string
  ) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole | null>(null);
  const [adminName, setAdminName] = useState<string | null>(null);
  const [adminUsername, setAdminUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedRole = await SafeStorage.getItem('rw_role');
      const storedName = await SafeStorage.getItem('admin_name');
      const storedUsername = await SafeStorage.getItem('admin_username');
      if (storedRole === 'admin') {
        setRole('admin');
        setAdminName(storedName || 'Pengurus RW 09');
        setAdminUsername(storedUsername || 'admin');
      } else {
        setRole('guest');
        setAdminName(null);
        setAdminUsername(null);
      }
    } catch (error) {
      console.error('Error loading auth:', error);
      setRole('guest');
      setAdminName(null);
      setAdminUsername(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (usernameInput: string, password: string): Promise<boolean> => {
    try {
      const username = usernameInput.trim().toLowerCase();
      const hashedPassword = CryptoJS.SHA256(password).toString();

      // Cek ke Supabase admin_users
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('admin_users')
          .select('*')
          .eq('username', username)
          .eq('password', hashedPassword)
          .single();

        if (data && !error) {
          await SafeStorage.setItem('rw_role', 'admin');
          await SafeStorage.setItem('admin_name', data.nama_admin || usernameInput);
          await SafeStorage.setItem('admin_username', username);
          setRole('admin');
          setAdminName(data.nama_admin || usernameInput);
          setAdminUsername(username);
          return true;
        }
      }

      // Fallback credentials
      if (username === 'admin' && (password === 'admin123' || password === 'Sayapakmimbar123#')) {
        await SafeStorage.setItem('rw_role', 'admin');
        await SafeStorage.setItem('admin_name', 'Pengurus RW 09');
        await SafeStorage.setItem('admin_username', 'admin');
        setRole('admin');
        setAdminName('Pengurus RW 09');
        setAdminUsername('admin');
        return true;
      }

      // Fallback credentials untuk 18 RT (cth: admin_rt01 .. admin_rt18 atau rt01 .. rt18)
      const rtMatch = username.match(/^(admin_)?rt0*([1-9]|1[0-8])$/);
      if (rtMatch) {
        const rtNum = parseInt(rtMatch[2], 10);
        const formattedRt = `RT ${String(rtNum).padStart(3, '0')}`;
        const validPasswords = [
          'admin123',
          'Sayapakmimbar123#',
          `adminRT${String(rtNum).padStart(2, '0')}#`,
          `adminRT${rtNum}#`,
        ];

        if (validPasswords.includes(password)) {
          const adminTitle = `Pengurus ${formattedRt}`;
          await SafeStorage.setItem('rw_role', 'admin');
          await SafeStorage.setItem('admin_name', adminTitle);
          await SafeStorage.setItem('admin_username', username);
          setRole('admin');
          setAdminName(adminTitle);
          setAdminUsername(username);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      const username = usernameInput.trim().toLowerCase();
      // Fallback jika Supabase error
      if (username === 'admin' && (password === 'admin123' || password === 'Sayapakmimbar123#')) {
        await SafeStorage.setItem('rw_role', 'admin');
        await SafeStorage.setItem('admin_name', 'Pengurus RW 09');
        await SafeStorage.setItem('admin_username', 'admin');
        setRole('admin');
        setAdminName('Pengurus RW 09');
        setAdminUsername('admin');
        return true;
      }

      const rtMatch = username.match(/^(admin_)?rt0*([1-9]|1[0-8])$/);
      if (rtMatch) {
        const rtNum = parseInt(rtMatch[2], 10);
        const formattedRt = `RT ${String(rtNum).padStart(3, '0')}`;
        const adminTitle = `Pengurus ${formattedRt}`;
        await SafeStorage.setItem('rw_role', 'admin');
        await SafeStorage.setItem('admin_name', adminTitle);
        await SafeStorage.setItem('admin_username', username);
        setRole('admin');
        setAdminName(adminTitle);
        setAdminUsername(username);
        return true;
      }

      return false;
    }
  };

  const updateAdminCredentials = async (
    newUsernameInput: string,
    currentPassword: string,
    newPassword?: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const newUsername = newUsernameInput.trim().toLowerCase();
      if (!newUsername) {
        return { success: false, message: 'Username baru tidak boleh kosong' };
      }

      const currentHashedPassword = CryptoJS.SHA256(currentPassword).toString();
      const newHashedPassword = newPassword && newPassword.trim()
        ? CryptoJS.SHA256(newPassword).toString()
        : currentHashedPassword;

      if (isSupabaseConfigured) {
        const { data: currentAdmin, error: checkErr } = await supabase
          .from('admin_users')
          .select('*')
          .eq('password', currentHashedPassword);

        if (checkErr || !currentAdmin || currentAdmin.length === 0) {
          return { success: false, message: 'Password saat ini tidak sesuai' };
        }

        const adminId = currentAdmin[0].id;
        const { error: updateErr } = await supabase
          .from('admin_users')
          .update({
            username: newUsername,
            password: newHashedPassword,
          })
          .eq('id', adminId);

        if (updateErr) {
          return { success: false, message: 'Gagal memperbarui database: ' + updateErr.message };
        }
      }

      setAdminUsername(newUsername);
      await SafeStorage.setItem('admin_username', newUsername);
      return { success: true, message: 'Username dan Password berhasil diperbarui' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Terjadi kesalahan' };
    }
  };

  const loginAsGuest = async () => {
    await SafeStorage.setItem('rw_role', 'guest');
    setRole('guest');
    setAdminName(null);
    setAdminUsername(null);
  };

  const logout = async () => {
    await SafeStorage.removeItem('rw_role');
    await SafeStorage.removeItem('admin_name');
    await SafeStorage.removeItem('admin_username');
    setRole('guest');
    setAdminName(null);
    setAdminUsername(null);
  };

  return (
    <AuthContext.Provider
      value={{
        role,
        adminName,
        adminUsername,
        isLoading,
        login,
        loginAsGuest,
        logout,
        updateAdminCredentials,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

const defaultAuthContext: AuthContextType = {
  role: null,
  adminName: null,
  adminUsername: null,
  isLoading: false,
  login: async () => false,
  loginAsGuest: async () => {},
  logout: async () => {},
  updateAdminCredentials: async () => ({ success: false, message: '' }),
};

export function useAuth() {
  const context = useContext(AuthContext);
  return context || defaultAuthContext;
}

export default useAuth;
