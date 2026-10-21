import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { AdminDashboardComponent } from './features/admin/admin-dashboard/admin-dashboard.component';
import { OwnerDashboardComponent } from './features/owner/owner-dashboard/owner-dashboard.component';
import { ViewerDashboardComponent } from './features/viewer/viewer-dashboard/viewer-dashboard.component';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { 
    path: 'admin', 
    component: AdminDashboardComponent, 
    canActivate: [roleGuard], 
    data: { expectedRoles: ['Admin'] } 
  },
  { 
    path: 'owner', 
    component: OwnerDashboardComponent, 
    canActivate: [roleGuard], 
    data: { expectedRoles: ['Owner'] } 
  },
  { 
    path: 'viewer', 
    component: ViewerDashboardComponent, 
    canActivate: [roleGuard], 
    data: { expectedRoles: ['Viewer'] } 
  },
  { path: '**', redirectTo: 'login' }
];
