import { useCallback, useState } from "react";

export const usePagination = (initPage: number = 1) => {
  const [currentPage, setCurrentPage] = useState<number>(initPage);

  const calculateTotalPage = useCallback(
    (total: number, pageSize: number = 10) => {
      if (total < 1) return 0;
      return Math.ceil(total / pageSize);
    },
    []
  );

  const handleFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const handleLastPage = useCallback(
    (totalCount: number) => {
      const totalPage = calculateTotalPage(totalCount);

      if (totalPage < 1) return;
      setCurrentPage(totalPage);
    },
    [calculateTotalPage]
  );

  const handlePageChange = useCallback(
    (page: number, totalCount: number) => {
      const totalPage = calculateTotalPage(totalCount);

      if (page < 1 || page > totalPage) return;
      setCurrentPage(page);
    },
    [calculateTotalPage]
  );

  const handleNextPage = useCallback(
    (totalCount: number) => {
      const totalPage = calculateTotalPage(totalCount);
      if (currentPage < totalPage) {
        setCurrentPage((prev) => prev + 1);
      }
    },
    [calculateTotalPage, currentPage]
  );

  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [currentPage]);

  return {
    currentPage,
    handlePageChange,
    handleLastPage,
    handleFirstPage,
    handleNextPage,
    handlePrevPage,
  };
};
