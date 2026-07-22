/**
 * Emergency Redux slice.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { emergencyAPI } from '../../services/api';

export const fetchEmergencyAlerts = createAsyncThunk(
  'emergency/fetchAlerts',
  async ({ lat, lng, radius = 30 }, { rejectWithValue }) => {
    try {
      const { data: res } = await emergencyAPI.getAlerts();
      const rawList = res.data || [];
      
      // Filter for critical and high urgency as active emergency alerts
      const activeAlerts = rawList
        .filter((req) => req.urgency === 'critical' || req.urgency === 'high')
        .map((req) => ({
          request_id: req._id || req.id,
          ngo_id: req.ngoId?._id || req.ngoId?.id,
          ngo_name: req.ngoId?.name || 'General NGO Partner',
          ngo_address: req.ngoId?.address || 'Chennai Partner Office',
          resource_needed: req.category,
          quantity: req.quantity,
          urgency: req.urgency,
          distance_km: 1.5, // Proximity estimate placeholder
        }));

      const defaultTypes = [
        { type: 'food', label: 'Food', icon: '🍲' },
        { type: 'clothes', label: 'Clothes', icon: '👕' },
        { type: 'medicines', label: 'Medicines', icon: '💊' },
        { type: 'books', label: 'Books', icon: '📚' },
        { type: 'blood', label: 'Blood', icon: '🩸' },
      ];

      return { alerts: activeAlerts, emergency_types: defaultTypes };
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || 'Failed to fetch emergency feed.');
    }
  }
);

const emergencySlice = createSlice({
  name: 'emergency',
  initialState: { alerts: [], types: [], hasActiveAlerts: false, isLoading: false },
  reducers: {
    clearAlerts: (s) => { s.alerts = []; s.hasActiveAlerts = false; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmergencyAlerts.pending, (s) => { s.isLoading = true; })
      .addCase(fetchEmergencyAlerts.fulfilled, (s, a) => {
        s.isLoading = false;
        s.alerts = a.payload.alerts;
        s.types = a.payload.emergency_types;
        s.hasActiveAlerts = a.payload.alerts.length > 0;
      })
      .addCase(fetchEmergencyAlerts.rejected, (s) => { s.isLoading = false; });
  },
});

export const { clearAlerts } = emergencySlice.actions;
export default emergencySlice.reducer;
