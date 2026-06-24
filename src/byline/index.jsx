import React from 'react';
import ForgeReconciler from '@forge/react';
import ReviewCard from '../components/ReviewCard';

// The byline popup (opened by clicking the byline chip) renders the same card.
ForgeReconciler.render(
  <React.StrictMode>
    <ReviewCard />
  </React.StrictMode>
);
