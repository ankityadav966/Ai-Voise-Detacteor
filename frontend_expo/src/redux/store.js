import { configureStore } from '@reduxjs/toolkit';
import historyReducer from './historySlice';

export const store = configureStore({
  reducer: {
    history: historyReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});
