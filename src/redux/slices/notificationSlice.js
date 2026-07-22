/**
 * Notification Redux slice.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { notificationsAPI } from '../../services/api';

export const fetchNotifications = createAsyncThunk('notifications/fetch', async (unreadOnly = false) => {
  const { data } = await notificationsAPI.getAll(unreadOnly);
  return data;
});

export const fetchUnreadCount = createAsyncThunk('notifications/unreadCount', async () => {
  const { data } = await notificationsAPI.getUnreadCount();
  return data.unread_count;
});

export const markNotificationRead = createAsyncThunk('notifications/markRead', async (id) => {
  await notificationsAPI.markRead(id);
  return id;
});

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: { list: [], unreadCount: 0, isLoading: false },
  reducers: {
    addNotification: (s, a) => { s.list.unshift(a.payload); s.unreadCount++; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.fulfilled, (s, a) => { s.list = a.payload; })
      .addCase(fetchUnreadCount.fulfilled, (s, a) => { s.unreadCount = a.payload; })
      .addCase(markNotificationRead.fulfilled, (s, a) => {
        const n = s.list.find(n => n.id === a.payload);
        if (n && !n.is_read) { n.is_read = true; s.unreadCount = Math.max(0, s.unreadCount - 1); }
      });
  },
});

export const { addNotification } = notificationSlice.actions;
export default notificationSlice.reducer;
