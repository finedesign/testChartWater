import { useColorScheme } from "react-native";

export const useTheme = (override?: "light"|"dark") => {
  // Call hooks unconditionally
  const colorScheme = useColorScheme();
  // Then use the result conditionally
  return override ?? (colorScheme ?? "light");
}; 