/** Must match backend PRIMARY_ADMIN_EMAIL default / .env */
export const PRIMARY_ADMIN_EMAIL =
  (import.meta.env.VITE_PRIMARY_ADMIN_EMAIL as string | undefined)?.trim().toLowerCase() ||
  "sagormimmarriage@gmail.com";
