import { Component, ElementRef, ViewChild, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { NavbarComponent } from './shared/components/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'TrustVault';
  private router = inject(Router);

  @ViewChild('bgVideo') videoRef!: ElementRef<HTMLVideoElement>;

  // Dedicated video per role/screen
  currentVideo = signal<string>('/videos/background1.mp4');

  ngOnInit(): void {
    // Initial check on load
    this.assignVideoForRoute(this.router.url);

    // Automatically switch background video whenever route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.assignVideoForRoute(event.urlAfterRedirects || event.url);
    });
  }

  private assignVideoForRoute(url: string): void {
    let target = '/videos/background1.mp4';

    if (url.includes('/admin')) {
      target = '/videos/background3.mp4';
    } else if (url.includes('/owner')) {
      target = '/videos/background2.mp4';
    } else if (url.includes('/viewer')) {
      target = '/videos/background4.mp4';
    } else {
      // Landing page & Login: background1
      target = '/videos/background1.mp4';
    }

    if (this.currentVideo() !== target) {
      this.currentVideo.set(target);
      setTimeout(() => {
        const video = this.videoRef?.nativeElement;
        if (video) {
          video.load();
          video.play().catch(() => {});
        }
      });
    }
  }
}

