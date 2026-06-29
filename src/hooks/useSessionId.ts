import { useState, useEffect } from "react";

export function useSessionId() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Attempt to retrieve existing session ID from localStorage
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
