import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { donationsAPI } from '../../services/api';

export const fetchAnalyticsSummary = createAsyncThunk(
  'analytics/summary',
  async (_, { rejectWithValue }) => {
    try {
      const { data: res } = await donationsAPI.getAll();
      const list = res.data?.donations || [];
      
      const total_donations = list.length;
      const verified_donations = list.filter((d) => d.status === 'delivered').length;
      const people_helped = list.filter((d) => ['accepted', 'in_transit', 'delivered'].includes(d.status)).length * 5;

      const donations_by_resource = { money: 0, food: 0, clothes: 0, books: 0, medicines: 0, blood: 0 };
      list.forEach((d) => {
        const cat = d.category?.toLowerCase();
        if (donations_by_resource[cat] !== undefined) {
          donations_by_resource[cat] += 1;
        }
      });

      const message = total_donations > 0 
        ? `🌱 You have made ${total_donations} donation${total_donations > 1 ? 's' : ''} and helped change ${people_helped} lives!`
        : '🌱 Start donating to make a positive impact in the community!';

      return {
        total_donations,
        people_helped,
        verified_donations,
        donations_by_resource,
        message
      };
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || 'Failed to compute analytics');
    }
  }
);

export const fetchMonthlyTrend = createAsyncThunk(
  'analytics/trend',
  async (_, { rejectWithValue }) => {
    try {
      const { data: res } = await donationsAPI.getAll();
      const list = res.data?.donations || [];
      
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const trendMap = {};

      // Fill in default months if list is empty to avoid blank charts
      if (list.length === 0) {
        const currentMonth = new Date().getMonth();
        for (let i = 4; i >= 0; i--) {
          const idx = (currentMonth - i + 12) % 12;
          trendMap[`${months[idx]} 2026`] = 0;
        }
      } else {
        list.forEach((d) => {
          const date = new Date(d.createdAt || Date.now());
          const key = `${months[date.getMonth()]} ${date.getFullYear()}`;
          trendMap[key] = (trendMap[key] || 0) + 1;
        });
      }

      const trend = Object.entries(trendMap).map(([month, count]) => ({
        month,
        donations: count
      }));

      return trend;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || 'Failed to load trend');
    }
  }
);

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState: { summary: null, monthlyTrend: [], isLoading: false },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAnalyticsSummary.pending, (s) => { s.isLoading = true; })
      .addCase(fetchAnalyticsSummary.fulfilled, (s, a) => { s.isLoading = false; s.summary = a.payload; })
      .addCase(fetchAnalyticsSummary.rejected, (s, a) => { s.isLoading = false; })
      
      .addCase(fetchMonthlyTrend.pending, (s) => { s.isLoading = true; })
      .addCase(fetchMonthlyTrend.fulfilled, (s, a) => { s.isLoading = false; s.monthlyTrend = a.payload; })
      .addCase(fetchMonthlyTrend.rejected, (s, a) => { s.isLoading = false; });
  },
});

export default analyticsSlice.reducer;
