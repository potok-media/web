import { baseDts } from "./typings/base";
import { layoutDts } from "./typings/layout";
import { inputsDts } from "./typings/inputs";
import { mediaBuildersDts } from "./typings/mediaBuilders";
import { streamBuildersDts } from "./typings/streamBuilders";
import { contentDts } from "./typings/content";
import { overlaysDts } from "./typings/overlays";
import { containersDts } from "./typings/containers";
import { dataTypesDts } from "./typings/dataTypes";
import { domainTypesDts } from "./typings/domainTypes";
import { hostApiDts } from "./typings/hostApi";
import { globalsDts } from "./typings/globals";

/**
 * Hand-written .d.ts surface shown to plugin authors, Monaco and AI.
 * Assembled from cohesive fragments under ./typings so each stays maintainable and small.
 * NOTE: this is a plain string (not type-checked by tsc); keep it in sync with ./types.ts.
 */
export const SDK_TYPINGS = [
  baseDts,
  dataTypesDts,
  domainTypesDts,
  layoutDts,
  inputsDts,
  mediaBuildersDts,
  streamBuildersDts,
  contentDts,
  overlaysDts,
  containersDts,
  hostApiDts,
  globalsDts,
].join("\n");
