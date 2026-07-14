import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

import { Sidebar } from '../sidebar/sidebar';

@Component({
  selector: 'app-el-emar-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    Sidebar
  ],
  templateUrl: './el-emar-layout.html',
  styleUrl: './el-emar-layout.scss'
})
export class ElEmarLayout {}