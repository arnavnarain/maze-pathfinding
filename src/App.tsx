import React, { useState } from 'react';
import './App.css';
import Maze from './components/Maze';

function App() {
  const [rows, setRows] = useState(15);
  const [cols, setCols] = useState(15);

  // row dimension change
  const handleRowsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value);
    if (!isNaN(value) && value > 4 && value <= 30) {
      setRows(value);
    }
  };

  // column dimension change 
  const handleColsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value);
    if (!isNaN(value) && value > 4 && value <= 30) {
      setCols(value);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Maze Search Visualization</h1>
      </header>
      <main>
        <div className="controls">
          <div className="control-group">
            <label htmlFor="rows">Rows:</label>
            <input 
              type="number" 
              id="rows" 
              value={rows} 
              onChange={handleRowsChange} 
              min="5" 
              max="30"
            />
          </div>
          <div className="control-group">
            <label htmlFor="cols">Columns:</label>
            <input 
              type="number" 
              id="cols" 
              value={cols} 
              onChange={handleColsChange} 
              min="5" 
              max="30"
            />
          </div>
        </div>
        <Maze rows={rows} cols={cols} />
      </main>
    </div>
  );
}

export default App;
