import { Component, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Header } from './components/header/header';
import { Footer } from './components/footer/footer';

declare var Tawk_API: any;

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, Header, Footer],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('my-app');

  constructor(private router: Router) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.toggleChatbox();
      }
    });
  }

  toggleChatbox() {
    if (typeof Tawk_API !== 'undefined') {
      if (Tawk_API.hideWidget && Tawk_API.showWidget) {
        if (this.router.url.startsWith('/admin')) {
          Tawk_API.hideWidget();
        } else {
          Tawk_API.showWidget();
        }
      } else {
        Tawk_API.onLoad = () => {
          if (this.router.url.startsWith('/admin')) {
            Tawk_API.hideWidget();
          } else {
            Tawk_API.showWidget();
          }
        };
      }
    }
  }

  isAdminRoute(): boolean {
    return this.router.url.startsWith('/admin');
  }
}