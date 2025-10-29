import { useState } from "react";

export default function usePagination(data = [], itemsPerPage = 24) {
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const paginatedData = data.slice(startIndex, startIndex + itemsPerPage);

  const handlePrev = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNext = () => {
    if (page < totalPages) setPage(page + 1);
  };

  return { 
    page,
    totalPages,
    paginatedData,
    handlePrev,
    handleNext,
    setPage // useful if you want jump-to-page feature later
  };
}
