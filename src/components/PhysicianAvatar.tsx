const colorMap: Record<string, string> = {
  teal:   "bg-teal-50 text-teal-600",
  blue:   "bg-blue-50 text-blue-600",
  purple: "bg-purple-50 text-purple-600",
  amber:  "bg-amber-50 text-amber-600",
};

const sizeClasses = {
  sm: "w-9 h-9 text-xs rounded-xl",
  md: "w-11 h-11 text-sm rounded-xl",
  lg: "w-16 h-16 text-xl rounded-2xl",
};

export function PhysicianAvatar({
  initials,
  color,
  size = "md",
}: {
  initials: string;
  color: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div
      className={`${sizeClasses[size]} ${colorMap[color] ?? "bg-slate-100 text-slate-600"} flex items-center justify-center font-semibold flex-shrink-0`}
    >
      {initials}
    </div>
  );
}
