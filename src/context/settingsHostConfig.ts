import { getEnv } from "../utils/EnvService";

export const getHostConfig = () => {
  const envBff = getEnv("VITE_DEFAULT_BFF_URL");
  const isLocked = getEnv("VITE_BLOCK_SETTINGS_INPUT") === "true";

  return {
    bff: envBff,
    search: "",
    locked: isLocked,
    profileName: "Main profile",
  };
};

export const hostConfig = getHostConfig();