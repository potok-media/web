import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { LoadingSpinner } from '../components/LoadingSpinner';

/** Client-side SDK links must leave the app router to load the static wiki. */
export const WikiDocumentRedirect = () => {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    const path = pathname.endsWith('/') ? pathname : `${pathname}/`;
    window.location.replace(`${path}${search}${hash}`);
  }, [pathname, search, hash]);

  return <LoadingSpinner />;
};
