import 'react-native-url-polyfill/auto';
import { SafeStorage } from '../utils/storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://imbeasbqqepxcemonken.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltYmVhc2JxcWVweGNlbW9ua2VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NDM3NTEsImV4cCI6MjEwMTIxOTc1MX0.4JXkTeiZfl-0R3Qk7acXtxBVNzzJsYkUx5mmzmThrZY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SafeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const isSupabaseConfigured = true;
