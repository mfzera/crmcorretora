// Web-specific types
export interface NavItem {
  title: string;
  href: string;
  icon?: string;
  disabled?: boolean;
  external?: boolean;
  children?: NavItem[];
}

export interface BreadcrumbItem {
  title: string;
  href?: string;
}

// Re-export domain types
export * from './seguradora-parceira';
