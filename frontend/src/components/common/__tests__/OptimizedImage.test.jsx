import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import OptimizedImage from "components/common/OptimizedImage";

jest.mock("components/common/LazySection", () => ({
  useSectionVisible: () => true,
}));

jest.mock("utils/imagePreloader", () => ({
  preloadImage: jest.fn(() => Promise.resolve()),
}));

describe("OptimizedImage", () => {
  const sourceUrl = "https://phimimg.com/poster/example.jpg";
  const fallbackUrl = "https://image.tmdb.org/t/p/w500/example.jpg";

  test("falls back to the original source when the optimized image fails", async () => {
    render(<OptimizedImage src={sourceUrl} alt="Example poster" sizeKey="CARD" />);

    const image = await screen.findByRole("img", { name: "Example poster" });
    expect(image.getAttribute("src")).toBe(
      "https://images.weserv.nl/?url=https://phimimg.com/poster/example.jpg&w=250&q=85&output=webp"
    );

    fireEvent.error(image);

    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Example poster" }).getAttribute("src")).toBe(sourceUrl);
    });
  });

  test("tries the next fallback source only after its original URL also fails", async () => {
    render(
      <OptimizedImage
        src={sourceUrl}
        fallbackSrcs={[fallbackUrl]}
        alt="Example poster"
        sizeKey="CARD"
      />
    );

    fireEvent.error(await screen.findByRole("img", { name: "Example poster" }));

    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Example poster" }).getAttribute("src")).toBe(sourceUrl);
    });

    fireEvent.error(screen.getByRole("img", { name: "Example poster" }));

    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Example poster" }).getAttribute("src")).toBe(
        "https://images.weserv.nl/?url=https://image.tmdb.org/t/p/w500/example.jpg&w=250&q=85&output=webp"
      );
    });
  });
});
