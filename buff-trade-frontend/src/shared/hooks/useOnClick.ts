import { RefObject, useCallback, useEffect } from "react";

export function useOnClick<T extends HTMLElement = HTMLElement>({
  ref,
  handler,
  mouseEvent,
}: {
  ref: RefObject<T>;
  handler: () => void;
  mouseEvent: keyof DocumentEventMap;
}) {
  const stableHandler = useCallback(() => {
    handler();
  }, [handler]);

  useEffect(() => {
    const listener = (event: Event) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }

      if (event instanceof MouseEvent) {
        stableHandler();
      }
    };

    document.addEventListener(mouseEvent, listener);

    return () => {
      document.removeEventListener(mouseEvent, listener);
    };
  }, [ref, stableHandler, mouseEvent]);
}
