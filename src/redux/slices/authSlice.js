/**
 * Auth Redux slice.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../../services/api';

// ── Async Thunks ──────────────────────────────────────────────────────────────

export const loginWithOTP = createAsyncThunk(
  'auth/loginWithOTP',
  async ({ phone, otp }, { rejectWithValue }) => {
    try {
      const { data: res } = await authAPI.verifyOTP(phone, otp);
      if (!res.success) return rejectWithValue(res.message || 'OTP verification failed');
      
      const token = res.data?.token || '';
      const user = res.data?.user || null;
      
      if (token) await AsyncStorage.setItem('access_token', token);
      if (user) await AsyncStorage.setItem('user', JSON.stringify(user));
      
      return { access_token: token, user };
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || 'OTP verification failed');
    }
  }
);

export const loginWithPassword = createAsyncThunk(
  'auth/loginWithPassword',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const { data: res } = await authAPI.login(email, password);
      if (!res.success) return rejectWithValue(res.message || 'Login failed');
      
      const token = res.data?.token || '';
      const user = res.data?.user || null;
      
      if (token) await AsyncStorage.setItem('access_token', token);
      if (user) await AsyncStorage.setItem('user', JSON.stringify(user));
      
      return { access_token: token, user };
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || 'Login failed');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const { data: res } = await authAPI.register(userData);
      if (!res.success) return rejectWithValue(res.message || 'Registration failed');
      return res.data;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || 'Registration failed');
    }
  }
);

export const loadStoredAuth = createAsyncThunk(
  'auth/loadStored',
  async () => {
    const token = await AsyncStorage.getItem('access_token');
    const userStr = await AsyncStorage.getItem('user');
    if (token && userStr) {
      return { token, user: JSON.parse(userStr) };
    }
    return null;
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const { data: res } = await authAPI.updateProfile(profileData);
      if (!res.success) return rejectWithValue(res.message || 'Update failed');
      const user = res.data || null;
      if (user) await AsyncStorage.setItem('user', JSON.stringify(user));
      return user;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || 'Update failed');
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
});

// ── Slice ─────────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    otpSent: false,
  },
  reducers: {
    clearError: (state) => { state.error = null; },
    setOtpSent: (state, action) => { state.otpSent = action.payload; },
  },
  extraReducers: (builder) => {
    // OTP Login
    builder
      .addCase(loginWithOTP.pending, (s) => { s.isLoading = true; s.error = null; })
      .addCase(loginWithOTP.fulfilled, (s, a) => {
        s.isLoading = false;
        s.isAuthenticated = true;
        s.user = a.payload.user;
        s.token = a.payload.access_token;
      })
      .addCase(loginWithOTP.rejected, (s, a) => {
        s.isLoading = false; s.error = a.payload;
      })
    // Password Login
      .addCase(loginWithPassword.pending, (s) => { s.isLoading = true; s.error = null; })
      .addCase(loginWithPassword.fulfilled, (s, a) => {
        s.isLoading = false; s.isAuthenticated = true;
        s.user = a.payload.user; s.token = a.payload.access_token;
      })
      .addCase(loginWithPassword.rejected, (s, a) => {
        s.isLoading = false; s.error = a.payload;
      })
    // Register
      .addCase(registerUser.pending, (s) => { s.isLoading = true; s.error = null; })
      .addCase(registerUser.fulfilled, (s) => { s.isLoading = false; })
      .addCase(registerUser.rejected, (s, a) => { s.isLoading = false; s.error = a.payload; })
    // Load stored
      .addCase(loadStoredAuth.fulfilled, (s, a) => {
        if (a.payload) {
          s.isAuthenticated = true;
          s.user = a.payload.user;
          s.token = a.payload.token;
        }
      })
    // Update profile
      .addCase(updateProfile.fulfilled, (s, a) => { s.user = a.payload; })
    // Logout
      .addCase(logout.fulfilled, (s) => {
        s.user = null; s.token = null; s.isAuthenticated = false;
      });
  },
});

export const { clearError, setOtpSent } = authSlice.actions;
export default authSlice.reducer;
