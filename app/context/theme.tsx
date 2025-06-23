import { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "fashion-store-theme",
  ...props
}: ThemeProviderProps) {
  const colorScheme = useColorScheme();
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [isLoading, setIsLoading] = useState(true);

  // Load theme from AsyncStorage on component mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem(storageKey);
        if (storedTheme) {
          setThemeState(storedTheme as Theme);
        }
      } catch (error) {
        console.error("Error loading theme", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, []);

  // Apply theme changes
  useEffect(() => {
    if (isLoading) return;

    const applyTheme = async () => {
      try {
        if (theme === "system") {
          // Use the device's color scheme when "system" is selected
          await AsyncStorage.setItem(storageKey, "system");
        } else {
          await AsyncStorage.setItem(storageKey, theme);
        }
      } catch (error) {
        console.error("Error saving theme", error);
      }
    };

    applyTheme();
  }, [theme, isLoading]);

  // Custom setTheme function that saves to AsyncStorage
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  // Determine the actual theme to apply
  const resolvedTheme: Theme = 
    theme === "system" 
      ? (colorScheme === "dark" ? "dark" : "light")
      : theme;

  const value = {
    theme: resolvedTheme,
    setTheme,
  };

  // Prevent rendering until theme is loaded
  if (isLoading) {
    return null;
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
};

export default ThemeProvider;