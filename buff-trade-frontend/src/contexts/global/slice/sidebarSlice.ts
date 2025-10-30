import { SidebarType } from "@/shared/types/ui/modal";
import { createSlice } from "@reduxjs/toolkit";
import { RootState } from "../store";

export type Sidebar<T extends {}> = {
  key: SidebarType;
  params: T;
};

export type SidebarSliceType<T extends {}> = {
  display: boolean;
  sidebar: Sidebar<T> | null;
};

const initialState: SidebarSliceType<{}> = {
  display: false,
  sidebar: null,
};

const sidebarSlice = createSlice({
  name: "sidebar",
  initialState,
  reducers: {
    HIDE_SIDEBAR: (state) => {
      state.display = false;
    },
    SHOW_SIDEBAR: (state) => {
      state.display = true;
    },
    CLOSE_SIDEBAR: (state, action) => {
      const { key } = action.payload;
      if (state.sidebar && state.sidebar.key === key) {
        state.sidebar = null;
        state.display = false;
      }
    },
  },
});

export const { HIDE_SIDEBAR, SHOW_SIDEBAR, CLOSE_SIDEBAR } =
  sidebarSlice.actions;

export const getSidebar = (state: RootState) => state.sidebar;

export default sidebarSlice.reducer;
