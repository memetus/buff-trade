"use client";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import modal from "@/contexts/global/slice/modalSlice";
import sidebar from "@/contexts/global/slice/sidebarSlice";

const rootReducer = combineReducers({
  modal,
  sidebar,
});

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;

export default store;
