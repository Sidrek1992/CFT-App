import React, { useState, useEffect } from 'react';
import App from './App';
import { LoginScreen } from './components/LoginScreen';
import { getGmailAuthStatus, startGmailAuth } from './services/gmailService';
import * as userService from './services/userService';

export default function AppRoot() {
  const [authState, setAuthState] = useState<{
    loading: boolean;
    authenticated: boolean;
    loggingIn: boolean;
  }>({
    loading: true,
    authenticated: false,
    loggingIn: false,
  });

  const [migrationDone, setMigrationDone] = useState(false);

  const checkAuth = async () => {
    try {
      const status = await getGmailAuthStatus();
      setAuthState({
        loading: false,
        authenticated: status.authenticated,
        loggingIn: false,
      });

      if (status.authenticated && !migrationDone) {
        await migrateLocalStorageToBackend();
        setMigrationDone(true);
      }
    } catch (error) {
      console.error('Auth check failed', error);
      setAuthState({
        loading: false,
        authenticated: false,
        loggingIn: false,
      });
    }
  };

  const migrateLocalStorageToBackend = async () => {
    try {
      const backendDbs = await userService.fetchDatabases();
      
      if (backendDbs.length > 0) {
        console.log('User already has data in backend, skipping migration');
        return;
      }

      const localDbs = localStorage.getItem('app_databases');
      if (localDbs) {
        const parsedDbs = JSON.parse(localDbs);
        for (const db of parsedDbs) {
          await userService.createDatabase(db.id, db.name);
          for (const official of db.officials) {
            await userService.createOfficial(db.id, official);
          }
        }
        console.log('Migrated databases from localStorage');
      }

      const localTemplates = localStorage.getItem('saved_templates');
      if (localTemplates) {
        const parsedTemplates = JSON.parse(localTemplates);
        for (const template of parsedTemplates) {
          await userService.createTemplate(template);
        }
        console.log('Migrated templates from localStorage');
      }

      const localCurrentTemplate = localStorage.getItem('current_template');
      if (localCurrentTemplate) {
        const parsedTemplate = JSON.parse(localCurrentTemplate);
        await userService.saveCurrentTemplate(parsedTemplate.subject, parsedTemplate.body);
        console.log('Migrated current template from localStorage');
      }
    } catch (error) {
      console.error('Migration failed', error);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmailParam = params.get('gmail');

    if (gmailParam === 'connected' || gmailParam === 'error') {
      checkAuth();
    }
  }, []);

  const handleLogin = () => {
    setAuthState((prev) => ({ ...prev, loggingIn: true }));
    startGmailAuth();
  };

  if (authState.loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!authState.authenticated) {
    return <LoginScreen onLogin={handleLogin} loading={authState.loggingIn} />;
  }

  return <App />;
}
