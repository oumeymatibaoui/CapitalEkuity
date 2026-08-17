import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

import { Sidebar } from '../sidebar/sidebar';
import { Topbar } from '../topbar/topbar';

@Component({
  selector: 'app-el-emar-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    Sidebar,
    Topbar
  ],
  templateUrl: './el-emar-layout.html',
  styleUrl: './el-emar-layout.scss'
})
export class ElEmarLayout {

  sidebarCollapsed = false;

  onSidebarCollapsedChange(
    collapsed: boolean
  ): void {
    this.sidebarCollapsed = collapsed;
  }
}