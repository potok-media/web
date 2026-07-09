export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "accent" | "glass";
export type ControlSize = "sm" | "md" | "lg";

export interface SelectOption<T extends string | number = string> {
  value: T;
  label: string;
  disabled?: boolean;
}