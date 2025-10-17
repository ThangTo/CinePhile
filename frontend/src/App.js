import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Gọi API từ backend
    fetch('http://localhost:5000/api/message')
      .then(response => response.json())
      .then(data => setMessage(data.message))
      .catch(error => console.error('Error fetching data:', error));
  }, []); // [] đảm bảo useEffect chỉ chạy một lần sau khi component được mount

  return (
    <div className="App">
      <header className="App-header">
        <h1>Fullstack App</h1>
        <p>{message ? message : 'Loading message from backend...'}</p>
      </header>
    </div>
  );
}

export default App;