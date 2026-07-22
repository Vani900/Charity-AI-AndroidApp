/**
 * NGO Redux slice.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ngosAPI } from '../../services/api';

import { authAPI } from '../../services/api';

export const fetchNGOs = createAsyncThunk('ngo/fetchAll', async () => {
  return [];
});

export const fetchMyNGO = createAsyncThunk('ngo/fetchMy', async (_, { rejectWithValue }) => {
  try {
    const { data: res } = await authAPI.getMe();
    return res.data;
  } catch (e) {
    return rejectWithValue(e.response?.data?.message || 'Failed to fetch NGO details');
  }
});

export const registerNGO = createAsyncThunk('ngo/register', async (ngoData, { rejectWithValue }) => {
  try {
    const { data: res } = await authAPI.register({ ...ngoData, role: 'ngo' });
    return res.data;
  } catch (e) {
    return rejectWithValue(e.response?.data?.message || 'Registration failed');
  }
});

const ngoSlice = createSlice({
  name: 'ngo',
  initialState: { list: [], myNGO: null, isLoading: false, error: null },
  reducers: { clearNGOError: (s) => { s.error = null; } },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNGOs.fulfilled, (s, a) => { s.list = a.payload; })
      .addCase(fetchMyNGO.fulfilled, (s, a) => { s.myNGO = a.payload; })
      .addCase(registerNGO.fulfilled, (s, a) => { s.myNGO = a.payload; });
  },
});

export const { clearNGOError } = ngoSlice.actions;
export default ngoSlice.reducer;
