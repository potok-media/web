import React from "react";
import { cx } from "../ui";

interface SettingsCardProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  meta?: React.ReactNode;
  footer?: React.ReactNode;
  bodyClassName?: string;
}

export const SettingsCard: React.FC<SettingsCardProps> = ({
  title,
  icon,
  meta,
  footer,
  bodyClassName,
  className,
  children,
  ...rest
}) => (
  <section className={cx("settings-card", className)} {...rest}>
    {(title != null || meta != null) && (
      <header className="settings-card__header">
        {title != null && (
          <h2 className="settings-card__title">
            {icon}
            <span>{title}</span>
          </h2>
        )}
        {meta != null && <div className="settings-card__meta">{meta}</div>}
      </header>
    )}
    <div className={cx("settings-card__body", bodyClassName)}>{children}</div>
    {footer != null && <footer className="settings-card__footer">{footer}</footer>}
  </section>
);

export default SettingsCard;
