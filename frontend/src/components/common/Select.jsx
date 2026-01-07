import React, { useState, useRef, useEffect, useCallback } from "react";
import { FiChevronDown, FiCheck } from "react-icons/fi";

/**
 * Custom Select Component with beautiful UI
 * @param {Object} props
 * @param {string} props.value - Selected value
 * @param {Function} props.onChange - Change handler: (value: string) => void
 * @param {Array<{value: string, label: string}>|Array<string>} props.options - Options array
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.disabled - Disabled state
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.name - Input name attribute
 * @param {string} props.id - Input id attribute
 * @param {string} props.bgColor - Background color class (default: "bg-black/20")
 * @param {string} props.size - Size: "sm" | "md" | "lg" (default: "md")
 * @param {boolean} props.searchable - Enable search functionality (default: false)
 */
const Select = ({
  value,
  onChange,
  options = [],
  placeholder = "Chọn...",
  disabled = false,
  className = "",
  name,
  id,
  bgColor = "bg-black/20",
  bgDropdown = "bg-bgColor",
  size = "md",
  searchable = false,
  ...rest
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Normalize options to array of {value, label}
  const normalizedOptions = options.map((option) => {
    if (typeof option === "object" && option !== null) {
      return { value: option.value, label: option.label || option.value };
    }
    return { value: option, label: option };
  });

  // Filter options based on search query
  const filteredOptions = searchable
    ? normalizedOptions.filter((option) =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : normalizedOptions;

  // Get selected option label
  const selectedOption = normalizedOptions.find((opt) => opt.value === value);
  const displayValue = selectedOption ? selectedOption.label : placeholder;

  const handleSelect = useCallback(
    (selectedValue) => {
      if (onChange) {
        onChange(selectedValue);
      }
      setIsOpen(false);
      setSearchQuery("");
      setFocusedIndex(-1);
    },
    [onChange]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
      if (!isOpen) {
        if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
          e.preventDefault();
          setIsOpen(true);
          if (inputRef.current) inputRef.current.focus();
        }
        return;
      }

      switch (e.key) {
        case "Escape":
          setIsOpen(false);
          setSearchQuery("");
          setFocusedIndex(-1);
          break;
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
            handleSelect(filteredOptions[focusedIndex].value);
          }
          break;
        default:
          if (searchable && e.key.length === 1) {
            inputRef.current?.focus();
          }
      }
    },
    [isOpen, filteredOptions, focusedIndex, searchable, handleSelect]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery("");
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  // Scroll focused option into view
  useEffect(() => {
    if (focusedIndex >= 0 && dropdownRef.current) {
      const focusedElement = dropdownRef.current.children[focusedIndex];
      if (focusedElement) {
        focusedElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }
  }, [focusedIndex]);

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen && searchable && inputRef.current) {
        setTimeout(() => inputRef.current.focus(), 0);
      }
    }
  };

  // Size classes
  const sizeClasses = {
    sm: "py-2 px-3 text-sm",
    md: "py-3 px-4 text-base",
    lg: "py-4 px-5 text-lg",
  };

  const baseClasses = `w-full ${bgColor} border border-white/10 rounded-2xl text-white transition-all duration-200 cursor-pointer relative`;
  const disabledClasses = disabled
    ? "opacity-50 cursor-not-allowed"
    : "hover:border-white/20 hover:bg-black/30";
  const openClasses = isOpen ? "border-primaryColor/50 ring-2 ring-primaryColor/20" : "";
  const finalClassName = `${baseClasses} ${disabledClasses} ${openClasses} ${className}`.trim();

  return (
    <div ref={wrapperRef} className="relative w-full" {...rest}>
      {/* Hidden input for form submission */}
      {name && <input type="hidden" name={name} value={value || ""} />}

      {/* Select Button */}
      <button
        type="button"
        id={id}
        onClick={toggleDropdown}
        disabled={disabled}
        className={`${finalClassName} ${sizeClasses[size]} flex items-center justify-between gap-3`}
      >
        <span
          className={`flex-1 text-left truncate ${
            !selectedOption ? "text-gray-400" : "text-white"
          }`}
        >
          {displayValue}
        </span>
        <FiChevronDown
          className={`text-gray-400 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
          size={20}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div
          className={`absolute z-50 w-full mt-2 ${bgDropdown} border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up`}
          style={{
            maxHeight: "300px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
          }}
        >
          {/* Search Input */}
          {searchable && (
            <div className="p-3 border-b border-white/10 bg-black/20">
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setFocusedIndex(-1);
                }}
                placeholder="Tìm kiếm..."
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-primaryColor focus:ring-1 focus:ring-primaryColor/50 transition-all"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* Options List */}
          <div
            ref={dropdownRef}
            className="overflow-y-auto custom-scrollbar"
            style={{ maxHeight: searchable ? "240px" : "300px" }}
          >
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                {searchable && searchQuery ? "Không tìm thấy kết quả" : "Không có tùy chọn"}
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = option.value === value;
                const isFocused = index === focusedIndex;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    onMouseEnter={() => setFocusedIndex(index)}
                    className={`w-full px-4 py-3 text-left text-white transition-all duration-150 flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-primaryColor/20 text-primaryColor font-semibold"
                        : isFocused
                        ? "bg-white/5 text-white"
                        : "hover:bg-white/5 text-gray-300 hover:text-white"
                    }`}
                  >
                    <span className="flex-1 truncate">{option.label}</span>
                    {isSelected && (
                      <FiCheck className="text-primaryColor flex-shrink-0" size={18} />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Select;
