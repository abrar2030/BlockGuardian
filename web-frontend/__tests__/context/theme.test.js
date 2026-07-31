import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, useTheme } from "../../context/ThemeContext";

function ToggleProbe() {
  const { darkMode, toggleDarkMode } = useTheme();
  return (
    <button onClick={toggleDarkMode}>{darkMode ? "dark" : "light"}</button>
  );
}

describe("ThemeContext", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark");
    localStorage.clear();
  });

  it("toggles the `dark` class on <html> when toggleDarkMode is called", () => {
    render(
      <ThemeProvider>
        <ToggleProbe />
      </ThemeProvider>,
    );

    expect(document.documentElement).not.toHaveClass("dark");
    expect(screen.getByText("light")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button"));
    expect(document.documentElement).toHaveClass("dark");
    expect(screen.getByText("dark")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button"));
    expect(document.documentElement).not.toHaveClass("dark");
    expect(screen.getByText("light")).toBeInTheDocument();
  });

  it("persists the preference to localStorage under bg_dark_mode", () => {
    render(
      <ThemeProvider>
        <ToggleProbe />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole("button"));
    expect(localStorage.getItem("bg_dark_mode")).toBe("true");

    fireEvent.click(screen.getByRole("button"));
    expect(localStorage.getItem("bg_dark_mode")).toBe("false");
  });

  it("useTheme throws when used outside a ThemeProvider", () => {
    // Suppress the expected React error boundary console noise for this case.
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    function Bare() {
      useTheme();
      return null;
    }
    expect(() => render(<Bare />)).toThrow(
      "useTheme must be used within ThemeProvider",
    );
    spy.mockRestore();
  });
});
