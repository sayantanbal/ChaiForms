import type { ClientContextSchema } from "@repo/schemas";

/** Optional browser geolocation (requires respondent consent). */
export async function getClientGeoContext(): Promise<ClientContextSchema | undefined> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return undefined;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          geo: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyMeters: position.coords.accuracy,
          },
        });
      },
      () => resolve(undefined),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  });
}
