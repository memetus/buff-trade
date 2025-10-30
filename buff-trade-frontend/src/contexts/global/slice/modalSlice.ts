import { AccountModalParams, ModalType } from "@/shared/types/ui/modal";
import { createSlice } from "@reduxjs/toolkit";
import { RootState } from "../store";

export type Modal<T extends {} | AccountModalParams> = {
  key: ModalType;
  layer?: number;
  params: T;
};

export type ModalSliceType<T extends {} | AccountModalParams> = {
  display: boolean;
  modal: Modal<T>[];
};

const initialState: ModalSliceType<{}> = {
  display: false,
  modal: [],
};

const modalSlice = createSlice({
  name: "modal",
  initialState,
  reducers: {
    HIDE_MODAL: (state) => {
      state.display = false;
    },
    SHOW_MODAL: (state) => {
      state.display = true;
    },
    APPEND_MODAL: (state, action) => {
      const { key, layer, params } = action.payload;
      state.modal.push({ key, layer: layer ?? 0, params });
      state.display = true;
    },
    CLOSE_MODAL: (state, action) => {
      const { key } = action.payload;
      state.modal = state.modal.filter((modal) => modal.key !== key);
      if (state.modal.length === 0) {
        state.display = false;
      }
    },
    SET_MODAL_LAYER: (state, action) => {
      const { key } = action.payload;
      const modal = state.modal.find((modal) => modal.key === key);
      if (modal) {
        const rest = state.modal.filter((modal) => modal.key !== key);
        state.modal = [modal, ...rest];
      }
    },
    CLEAR_MODAL: (state) => {
      state.modal = [];
      state.display = false;
    },
  },
});

export const {
  HIDE_MODAL,
  SHOW_MODAL,
  APPEND_MODAL,
  CLOSE_MODAL,
  SET_MODAL_LAYER,
  CLEAR_MODAL,
} = modalSlice.actions;

export const getModalList = (state: RootState) => state.modal.modal;
export const getModalDisplay = (state: RootState) => state.modal.display;
export const getTopModal = (state: RootState) => {
  if (state.modal.modal && state.modal.modal.length !== 0) {
    return state.modal.modal[0];
  }
};
export const getModal = (state: RootState, key: ModalType) => {
  return state.modal.modal.find((modal) => modal.key === key);
};

export default modalSlice.reducer;
