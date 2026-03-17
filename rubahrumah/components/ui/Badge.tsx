type BadgeVariant = "green" | "yellow" | "red" | "blue" | "gray" | "orange";

const variantClasses: Record<BadgeVariant, string> = {
  green: "text-green-600",
  yellow: "text-yellow-500",
  red: "text-red-500",
  blue: "text-blue-500",
  gray: "text-gray-500",
  orange: "text-orange-500",
};

export default function Badge({
  children,
  variant = "gray",
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
}) {
  return (
    <span className={`font-medium text-sm ${variantClasses[variant]}`}>
      {children}
    </span>
  );
}
