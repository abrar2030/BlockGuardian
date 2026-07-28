import { render, screen, fireEvent } from "@testing-library/react";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";

describe("Button", () => {
  it("renders its label", () => {
    render(<Button>Save changes</Button>);
    expect(screen.getByText("Save changes")).toBeInTheDocument();
  });

  it("fires onClick when pressed", () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    fireEvent.click(screen.getByText("Click me"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("disables interaction while loading", () => {
    const onClick = jest.fn();
    render(
      <Button onClick={onClick} isLoading>
        Submitting
      </Button>,
    );
    fireEvent.click(screen.getByText("Submitting"));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("Badge", () => {
  it("renders children text", () => {
    render(<Badge color="green">Active</Badge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });
});

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(
      <EmptyState
        title="No portfolios yet"
        description="Create one to get started"
      />,
    );
    expect(screen.getByText("No portfolios yet")).toBeInTheDocument();
    expect(screen.getByText("Create one to get started")).toBeInTheDocument();
  });
});
