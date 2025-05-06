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
        <h2>Thank you for your submission!<br />謝謝參與！</h2>
        <p>Your answer has been added to the cloud.<br />你的生字已成功加到雲圖。</p>
        <button onClick={() => setSubmitted(false)} className="submit-button">
          Submit Another / 繼續提交
        </button>
      </div>
    );
  }

  return (
    <div className="submit-container">
      <h2>Submit Your answer<br />輸入你的答案</h2>
      <p className="instruction-text">Enter vocabulary. If more than one vocabulary, enter a space to seperate.<br />如輸入多於一個答案，請以空白鍵作分隔。</p>
      <form onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter your answer here... / 在此輸入答案⋯⋯"
          rows="4"
          className="submit-textarea"
        />
        {error && <div className="error-message">{error}</div>}
        <button type="submit" className="submit-button">
          Submit / 提交
        </button>
      </form>
    </div>
  );
}

export default Submit; 