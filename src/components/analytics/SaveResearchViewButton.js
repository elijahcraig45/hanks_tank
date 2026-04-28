import React, { useEffect, useState } from 'react';
import { Button } from 'react-bootstrap';
import { saveResearchView } from '../../utils/researchWorkspace';

function SaveResearchViewButton({ label, hint, category = 'analytics', size = 'sm', variant = 'outline-secondary' }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setSaved(false), 1600);
    return () => window.clearTimeout(timeoutId);
  }, [saved]);

  const handleSave = () => {
    if (typeof window === 'undefined') {
      return;
    }

    saveResearchView({
      label,
      hint,
      category,
      path: `${window.location.pathname}${window.location.search}`,
    });
    setSaved(true);
  };

  return (
    <Button variant={variant} size={size} onClick={handleSave}>
      {saved ? 'Saved view' : 'Save view'}
    </Button>
  );
}

export default SaveResearchViewButton;
