import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection
} from '@angular/core';

import {
  provideRouter,
  withRouterConfig
} from '@angular/router';

import {
  provideHttpClient,
  withInterceptors
} from '@angular/common/http';

import { routes } from './app.routes';
import { forceRefreshInterceptor } from './core/interceptors/force-refresh.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),

    provideZoneChangeDetection({
      eventCoalescing: true,
      runCoalescing: true
    }),

    provideRouter(
      routes,
      withRouterConfig({
        onSameUrlNavigation: 'reload'
      })
    ),

    provideHttpClient(
      withInterceptors([forceRefreshInterceptor])
    )
  ]
};