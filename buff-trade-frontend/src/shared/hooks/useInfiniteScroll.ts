import {
  Dispatch,
  MutableRefObject,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
} from "react";

export const useInfiniteScroll = <T>(
  handler: (page: number) => Promise<T[]>,
  data: T[],
  setData: Dispatch<SetStateAction<T[]>>,
  page: number,
  setPage: Dispatch<SetStateAction<number>>,
  isFirstLoad: MutableRefObject<boolean>,
  isLoading: boolean,
  setIsLoading: Dispatch<SetStateAction<boolean>>,
  hasMore: boolean,
  setHasMore: Dispatch<SetStateAction<boolean>>,
  error: Error | null = null,
  setError: Dispatch<SetStateAction<Error | null>>,
  trigger?: any
) => {
  const ref = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    if (isLoading || !hasMore) return;

    try {
      setIsLoading(true);
      const response = await handler(page);

      if (response instanceof Error) {
        setError(response);
        return;
      }

      if (Array.isArray(response) && response.length > 0) {
        setData((prev) => [...prev, ...response]);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      setError(error as Error);
    } finally {
      setIsLoading(false);
    }
  }, [handler, hasMore, isLoading, page, setData, setError, setHasMore, setIsLoading]);

  useEffect(() => {
    if (page === 1 && data.length === 0 && isFirstLoad.current) {
      isFirstLoad.current = false;
      void fetchData();
    }
  }, [data.length, fetchData, isFirstLoad, page]);

  useEffect(() => {
    if (isFirstLoad.current || page === 1) return;
    void fetchData();
  }, [fetchData, isFirstLoad, page, trigger]);

  useEffect(() => {
    if (isFirstLoad.current) return;

    const observerInstance = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoading && hasMore && data.length > 0) {
          setPage((prev) => prev + 1);
        }
      },
      {
        root: null,
        threshold: 0.1,
      }
    );

    const element = ref.current;
    if (element) {
      observerInstance.observe(element);
    }

    return () => observerInstance.disconnect();
  }, [data.length, hasMore, isFirstLoad, isLoading, setPage, trigger]);

  return {
    ref,
    isLoading,
    hasMore,
    error,
    data,
    page,
  };
};
