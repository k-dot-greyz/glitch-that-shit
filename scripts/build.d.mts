export const ENTRIES: Record<string, string>;

export interface GeckoSettings {
  id: string;
  strict_min_version: string;
  data_collection_permissions: { required: string[] };
}

export interface DerivedManifest {
  version_name?: string;
  background: { service_worker?: string; scripts?: string[] };
  browser_specific_settings?: {
    gecko: GeckoSettings;
    gecko_android: { strict_min_version: string };
  };
  [key: string]: unknown;
}

export function manifestFor(target: string, base: object): DerivedManifest;
export function bundleScripts(outDir: string): Promise<void>;
export function resolveBuildTargets(target: string | null): string[];
export function assertPackageManifestVersions(
  pkg: { version: string },
  base: { version_name?: string },
): void;
