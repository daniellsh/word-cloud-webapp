import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import * as d3 from 'd3';
import cloud from 'd3-cloud';
import io from 'socket.io-client';
import './App.css';

// Configure socket with explicit options
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

function App() {
  const [showWordCloud, setShowWordCloud] = useState(false);
  const [words, setWords] = useState([]);
  const [error, setError] = useState(null);
  const svgRef = useRef(null);
  const submissionUrl = `${window.location.origin}/submit`;

  const colors = d3.scaleOrdinal(d3.schemeCategory10);

  const drawWordCloud = (words) => {
    console.log('Drawing word cloud with words:', words);
    
    if (!svgRef.current) {
      console.error('SVG reference is not available');
      return;
    }
    
    if (!Array.isArray(words) || words.length === 0) {
      console.error('No valid words data provided');
      return;
    }

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    const width = 400;
    const height = 400;

    const layout = cloud()
      .size([width, height])
      .words(words.map(d => {
        if (!d || typeof d.text === 'undefined' || typeof d.value === 'undefined') {
          console.error('Invalid word data:', d);
          return null;
        }
        return {
          text: String(d.text),
          size: Math.max(10, 10 + (d.value * 10)),
          value: d.value
        };
      }).filter(Boolean))
      .padding(5)
      .rotate(0)
      .font("-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif")
      .fontSize(d => d.size)
      .on("end", draw);

    function draw(words) {
      if (!Array.isArray(words) || words.length === 0) {
        console.error('No words to draw after layout');
        return;
      }

      console.log('Drawing words after layout:', words);

      const svg = d3.select(svgRef.current);
      
      if (svg.empty()) {
        console.error('SVG element not found');
        return;
      }

      svg.attr("width", width)
         .attr("height", height)
         .append("g")
         .attr("transform", `translate(${width/2},${height/2})`)
         .selectAll("text")
         .data(words)
         .enter()
         .append("text")
         .style("font-size", d => `${d.size}px`)
         .style("font-family", "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif")
         .style("fill", (d, i) => colors(i))
         .attr("text-anchor", "middle")
         .attr("transform", d => {
           if (!d || typeof d.x === 'undefined' || typeof d.y === 'undefined') {
             console.error('Invalid position data:', d);
             return "translate(0,0)";
           }
           return `translate(${d.x || 0},${d.y || 0})`;
         })
         .text(d => String(d.text))
         .append("title")
         .text(d => `${d.text} (${d.value} times)`);
    }

    try {
      layout.start();
    } catch (error) {
      console.error('Error during layout calculation:', error);
      setError('Error generating word cloud. Please try again.');
    }
  };

  useEffect(() => {
    const handleSubmissionsUpdate = (submissions) => {
      try {
        console.log('Received submissions:', submissions);

        if (!Array.isArray(submissions)) {
          console.error('Invalid submissions format:', submissions);
          throw new Error('Invalid submissions data');
        }

        const wordCount = {};
        submissions.forEach((text, index) => {
          if (typeof text !== 'string') {
            console.warn(`Skipping invalid submission at index ${index}:`, text);
            return;
          }

          const words = text.trim().split(/[\s.,!?，。！？、]/g);
          words.forEach(word => {
            const cleanWord = word.trim();
            if (cleanWord && cleanWord.length > 0) {
              wordCount[cleanWord] = (wordCount[cleanWord] || 0) + 1;
            }
          });
        });

        console.log('Processed word count:', wordCount);

        const wordcloudData = Object.entries(wordCount)
          .map(([text, value]) => ({ text, value }))
          .filter(item => item.text && item.text.length > 0)
          .sort((a, b) => b.value - a.value)
          .slice(0, 100); // Limit to top 100 words for better performance

        console.log('Generated wordcloud data:', wordcloudData);

        if (wordcloudData.length === 0) {
          setWords([{ text: 'No words yet', value: 1 }]);
        } else {
          setWords(wordcloudData);
        }
        setError(null);
      } catch (error) {
        console.error('Error processing submissions:', error);
        setError('Error processing words. Please try again.');
        setWords([{ text: 'Error', value: 1 }]);
      }
    };

    socket.on('submissions-updated', handleSubmissionsUpdate);
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setError('Connection error. Please try reconnecting.');
    });

    return () => {
      socket.off('submissions-updated', handleSubmissionsUpdate);
      socket.off('connect_error');
    };
  }, []);

  useEffect(() => {
    if (showWordCloud) {
      drawWordCloud(words);
    }
  }, [words, showWordCloud]);

  const handleGenerateClick = () => {
    if (!showWordCloud) {
      socket.emit('get-submissions');
    } else {
      socket.emit('clear-submissions');
      setWords([{ text: 'No words yet', value: 1 }]);
    }
    setShowWordCloud(!showWordCloud);
    setError(null);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Interactive Word Cloud</h1>
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        <div className="content-container">
          {!showWordCloud ? (
            <div className="qr-container">
              <QRCodeSVG value={submissionUrl} size={256} />
              <p>Scan to submit your text!</p>
            </div>
          ) : (
            <div className="wordcloud-container">
              <svg ref={svgRef} />
            </div>
          )}
        </div>
        <button onClick={handleGenerateClick} className="action-button">
          {!showWordCloud ? 'Generate Word Cloud' : 'New Word Cloud'}
        </button>
      </header>
    </div>
  );
}

export default App;
