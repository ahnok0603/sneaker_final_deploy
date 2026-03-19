import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Homepage } from './pages/homepage/homepage';
import { Shop } from './pages/shop/shop';
import { About } from './pages/about/about';
import { CartPage } from './pages/cart/cart';
import { Contact } from './pages/contact/contact';
import { ProductDetail } from './pages/product-detail/product-detail';
import { CheckOut } from './pages/check-out/check-out';
import { Account } from './pages/account/account';
import { ResetPassword } from './pages/reset-password/reset-password';
import { Admin } from './pages/admin/admin';
import { adminGuard } from './myservices/admin.guard';

export const routes: Routes = [
  { path: '',               redirectTo: 'login',    pathMatch: 'full' },
  { path: 'login',          component: Login },
  { path: 'reset-password', component: ResetPassword },
  { path: 'homepage',       component: Homepage },
  { path: 'shop',           component: Shop,        runGuardsAndResolvers: 'always' },
  { path: 'about',          component: About },
  { path: 'cart',           component: CartPage },
  { path: 'contact',        component: Contact },
  { path: 'product/:id',    component: ProductDetail },
  { path: 'checkout',       component: CheckOut },
  { path: 'account',        component: Account },
  { path: 'admin',          component: Admin,       canActivate: [adminGuard] },
  { path: '**',             redirectTo: 'homepage' },
];