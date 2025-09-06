import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import candidateReducer from './slices/candidateSlice';
import companyReducer from './slices/companySlice';
import jobsReducer from './slices/jobsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    candidate: candidateReducer,
    company: companyReducer,
    jobs: jobsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});
