// Navigation system exports
export { NavigationProvider, useNavigation } from './providers/NavigationProvider';
export type { 
  NavigationItem, 
  BreadcrumbItem, 
  NavigationState 
} from './providers/NavigationProvider';

export { useBreadcrumbs } from './hooks/useBreadcrumbs';

export { 
  UniversalNavigation, 
  withUniversalNavigation 
} from './UniversalNavigation';

export { 
  NavSidebar 
} from './components/NavSidebar';

export { 
  NavBreadcrumbs, 
  CompactBreadcrumbs, 
  MobileBreadcrumbs 
} from './components/NavBreadcrumbs';

export { 
  BreadcrumbsBar, 
  CompactBreadcrumbsBar, 
  MinimalBreadcrumbsBar,
  MobileBreadcrumbsBar 
} from './components/BreadcrumbsBar';

export { 
  NavHeader, 
  CompactNavHeader 
} from './components/NavHeader';

export { 
  NavSearch, 
  CompactNavSearch, 
  MobileSearchButton 
} from './components/NavSearch';