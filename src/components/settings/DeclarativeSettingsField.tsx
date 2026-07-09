import React from "react";
import type { TFunction } from "i18next";
import { Eye, EyeOff } from "lucide-react";
import { cx, Field, IconButton, Input, Select, Switch } from "../ui";
import type { SelectOption } from "../ui";
import {
  type DeclarativeConfigItem,
  type DeclarativeSettingValue,
  isPasswordConfigKey,
} from "./declarativeSettingsTypes";

export interface DeclarativeSettingsFieldProps {
  extId: string;
  fieldKey: string;
  item: DeclarativeConfigItem;
  value: DeclarativeSettingValue | undefined;
  showPassword: boolean;
  isInline?: boolean;
  t: TFunction<"settings">;
  onChange: (key: string, val: DeclarativeSettingValue) => void;
  onTogglePassword: (key: string) => void;
}

export const DeclarativeSettingsField: React.FC<DeclarativeSettingsFieldProps> = ({
  extId,
  fieldKey,
  item,
  value,
  showPassword,
  isInline = false,
  t,
  onChange,
  onTogglePassword,
}) => {
  const labelText = item.label ? (item.label.includes(":") ? t(item.label) : item.label) : fieldKey;
  const descriptionHtml = item.descriptionHtml
    ? item.descriptionHtml.includes(":")
      ? t(item.descriptionHtml)
      : item.descriptionHtml
    : undefined;

  if (item.type === "notice") {
    const displayVal = value !== undefined ? String(value) : String(item.default || "");
    if (!displayVal) return null;
    return (
      <div className={cx("settings-notice-group", !isInline && "settings-form-group")}>
        <div className="settings-notice-banner">
          <span className="settings-notice-banner__text" dangerouslySetInnerHTML={{ __html: displayVal }} />
        </div>
      </div>
    );
  }

  if (item.type === "boolean") {
    const checkedVal = value !== undefined ? !!value : !!item.default;
    return (
      <div className={cx("settings-boolean-field", isInline && "settings-boolean-field--inline", !isInline && "settings-form-group")}>
        <div className="settings-toggle-row settings-toggle-row--config">
          <span className="settings-label settings-toggle-label">{labelText}</span>
          <Switch
            id={`config-${extId}-${fieldKey}`}
            checked={checkedVal}
            onCheckedChange={(checked) => onChange(fieldKey, checked)}
          />
        </div>
        {!isInline && descriptionHtml && (
          <span className="settings-description" dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
        )}
      </div>
    );
  }

  const fieldId = `config-${extId}-${fieldKey}`;

  const fieldInput = (() => {
    if (item.type === "number") {
      const numVal = value !== undefined ? Number(value) : Number(item.default);
      return (
        <Input
          type="number"
          id={fieldId}
          value={Number.isNaN(numVal) ? "" : numVal}
          onChange={(e) => onChange(fieldKey, e.target.value === "" ? "" : Number(e.target.value))}
        />
      );
    }

    if (item.type === "select") {
      const strVal = value !== undefined ? String(value) : String(item.default);
      const options: SelectOption<string>[] = (item.options ?? []).map((opt) => ({
        value: opt.value,
        label: opt.label ? (opt.label.includes(":") ? t(opt.label) : opt.label) : opt.value,
      }));
      return (
        <Select id={fieldId} value={strVal} options={options} onChange={(v) => onChange(fieldKey, v)} block />
      );
    }

    const strVal = value !== undefined ? String(value) : String(item.default);
    const isPassword = isPasswordConfigKey(fieldKey, item.label || "");

    if (isPassword) {
      return (
        <div className="ui-password-row">
          <Input
            type={showPassword ? "text" : "password"}
            id={fieldId}
            value={strVal}
            onChange={(e) => onChange(fieldKey, e.target.value)}
          />
          <IconButton
            type="button"
            size="sm"
            onClick={() => onTogglePassword(fieldKey)}
            className="profile-btn"
            title={showPassword ? t("declarative.hide") : t("declarative.show")}
            aria-label={showPassword ? t("declarative.hide") : t("declarative.show")}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </IconButton>
        </div>
      );
    }

    return (
      <Input type="text" id={fieldId} value={strVal} onChange={(e) => onChange(fieldKey, e.target.value)} />
    );
  })();

  if (isInline) {
    return (
      <Field
        label={labelText}
        htmlFor={fieldId}
        className={cx("ui-inline-field", fieldKey === "aiApiKey" ? "ui-inline-field--grow" : "ui-inline-field--shrink")}
      >
        {fieldInput}
      </Field>
    );
  }

  const hint = descriptionHtml ? (
    <span className="settings-description" dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
  ) : undefined;

  return (
    <Field label={labelText} htmlFor={fieldId} hint={hint} className="settings-form-group">
      {fieldInput}
    </Field>
  );
};

export default DeclarativeSettingsField;