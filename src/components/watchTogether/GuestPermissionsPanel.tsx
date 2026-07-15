import React from "react";
import { useTranslation } from "react-i18next";
import { Switch } from "../ui";
import type { GuestPermissions } from "../../network/watchTogetherTypes";

interface GuestPermissionsPanelProps {
  permissions: GuestPermissions;
  onChange: (perms: GuestPermissions) => void;
}

// Host-only: what guests are allowed to do. Default is nothing.
export const GuestPermissionsPanel: React.FC<GuestPermissionsPanelProps> = React.memo(
  ({ permissions, onChange }) => {
    const { t } = useTranslation("watchTogether");
    return (
      <section className="wt-perms">
        <label className="wt-perms__row">
          <span className="wt-perms__label">
            {t("permissions.canControl")}
            <small className="wt-perms__hint">{t("permissions.canControlHint")}</small>
          </span>
          <Switch
            checked={permissions.canControl}
            onCheckedChange={(canControl) => onChange({ canControl })}
          />
        </label>
      </section>
    );
  },
);
