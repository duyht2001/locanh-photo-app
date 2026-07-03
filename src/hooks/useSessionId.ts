import { useState, useEffect } from "react";

export function useSessionId() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    // 1. First, check if session ID is provided in the URL query string (e.g. ?session=usr_xyz)
    const params = new URLSearchParams(window.location.search);
    const urlSessionId = params.get("session");
    
    if (urlSessionId) {
      setSessionId(urlSessionId);
      return;
    }

    // 2. Fallback to localStorage
    let id = localStorage.getItem("locanh_session_id");
    
    if (!id) {
      // Generate a simple unique ID
      const randomPart = Math.random().toString(36).substring(2, 11);
      const timestampPart = Date.now().toString(36);
      id = `usr_${randomPart}_${timestampPart}`;
      localStorage.setItem("locanh_session_id", id);
    }
    
    setSessionId(id);
  }, []);

  return sessionId;
}
