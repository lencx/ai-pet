export type PetManifest = {
  displayName: string;
  name?: string;
  description?: string;
  spritesheetPath: string;
};

export type Pet = PetManifest & {
  id: string;
  spritesheetUrl: string;
};

const manifests = import.meta.glob<{ default: PetManifest }>("../codex/*/pet.json", { eager: true });

const petIdPattern = /\/codex\/([^/]+)\//;
const baseUrl = import.meta.env.BASE_URL;

export const pets = Object.entries(manifests)
  .map(([manifestPath, manifestModule]) => {
    const id = manifestPath.match(petIdPattern)?.[1];
    const manifest = manifestModule.default;

    if (!id || !manifest.spritesheetPath) {
      return null;
    }

    return {
      ...manifest,
      id,
      spritesheetUrl: `${baseUrl}codex/${id}/${manifest.spritesheetPath}`,
    };
  })
  .filter((pet): pet is Pet => Boolean(pet))
  .sort((a, b) => a.displayName.localeCompare(b.displayName));
