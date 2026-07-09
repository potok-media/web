import React from "react";
import type { UIComponentSchema } from "@potok/sdk-types";
import { Grid } from "../Grid";
import { buildComponentBaseStyle, mapJustifyContent, sdkStyleVars } from "./componentRendererUtils";

interface LayoutProps {
  schema: UIComponentSchema;
  renderChild: (child: UIComponentSchema, index: number) => React.ReactNode;
}

export const SdkVStack: React.FC<LayoutProps> = ({ schema, renderChild }) => {
  const { id, children, props } = schema;
  const componentProps = props as {
    spacing?: number;
    alignItems?: React.CSSProperties["alignItems"];
    justifyContent?: string;
  };
  const layoutStyle: React.CSSProperties = {
    ...buildComponentBaseStyle(schema),
    gap: componentProps.spacing !== undefined ? `${componentProps.spacing}px` : undefined,
    alignItems: componentProps.alignItems,
    justifyContent: mapJustifyContent(componentProps.justifyContent),
  };
  return (
    <div id={id} className="potok-vstack potok-sdk-props" style={sdkStyleVars(layoutStyle)}>
      {children?.map((child, index) => renderChild(child, index))}
    </div>
  );
};

export const SdkHStack: React.FC<LayoutProps> = ({ schema, renderChild }) => {
  const { id, children, props } = schema;
  const componentProps = props as {
    spacing?: number;
    alignItems?: React.CSSProperties["alignItems"];
    justifyContent?: string;
  };
  const layoutStyle: React.CSSProperties = {
    ...buildComponentBaseStyle(schema),
    gap: componentProps.spacing !== undefined ? `${componentProps.spacing}px` : undefined,
    alignItems: componentProps.alignItems,
    justifyContent: mapJustifyContent(componentProps.justifyContent),
  };
  return (
    <div id={id} className="potok-hstack potok-sdk-props" style={sdkStyleVars(layoutStyle)}>
      {children?.map((child, index) => renderChild(child, index))}
    </div>
  );
};

export const SdkGrid: React.FC<LayoutProps> = ({ schema, renderChild }) => {
  const { children, props } = schema;
  const componentProps = props as { minWidth?: string; gap?: string };
  return (
    <Grid
      minWidth={componentProps.minWidth || "11.25rem"}
      gap={componentProps.gap}
      className="potok-sdk-props"
      style={sdkStyleVars(buildComponentBaseStyle(schema))}
    >
      {children?.map((child, index) => renderChild(child, index))}
    </Grid>
  );
};

export const SdkCard: React.FC<LayoutProps & { onClick?: () => void }> = ({ schema, renderChild, onClick }) => {
  const { id, children, props, events } = schema;
  const componentProps = props as { title?: string; subtitle?: string };
  const isInteractive = !!events?.onClick;

  return (
    <div
      id={id}
      className={`potok-card potok-sdk-props ${isInteractive ? "potok-card-interactive" : ""}`}
      style={sdkStyleVars(buildComponentBaseStyle(schema))}
      onClick={isInteractive ? onClick : undefined}
    >
      {(componentProps.title || componentProps.subtitle) && (
        <div className="potok-card-header">
          {componentProps.title && <h3 className="potok-card-title">{componentProps.title}</h3>}
          {componentProps.subtitle && <p className="potok-card-subtitle">{componentProps.subtitle}</p>}
        </div>
      )}
      <div className="potok-card-body">
        {children?.map((child, index) => renderChild(child, index))}
      </div>
    </div>
  );
};