import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  children: ReactNode;
};

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-vault-500 hover:bg-vault-400 text-white shadow-glow border border-vault-400/40",
  secondary:
    "bg-vault-700 hover:bg-vault-600 text-white border border-vault-500/40",
  ghost: "bg-transparent hover:bg-white/5 text-slate-200 border border-white/10",
};

export const Button = ({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonProps) => (
  <button
    className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
      variantClasses[variant]
    } ${className ?? ""}`}
    {...props}
  >
    {children}
  </button>
);
