import type React from "react";
import type { UIComponentSchema } from "@potok/sdk-types";

export interface HostMediaRendererProps<T extends UIComponentSchema = UIComponentSchema> {
  schema: T;
  pluginId: string;
  baseStyle: React.CSSProperties;
}