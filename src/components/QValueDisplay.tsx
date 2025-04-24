import React from 'react';
import { QTable } from '../utils/algorithms';
import './QValueDisplay.css';

interface QValueDisplayProps {
  selectedCell: [number, number] | null;
  qTable: QTable | null;
}

const actionLabels = ['Up', 'Right', 'Down', 'Left'];

const QValueDisplay: React.FC<QValueDisplayProps> = ({
  selectedCell,
  qTable
}) => {
  
  const renderQValues = () => {
    if (!selectedCell || !qTable) {
      return <div className="no-q-cell-selected">Click a valid cell to see its Q-values</div>;
    }

    const cellKey = `${selectedCell[0]},${selectedCell[1]}`;
    const cellQValues = qTable[cellKey];

    // just in case this somehow happens
    if (!cellQValues) {
      return <div>No Q-values found for cell [{selectedCell[0]}, {selectedCell[1]}].</div>;
    }
    
    return (
      <div className="q-value-grid">
        {actionLabels.map((label, actionIndex) => (
          <div 
            key={actionIndex} 
            className="q-value-item"
          >
            <span className="q-action-label">{label}:</span>
            <span className="q-value">{(cellQValues[actionIndex] ?? 0).toFixed(3)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="q-value-display">
      <h4>Q-Values for Selected Cell</h4>
      {selectedCell ? (
          <div className="selected-cell-info-q">
            Selected Cell: [{selectedCell[0]}, {selectedCell[1]}]
          </div>
        ) : null}
      {renderQValues()}
    </div>
  );
};

export default QValueDisplay; 