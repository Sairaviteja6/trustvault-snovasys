import { Component, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'TrustVault';

  mouseX = signal(-200);
  mouseY = signal(-200);
  isHoveringClickable = signal(false);

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    this.mouseX.set(e.clientX);
    this.mouseY.set(e.clientY);

    const target = e.target as HTMLElement | null;
    const isClickable = !!target?.closest('button, a, input, select, textarea, [role="button"], .btn, .tab-btn');
    this.isHoveringClickable.set(isClickable);
  }
}

