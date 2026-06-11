import { createContext, useContext, createEffect, createSignal, JSX } from "solid-js";
import { useLocation } from "@solidjs/router";

const HistoryContext = createContext<{ getReferrer: () => string | null }>();

export function HistoryProvider(props: { children: JSX.Element }) {
  const location = useLocation();
  const [history, setHistory] = createSignal<string[]>([]);

  createEffect(() => {
    const currentPath = location.pathname;
    
    setHistory((prev) => {
      // Keep track of the last 2 paths
      const newHistory = [...prev, currentPath];
      return newHistory.slice(-2); 
    });
  });

  const getReferrer = () => {
    const hist = history();
    // If we have 2 items, the first one is the previous internal page
    return hist.length === 2 ? hist[0] : null;
  };

  return (
    <HistoryContext.Provider value={{ getReferrer }}>
      {props.children}
    </HistoryContext.Provider>
  );
}

export const useInternalReferrer = () => useContext(HistoryContext);