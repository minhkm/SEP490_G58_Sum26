export const isWaterArea = async (lat, lng) => {
  try {
    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
    if (!res.ok) return true; // If API fails, default to true (allow) to avoid blocking users
    const data = await res.json();
    // If there is no country code, it's considered sea/ocean/water
    return !data.countryCode;
  } catch (error) {
    console.error("Error checking geo location:", error);
    return true; // Fallback to true if network error
  }
};
