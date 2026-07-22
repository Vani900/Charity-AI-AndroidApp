/**
 * Redux store configuration.
 */

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import donationReducer from './slices/donationSlice';
import ngoReducer from './slices/ngoSlice';
import notificationReducer from './slices/notificationSlice';
import emergencyReducer from './slices/emergencySlice';
import analyticsReducer from './slices/analyticsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    donations: donationReducer,
    ngo: ngoReducer,
    notifications: notificationReducer,
    emergency: emergencyReducer,
    analytics: analyticsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});

export default store;
