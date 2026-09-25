import { useEffect, useRef } from "react";

export default function GoogleAuthButton({
  onGoogleSuccess,
  onCredentialResponse,
  theme = "outline",
  size = "large",
  shape = "pill",
  width = 320,
}) {
  const containerRef = useRef(null);
  const callbackRef = useRef(onGoogleSuccess || onCredentialResponse);

  // Keep callback reference synchronized without re-running effects
  useEffect(() => {
    callbackRef.current = onGoogleSuccess || onCredentialResponse;
  }, [onGoogleSuccess, onCredentialResponse]);

  useEffect(() => {
    if (!window.google?.accounts?.id) return;

    // 1. Initialize only once across entire client session
    if (!window.__googleAuthInitialized) {
      window.google.accounts.id.initialize({
        client_id:
          import.meta.env.VITE_GOOGLE_CLIENT_ID ||
          "828465788567-kcic52aa0ejj06grgidt1om7nkven0jp.apps.googleusercontent.com",
        callback: (response) => {
          if (callbackRef.current) {
            callbackRef.current(response);
          }
        },
      });
      window.__googleAuthInitialized = true;
    }

    // 2. Render button into the current mounted container
    if (containerRef.current) {
      containerRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(containerRef.current, {
        theme,
        size,
        shape,
        width,
      });
    }
  }, [theme, size, shape, width]);

  return (
    <div
      ref={containerRef}
      style={{
        minHeight: "44px",
        display: "flex",
        justifyContent: "center",
        width: "100%",
      }}
    />
  );
}