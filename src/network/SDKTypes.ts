/**
 * Potok Extension & Plugin SDK Core TypeScript Definitions
 * Strict compliance with WEB_ARCHITECTURAL_STANDARDS.md.
 */

export interface UIComponentSchema {
  type: string;
  id: string;
  props: {
    padding?: number | [number, number] | [number, number, number, number];
    margin?: number | [number, number] | [number, number, number, number];
    width?: string | number;
    height?: string | number;
    visible?: boolean;
    disabled?: boolean;
    flex?: number;
    text?: string;
    level?: 1 | 2 | 3 | 4;
    variant?: 'primary' | 'secondary' | 'hint' | 'error' | 'success' | 'danger' | 'ghost';
    size?: 'xs' | 'sm' | 'md' | 'lg';
    bold?: boolean;
    color?: 'info' | 'success' | 'warning' | 'error';
    name?: string;
    label?: string;
    placeholder?: string;
    inputType?: 'text' | 'password' | 'number';
    value?: string | number;
    checked?: boolean;
    description?: string;
    options?: { label: string; value: string }[];
    selected?: string;
    title?: string;
    subtitle?: string;
    spacing?: number;
    alignItems?: 'start' | 'center' | 'end' | 'stretch';
    justifyContent?: 'start' | 'center' | 'end' | 'between' | 'around';
    torrent?: any;
    streams?: RawStreamPayload[];
    loading?: boolean;
    showFilters?: boolean;
    emptyText?: string;
  };
  children?: UIComponentSchema[];
  events?: {
    onClick?: string;
    onChange?: string;
    onSelectStream?: string;
  };
}

export interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  entrypoint: string;
  permissions?: string[];
  slots?: {
    slotName: string;
    id: string;
    title: string;
  }[];
  config?: Record<
    string,
    {
      type: 'string' | 'boolean' | 'number';
      default: string | boolean | number;
      label: string;
    }
  >;
}

export interface ExtensionPluginMetadata {
  id: string;
  name: string;
  version: string;
  description?: string;
}

export interface LookupQuery {
  type: 'movie' | 'tv';
  tmdbId: number;
  season?: number;
  episode?: number;
}

export interface StreamResult {
  provider: string;
  quality: string;
  voice: string;
  label: string;
  url: string;
  kind: 'hls' | 'mp4';
  headers?: Record<string, string>;
  audios?: { name: string; url: string }[];
}

export interface LookupSource {
  id: string;
  name: string;
  supportedTypes: string[];
}

export interface SlotContribution {
  slotName: string;
  id: string;
  title?: string;
}

export interface SlotRenderResponse {
  slotId: string;
  label: string;
  icon?: string;
  layout: UIComponentSchema;
}

export interface RegisteredExtension {
  id: string;
  url: string; // The base directory URL of the extension
  manifest: ExtensionManifest;
  enabled: boolean;
}

export interface ElementMutation {
  elementId: string;
  action: 'hide' | 'edit' | 'before' | 'after' | 'replace';
  props?: Record<string, any>;
  layout?: UIComponentSchema;
}

export interface BlockMutationContribution {
  blockName: string;
  mutations: ElementMutation[];
  appends: UIComponentSchema[];
  prepends: UIComponentSchema[];
}

export interface RawStreamPayload {
  title: string;
  url?: string;
  magnet?: string;
  quality?: string;
  size?: string | number;
  seeds?: number;
  peers?: number;
  provider?: string;
  hash?: string;
  voice?: string;
  kind?: 'hls' | 'mp4' | 'torrent' | string;
  headers?: Record<string, string>;
}

export interface StreamSearchQuery {
  title: string;
  year?: number;
  imdbId?: string;
  tmdbId?: number;
  type: 'movie' | 'tv';
  season?: number;
  episode?: number;
}

export interface StreamProviderRegistration {
  id: string;
  name: string;
  icon?: string;
}
