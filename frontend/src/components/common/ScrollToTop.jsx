import useScrollToTop from "hooks/useScrollToTop";

/**
 * Component tự động scroll lên đầu trang khi route thay đổi
 * Sử dụng useScrollToTop hook với default options
 */
const ScrollToTop = () => {
  useScrollToTop();
  return null;
};

export default ScrollToTop;
