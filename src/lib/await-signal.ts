
import { createRoot, createEffect } from 'solid-js';

/**
 * returns a promise that resolves when the signal is true, or matches a condition. 
 */
export const AwaitSignal = <T>(getter: () => T, condition: (val: T) => boolean = Boolean) => {
  return new Promise<T>((resolve) => {
    createRoot((dispose) => createEffect(() => {
      const val = getter();
      if (condition(val)) {
        resolve(val);
        dispose();
      }
    }));
  });
};
