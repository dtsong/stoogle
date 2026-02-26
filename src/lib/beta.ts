export const BETA_COOKIE_NAME = 'stoogle_beta_access'
export const BETA_ACCESS_CODE = process.env.BETA_ACCESS_CODE ?? ''
export const isBetaEnabled = Boolean(BETA_ACCESS_CODE)
