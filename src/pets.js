const manifests = import.meta.glob("../codex/*/pet.json", { eager: true });

const petIdPattern = /\/codex\/([^/]+)\//;
const baseUrl = import.meta.env.BASE_URL;

export const pets = Object.entries(manifests)
  .map(([manifestPath, manifestModule]) => {
    const id = manifestPath.match(petIdPattern)?.[1];
    const manifest = manifestModule.default ?? manifestModule;

    return {
      ...manifest,
      id,
      spritesheetUrl: `${baseUrl}codex/${id}/${manifest.spritesheetPath}`,
    };
  })
  .filter((pet) => pet.id && pet.spritesheetUrl)
  .sort((a, b) => a.displayName.localeCompare(b.displayName));
