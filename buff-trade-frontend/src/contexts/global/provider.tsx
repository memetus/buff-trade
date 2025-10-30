"use client";
import { Provider } from "react-redux";
import React, { ReactNode } from "react";
import store from "@/contexts/global/store";

const Providers = ({ children }: { children: ReactNode }) => {
  return <Provider store={store}>{children}</Provider>;
};

export default Providers;
