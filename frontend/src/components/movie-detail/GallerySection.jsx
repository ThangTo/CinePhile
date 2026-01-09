import React, { useState } from "react";
import OptimizedImage from "components/common/OptimizedImage";
import { FiX } from "react-icons/fi";

const GallerySection = ({ movie }) => {
  const [selectedImage, setSelectedImage] = useState(null);

  // Tổng hợp tất cả images
  const allImages = [];

  // Thêm poster_url và thumb_url nếu có
  if (movie.poster_url) {
    allImages.push({
      url: movie.poster_url,
      type: "Poster",
      label: "Poster Main",
    });
  }

  if (movie.thumb_url && movie.thumb_url !== movie.poster_url) {
    allImages.push({
      url: movie.thumb_url,
      type: "Backdrop",
      label: "Backdrop",
    });
  }

  // Thêm posters từ images
  if (movie.images?.posters && Array.isArray(movie.images.posters)) {
    movie.images.posters.forEach((url, index) => {
      // Tránh trùng với poster_url đã thêm
      if (url !== movie.poster_url) {
        allImages.push({
          url,
          type: "Poster",
          label: `Poster ${index + 1}`,
        });
      }
    });
  }

  // Thêm backdrops từ images
  if (movie.images?.backdrops && Array.isArray(movie.images.backdrops)) {
    movie.images.backdrops.forEach((url, index) => {
      allImages.push({
        url,
        type: "Backdrop",
        label: `Backdrop ${index + 1}`,
      });
    });
  }

  if (allImages.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-400">Chưa có ảnh gallery cho phim này.</p>
      </div>
    );
  }

  return (
    <div className="py-6">
      <h3 className="text-2xl font-bold mb-6 text-gray-100">Gallery</h3>

      {/* Grid Gallery */}
      <div className="flex flex-wrap gap-2">
        {allImages.map((image, index) => (
          <div
            key={index}
            className="relative rounded-lg overflow-hidden cursor-pointer group hover:scale- transition-transform duration-300 bg-gray-800"
            onClick={() => setSelectedImage(image)}
          >
            {image.type === "Poster" ? (
              <OptimizedImage
                src={image.url}
                alt={image.label}
                className="w-full h-52 object-cover"
                sizeKey="CARD"
                lazy={true}
              />
            ) : (
              <OptimizedImage
                src={image.url}
                alt={image.label}
                className="w-full h-52 object-cover"
                sizeKey="BANNER"
                lazy={true}
              />
            )}
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/0 md:group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center pointer-events-none">
              {/* <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {image.type}
              </span> */}
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="hidden md:flex fixed inset-0 z-50 bg-black/95 items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="max-w-3xl max-h-[80vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedImage.type === "Poster" ? (
              <OptimizedImage
                src={selectedImage.url}
                alt={selectedImage.label}
                className="max-w-full max-h-full object-cover"
                sizeKey="DETAIL"
                priority={true}
              />
            ) : (
              <OptimizedImage
                src={selectedImage.url}
                alt={selectedImage.label}
                className="max-w-full max-h-full object-cover"
                sizeKey="BANNER"
                priority={true}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GallerySection;
