import React from 'react';

const DashboardSkeleton = () => {
  return (
    <div className="dashboard-new">
      <div className="dashboard-skeleton-grid">
        <div className="dashboard-skeleton-card" />
        <div className="dashboard-skeleton-card" />
        <div className="dashboard-skeleton-card" />
        <div className="dashboard-skeleton-card" />
      </div>
      <div className="dashboard-skeleton-chart" />
      <div className="dashboard-skeleton-grid">
        <div className="dashboard-skeleton-panel" />
        <div className="dashboard-skeleton-panel" />
      </div>
    </div>
  );
};

export default DashboardSkeleton;
