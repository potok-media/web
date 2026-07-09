import React from "react";
import * as Lucide from "lucide-react";
import { useLocation } from "react-router-dom";
import type { UIComponentSchema } from "@potok/sdk-types";
import { Button } from "../../ui";
import { ExtensionRegistry } from "../../../utils/extensions/ExtensionRegistry";
import { logger } from "../../../utils/logger";
import { cx } from "../../ui/cx";
import {
  buildComponentBaseStyle,
  resolveButtonVariant,
  resolveSdkButtonExtraClass,
  sdkStyleVars,
  toPascalCase,
} from "./componentRendererUtils";

interface SdkButtonRendererProps {
  schema: UIComponentSchema;
  pluginId: string;
}

export const SdkButtonRenderer: React.FC<SdkButtonRendererProps> = ({ schema, pluginId }) => {
  const location = useLocation();
  const componentProps = schema.props as {
    text?: string;
    variant?: string;
    icon?: string;
    disabled?: boolean;
  };
  const variant = componentProps.variant || "secondary";
  const isSidebarItem = variant === "sidebar-item";
  const isActive = isSidebarItem && location.pathname.toLowerCase() === `/extensions/${pluginId.toLowerCase()}`;

  let buttonText = componentProps.text || "";
  if (isSidebarItem && buttonText.length > 20) {
    buttonText = `${buttonText.substring(0, 17)}...`;
  }

  let iconNode: React.ReactNode = null;
  const iconName = componentProps.icon;
  if (iconName) {
    const pascalName = toPascalCase(iconName);
    const lucideIcons = Lucide as unknown as Record<string, React.ComponentType<{ size?: number | string }>>;
    const DynamicIcon = lucideIcons[pascalName] || lucideIcons[iconName];
    if (DynamicIcon) {
      iconNode = <DynamicIcon size="1.125rem" />;
    } else {
      const iconUrl = `/assets/icons/${iconName}.svg`;
      iconNode = (
        <span
          className="sdk-btn-mask-icon"
          style={{ "--mask-url": `url(${iconUrl})` } as React.CSSProperties}
        />
      );
    }
  }

  const handleClick = () => {
    logger.log("[ComponentRenderer] Button Clicked!", {
      text: componentProps.text,
      pluginId,
      events: schema.events,
      schema,
    });
    if (schema.events?.onClick) {
      ExtensionRegistry.triggerUIEvent(pluginId, schema.events.onClick, {});
    } else {
      logger.warn("[ComponentRenderer] No onClick event registered in events schema!");
    }
  };

  const baseStyle = buildComponentBaseStyle(schema);

  if (isSidebarItem) {
    return (
      <Button
        variant="ghost"
        className={`sidebar-nav-item ${isActive ? "active" : ""} potok-sdk-props`}
        disabled={componentProps.disabled}
        onClick={handleClick}
        style={sdkStyleVars(baseStyle)}
      >
        {iconNode}
        <span>{buttonText}</span>
      </Button>
    );
  }

  const extraClass = resolveSdkButtonExtraClass(variant);

  return (
    <Button
      variant={resolveButtonVariant(variant)}
      disabled={componentProps.disabled}
      onClick={handleClick}
      className={cx("potok-sdk-props", extraClass)}
      style={sdkStyleVars(baseStyle)}
    >
      {iconNode}
      <span>{buttonText}</span>
    </Button>
  );
};