'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

export type AnalyticsView = 'module' | 'testcase';

type AnalyticsViewContextValue = {
  view: AnalyticsView;
  setView: (view: AnalyticsView) => void;
};

const AnalyticsViewContext = createContext<AnalyticsViewContextValue | null>(null);

export function AnalyticsViewProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<AnalyticsView>('module');

  return (
    <AnalyticsViewContext.Provider value={{ view, setView }}>
      {children}
    </AnalyticsViewContext.Provider>
  );
}

export function useAnalyticsView() {
  return useContext(AnalyticsViewContext);
}
