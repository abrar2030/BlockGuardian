export default function Spinner({ size = "h-8 w-8", className = "" }) {
  return (
    <div className={`spinner ${size} border-t-transparent ${className}`} />
  );
}

export function PageLoader({ label = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24">
      <Spinner />
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}
