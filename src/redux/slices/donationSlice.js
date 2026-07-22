/**
 * Donations Redux slice.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { donationsAPI, matchingAPI } from '../../services/api';

export const fetchDonations = createAsyncThunk(
  'donations/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const { data: res } = await donationsAPI.getAll(params);
      return res.data?.donations || [];
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || 'Failed to fetch donations');
    }
  }
);

export const createDonation = createAsyncThunk(
  'donations/create',
  async (donationData, { rejectWithValue }) => {
    try {
      const { data: res } = await donationsAPI.create(donationData);
      return res.data;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || 'Failed to create donation');
    }
  }
);

export const fetchDonationById = createAsyncThunk(
  'donations/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const { data: res } = await donationsAPI.getById(id);
      return res.data;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message);
    }
  }
);

export const fetchMatches = createAsyncThunk(
  'donations/fetchMatches',
  async (matchData, { rejectWithValue }) => {
    try {
      const [aiRes, nearbyRes] = await Promise.all([
        matchingAPI.getMatches({
          items: `${matchData.quantity} of ${matchData.resource_type} - ${matchData.description || 'General donation'}`,
          latitude: matchData.latitude,
          longitude: matchData.longitude,
        }).catch(() => null),
        matchingAPI.getNearby({
          longitude: matchData.longitude,
          latitude: matchData.latitude,
          maxDistance: 50000,
        }).catch(() => null),
      ]);

      const matchesList = [];
      
      if (aiRes && aiRes.data?.success && aiRes.data?.data?.matchedNgo) {
        const aiNgo = aiRes.data.data.matchedNgo;
        matchesList.push({
          ngo_id: aiNgo.id || aiNgo._id,
          ngo_name: aiNgo.name,
          distance_km: 0.5,
          urgency: 'high',
          score: (aiRes.data.data.matchScore || 100) / 100,
          reason: aiRes.data.data.reason,
          isAiMatched: true,
        });
      }

      if (nearbyRes && nearbyRes.data?.success && Array.isArray(nearbyRes.data?.data)) {
        nearbyRes.data.data.forEach((ngo) => {
          const ngoId = ngo._id || ngo.id;
          if (matchesList.some((m) => m.ngo_id === ngoId)) return;
          matchesList.push({
            ngo_id: ngoId,
            ngo_name: ngo.name,
            distance_km: 1.2,
            urgency: 'medium',
            score: 0.7,
            isAiMatched: false,
          });
        });
      }

      return matchesList;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || 'Failed to match');
    }
  }
);

const donationSlice = createSlice({
  name: 'donations',
  initialState: {
    list: [],
    current: null,
    matches: [],
    isLoading: false,
    error: null,
    createSuccess: false,
  },
  reducers: {
    clearDonationError: (s) => { s.error = null; },
    clearCreateSuccess: (s) => { s.createSuccess = false; },
    setCurrentDonation: (s, a) => { s.current = a.payload; },
    updateDonationInList: (s, a) => {
      const idx = s.list.findIndex((d) => d.id === a.payload.id);
      if (idx !== -1) s.list[idx] = a.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDonations.pending, (s) => { s.isLoading = true; })
      .addCase(fetchDonations.fulfilled, (s, a) => { s.isLoading = false; s.list = a.payload; })
      .addCase(fetchDonations.rejected, (s, a) => { s.isLoading = false; s.error = a.payload; })

      .addCase(createDonation.pending, (s) => { s.isLoading = true; s.createSuccess = false; })
      .addCase(createDonation.fulfilled, (s, a) => {
        s.isLoading = false; s.createSuccess = true;
        s.list.unshift(a.payload);
      })
      .addCase(createDonation.rejected, (s, a) => { s.isLoading = false; s.error = a.payload; })

      .addCase(fetchDonationById.fulfilled, (s, a) => { s.current = a.payload; })

      .addCase(fetchMatches.fulfilled, (s, a) => { s.matches = a.payload; });
  },
});

export const { clearDonationError, clearCreateSuccess, setCurrentDonation, updateDonationInList } =
  donationSlice.actions;
export default donationSlice.reducer;
