// Hook to auto-save project state to Redis and load on login
import { useCallback } from 'react';

export function useProjectPersistence() {
  // Save project state to Redis. App.jsx handles debouncing so callers can await
  // this function and show accurate save status.
  const saveState = useCallback(async (projectCode, state, memberCode) => {
    if (!projectCode) return;
    const res = await fetch('/api/state', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: projectCode, state, memberCode }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save project state');
    }
    return res.json();
  }, []);

  // Load project state by code
  const loadState = useCallback(async (projectCode) => {
    const res = await fetch(`/api/state?code=${projectCode.toUpperCase()}`, {
      credentials: 'same-origin',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to load project');
    }
    const data = await res.json();
    return data.state;
  }, []);

  // Authenticate a team member
  const authenticate = useCallback(async (projectCode, memberCode) => {
    const res = await fetch('/api/auth', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectCode, memberCode }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Authentication failed');
    return data; // { member, state }
  }, []);

  return { saveState, loadState, authenticate };
}
