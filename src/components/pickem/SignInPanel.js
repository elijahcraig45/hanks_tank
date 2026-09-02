import { useEffect, useRef, useState } from 'react';
import { mountSignIn, signOut, getProfile, onAuthChange } from '../../services/googleAuth';

/**
 * Google sign-in, and the signed-in identity.
 *
 * Renders Google's own button rather than a custom one: it is the only way to get the
 * account chooser and One Tap, and a hand-rolled button that calls prompt() is treated
 * as a popup and blocked in several browsers.
 *
 * When the server reports no client ID, this says so plainly instead of rendering a
 * button that cannot work — the distinction between "sign-in is broken" and "sign-in is
 * not set up here" is one a reader can act on.
 */
export default function SignInPanel({ clientId, authConfigured }) {
  const buttonRef = useRef(null);
  const [profile, setProfile] = useState(getProfile());
  const [error, setError] = useState(null);

  useEffect(() => onAuthChange((session) => {
    setProfile(session?.profile ?? null);
  }), []);

  useEffect(() => {
    if (!authConfigured || !clientId || profile) return;
    let cancelled = false;
    mountSignIn(buttonRef.current, clientId, {
      onSignIn: (s) => { if (!cancelled) setProfile(s.profile); },
    }).catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [clientId, authConfigured, profile]);

  if (!authConfigured) {
    return (
      <div className="pk-auth pk-auth--unset">
        <strong>Sign-in is not set up on this server yet.</strong>
        <p>
          The contest needs a Google OAuth client ID. Until it has one you can browse
          the sheet and the leaderboard, but not save picks.
        </p>
      </div>
    );
  }

  if (profile) {
    return (
      <div className="pk-auth">
        {profile.picture && (
          <img className="pk-avatar" src={profile.picture} alt="" />
        )}
        <span className="pk-whoami">
          Signed in as <strong>{profile.name || profile.email}</strong>
        </span>
        <button className="pk-signout" onClick={signOut}>Sign out</button>
      </div>
    );
  }

  return (
    <div className="pk-auth">
      <span className="pk-whoami">Sign in with Google to make picks</span>
      <div ref={buttonRef} />
      {error && <span className="pk-auth-error">{error}</span>}
    </div>
  );
}
