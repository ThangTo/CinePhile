/**
 * useAuth hook - Re-export from AuthContext for backward compatibility
 * All components should use this hook to access auth context
 */
export { useAuth } from "../contexts/AuthContext";

// Default export for backward compatibility
export { useAuth as default } from "../contexts/AuthContext";
