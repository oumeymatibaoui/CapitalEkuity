import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';

import { NAV_ITEMS, NavItem, UserRole } from '../../core/services/nav.config';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class Sidebar implements OnInit, OnDestroy {

  navItems: NavItem[] = NAV_ITEMS;
  openedGroups = new Set<string>();

  private routerSub?: Subscription;
  private readonly storageKey = 'sidebarOpenedGroups';

  constructor(
    private authService: AuthService,
    private router: Router,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadOpenedGroups();

    setTimeout(() => {
      const firstGroup = this.getGroups()[0];

      if (this.openedGroups.size === 0 && firstGroup) {
        this.openedGroups.add(firstGroup);
        this.saveOpenedGroups();
      }

      this.openActiveGroup();
    }, 0);

    this.routerSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        setTimeout(() => {
          this.openActiveGroup();
        }, 0);
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  get userRole(): UserRole | null {
    return this.authService.getUserRole() as UserRole | null;
  }

  get userName(): string {
    return this.authService.getUserName();
  }

  get sidebarSubtitle(): string {
    if (this.userRole === 'CND') {
      return 'Espace intervenant';
    }

    return 'Administration';
  }

  getVisibleItems(): NavItem[] {
    if (!this.userRole) {
      return [];
    }

    const currentUrl = this.getCleanUrl();

    return this.navItems.filter(item => {
      const hasRole = item.roles.includes(this.userRole as UserRole);

      if (!hasRole) {
        return false;
      }

      if (currentUrl.startsWith('/cnd')) {
        return item.route.startsWith('/cnd');
      }

      if (currentUrl.startsWith('/el-emar')) {
        return item.route.startsWith('/el-emar');
      }

      return true;
    });
  }

  getGroups(): string[] {
    return [
      ...new Set(
        this.getVisibleItems().map(item => item.group)
      )
    ];
  }

  getItemsByGroup(group: string): NavItem[] {
    return this.getVisibleItems()
      .filter(item => item.group === group);
  }

  toggleGroup(group: string): void {
    if (this.openedGroups.has(group)) {
      this.openedGroups.delete(group);
    } else {
      this.openedGroups.add(group);
    }

    this.saveOpenedGroups();
  }

  isGroupOpen(group: string): boolean {
    return this.openedGroups.has(group);
  }

  isGroupActive(group: string): boolean {
    const currentUrl = this.getCleanUrl();

    return this.getItemsByGroup(group)
      .some(item => currentUrl === item.route || currentUrl.startsWith(item.route + '/'));
  }

  isActive(route: string): boolean {
    const currentUrl = this.getCleanUrl();

    return currentUrl === route || currentUrl.startsWith(route + '/');
  }

  getGroupCount(group: string): number {
    return this.getItemsByGroup(group).length;
  }

  goTo(route: string): void {
    if (!route) {
      return;
    }

    this.ngZone.run(() => {
      const currentUrl = this.getCleanUrl();

      if (currentUrl === route) {
        this.router.navigateByUrl(route);
        return;
      }

      this.router.navigateByUrl(route).then(() => {
        setTimeout(() => {
          this.openActiveGroup();
        }, 0);
      });
    });
  }

  private openActiveGroup(): void {
    const activeGroup = this.getGroups().find(group =>
      this.getItemsByGroup(group)
        .some(item => this.isActive(item.route))
    );

    if (activeGroup) {
      this.openedGroups.add(activeGroup);
      this.saveOpenedGroups();
    }
  }

  private saveOpenedGroups(): void {
    localStorage.setItem(
      this.storageKey,
      JSON.stringify([...this.openedGroups])
    );
  }

  private loadOpenedGroups(): void {
    const data = localStorage.getItem(this.storageKey);

    if (!data) {
      return;
    }

    try {
      const groups = JSON.parse(data);

      if (Array.isArray(groups)) {
        this.openedGroups = new Set(groups);
      }
    } catch {
      this.openedGroups = new Set<string>();
    }
  }

  private getCleanUrl(): string {
    return this.router.url.split('?')[0].split('#')[0];
  }

  getConnectedUserEmail(): string {
    const user = this.getConnectedUserFromStorage();

    return user?.email ||
      localStorage.getItem('userEmail') ||
      'Utilisateur';
  }

  getConnectedUserRole(): string {
    const user = this.getConnectedUserFromStorage();

    return user?.typeUtilisateur ||
      user?.role ||
      localStorage.getItem('userRole') ||
      '-';
  }

  getConnectedUserInitial(): string {
    const email = this.getConnectedUserEmail();

    return email.trim().charAt(0).toUpperCase();
  }

  private getConnectedUserFromStorage(): any | null {
    const keys = [
      'connectedUser',
      'currentUser',
      'user',
      'authUser',
      'candidatUser',
      'elEmarUser',
      'elEmarConnectedUser'
    ];

    for (const key of keys) {
      const value = localStorage.getItem(key);

      if (!value) {
        continue;
      }

      try {
        return JSON.parse(value);
      } catch {
        continue;
      }
    }

    return null;
  }

  logout(): void {
    this.authService.logout();

    this.ngZone.run(() => {
      this.router.navigate(['/home']);
    });
  }

  getCompteRoute(): string {
    if (this.userRole === 'CND') {
      return '/cnd/compte';
    }

    return '/el-emar/compte';
  }
}