import React, { useState } from 'react';
import io from 'socket.io-client';
import './Submit.css';

const BACKEND_URL = process.env.NODE_ENV === 'production' 
  ? window.location.origin 
  : 'http://192.168.88.222:3001';

const socket = io(BACKEND_URL, {
  transports: ['websocket', 'polling'],
  cors: {
    origin: "*",
    credentials: false
  }
});

function Submit() {
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) {
      setError('Please enter some text');
      return;
    }

    socket.emit('submit-text', text.trim());
    setText('');
    setSubmitted(true);
    setError(null);
  };

  if (submitted) {
    return (
      <div className="submit-container">
        <h2>Thank you for your submission!</h2>
        <p>Your text has been added to the word cloud.</p>
        <button onClick={() => setSubmitted(false)} className="submit-button">
          Submit Another
        </button>
      </div>
    );
  }

  return (
    <div className="submit-container">
      <h2>Submit Your Text</h2>
      <form onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter your text here..."
          rows="4"
          className="submit-textarea"
        />
        {error && <div className="error-message">{error}</div>}
        <button type="submit" className="submit-button">
          Submit
        </button>
      </form>
    </div>
  );
}

export default Submit; 