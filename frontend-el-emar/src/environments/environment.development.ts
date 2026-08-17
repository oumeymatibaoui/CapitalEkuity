export const environment = {
  production: false,

  /*
   * En développement local:
   * Angular fonctionne généralement sur le port 4200.
   * Spring Boot fonctionne sur le port 8089.
   */
  apiBaseUrl: 'http://localhost:8089'
} as const;