import { useEffect, useRef, useState } from "react";
import movieService from "services/movie.service";

const defaultOptions = { genres: [], countries: [] };

const useFilterOptions = () => {
  const [options, setOptions] = useState(defaultOptions);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortRef = useRef(false);

  useEffect(() => {
    abortRef.current = false;

    const fetchOptions = async () => {
      try {
        setLoading(true);
        // Service layer đã có cache, không cần cache ở đây nữa
        const response = await movieService.getFilterOptions();
        const payload = response?.data?.genres ? response : { data: response };
        const normalized = {
          genres: payload.data?.genres || payload.genres || [],
          countries: payload.data?.countries || payload.countries || [],
        };

        if (!abortRef.current) {
          setOptions(normalized);
          setError(null);
        }
      } catch (err) {
        if (!abortRef.current) {
          console.error("Failed to load filter options:", err);
          setError(err);
        }
      } finally {
        if (!abortRef.current) {
          setLoading(false);
        }
      }
    };

    fetchOptions();

    return () => {
      abortRef.current = true;
    };
  }, []);

  const refresh = async () => {
    // Clear service layer cache by calling API again
    // Service sẽ tự động refresh cache nếu cần
    setOptions(defaultOptions);
    setLoading(true);
    try {
      const response = await movieService.getFilterOptions();
      const payload = response?.data?.genres ? response : { data: response };
      const normalized = {
        genres: payload.data?.genres || payload.genres || [],
        countries: payload.data?.countries || payload.countries || [],
      };
      setOptions(normalized);
    } catch (err) {
      console.error("Failed to refresh filter options:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return { options, loading, error, refresh };
};

export default useFilterOptions;
