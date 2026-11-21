/* eslint-disable @next/next/no-img-element */
import { cn } from "cn";
import { initials } from "@/lib/format";

export function PersonAvatar({
  personId,
  name,
  imageId,
  size = "default",
  className,
}: {
  personId: string;
  name: string;
  imageId?: string | null;
  size?: "sm" | "default" | "lg" | "xl";
  className?: string;
}) {
  const sizes = {
    sm: "size-8 text-[11px]",
    default: "size-10 text-xs",
    lg: "size-14 text-base",
    xl: "size-24 text-2xl",
  };

  if (imageId) {
    return (
      <img
        src={`/api/backend/persons/${personId}/images/${imageId}/content`}
        alt={name}
        className={cn(
          "shrink-0 rounded-full border border-border object-cover",
          sizes[size],
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-primary/10 bg-gradient-to-br from-primary/10 to-primary/5 font-semibold text-primary",
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}
