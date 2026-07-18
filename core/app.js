/**
 * core/app.js — application bootstrap
 */
import { renderSidebar } from '../components/sidebar/sidebar.js';
import { renderNavbar } from '../components/navbar/navbar.js';
import { registerRoute, initRouter } from './router.js';

function registerRoutes() {
  registerRoute('/settings', {
    html: '/pages/settings/settings.html',
    css: '/pages/settings/settings.css',
    js: '/pages/settings/settings.js',
  });
  registerRoute('/accounts', {
    html: '/pages/properties/accounts/accounts.html',
    css: '/pages/properties/accounts/accounts.css',
    js: '/pages/properties/accounts/accounts.js',
  });
  registerRoute('/transactions', {
    html: '/pages/properties/transactions/transactions.html',
    css: '/pages/properties/transactions/transactions.css',
    js: '/pages/properties/transactions/transactions.js',
  });
  registerRoute('/transfer', {
    html: '/pages/properties/transfer/transfer.html',
    css: '/pages/properties/transfer/transfer.css',
    js: '/pages/properties/transfer/transfer.js',
  });
  registerRoute('/liabilities', {
    html: '/pages/properties/liabilities/liabilities.html',
    css: '/pages/properties/liabilities/liabilities.css',
    js: '/pages/properties/liabilities/liabilities.js',
  });
  registerRoute('/assets', {
    html: '/pages/properties/assets/assets.html',
    css: '/pages/properties/assets/assets.css',
    js: '/pages/properties/assets/assets.js',
  });
  registerRoute('/savings', {
    html: '/pages/properties/savings/savings.html',
    css: '/pages/properties/savings/savings.css',
    js: '/pages/properties/savings/savings.js',
  });
  registerRoute('/dashboard', {
    html: '/pages/properties/dashboard/dashboard.html',
    css: '/pages/properties/dashboard/dashboard.css',
    js: '/pages/properties/dashboard/dashboard.js',
  });
}

function bootstrap() {
  renderSidebar(document.getElementById('sidebar-root'));
  renderNavbar(document.getElementById('navbar-root'));
  registerRoutes();
  initRouter(document.getElementById('route-outlet'));
}

document.addEventListener('DOMContentLoaded', bootstrap);
