// src/pages/DevPanel.tsx
import React, { useState } from 'react';

const DevPanel: React.FC = () => {
  const [threshold, setThreshold] = useState(0.95);

  const handleThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    setThreshold(newValue);
    // Update the threshold in your config or context
    // You might want to use a context or store to manage this globally
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Developer Panel</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Face Recognition Settings</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Match Threshold: {threshold}
            </label>
            <input
              type="range"
              min="0.85"
              max="1.05"
              step="0.01"
              value={threshold}
              onChange={handleThresholdChange}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-500 mt-1">
              <span>0.85</span>
              <span>0.95</span>
              <span>1.05</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevPanel;
