// hooks/useStreamingOffers.js
import { useState, useRef, useCallback } from 'react';

export function useStreamingOffers() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, label: '' });
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef(null);
  const streamActiveRef = useRef(false);

  const fetchStream = useCallback(async (queries, gender, age, shoeSize, clothingSize) => {
    if (!queries?.length) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      streamActiveRef.current = false;
    }

    abortControllerRef.current = new AbortController();
    streamActiveRef.current = true;
    setLoading(true);
    setError(null);
    setItems([]);
    setProgress({ current: 0, total: queries.length, label: '' });
    setIsStreaming(true);

    const url = new URL('/api/offers-stream', window.location.origin);
    url.searchParams.append('queries', JSON.stringify(queries));
    if (gender) url.searchParams.append('gender', gender);
    if (age) url.searchParams.append('age', age);
    if (shoeSize) url.searchParams.append('shoeSize', shoeSize);
    if (clothingSize) url.searchParams.append('clothingSize', clothingSize);

    try {
      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (streamActiveRef.current) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              
              if (data.type === 'meta') {
                setProgress(prev => ({ ...prev, total: data.total }));
              }
              else if (data.type === 'progress') {
                setProgress({ current: data.current, total: data.total, label: data.label });
              }
              else if (data.type === 'results') {
                setItems(prev => [...prev, ...data.items]);
              }
              else if (data.type === 'done') {
                streamActiveRef.current = false;
                setIsStreaming(false);
                setProgress(prev => ({ ...prev, current: prev.total }));
              }
              else if (data.error) {
                console.warn('Stream error:', data.error);
                setError(data.error);
              }
            } catch (parseErr) {
              console.warn('Failed to parse line:', line.slice(0, 100), parseErr);
            }
          }
        }
      }

    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Stream aborted');
      } else {
        console.error('Stream fetch error:', err);
        setError(err.message);
      }
    } finally {
      setLoading(false);
      setIsStreaming(false);
      streamActiveRef.current = false;
    }
  }, []);

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      streamActiveRef.current = false;
      setLoading(false);
      setIsStreaming(false);
    }
  }, []);

  const clearItems = useCallback(() => {
    setItems([]);
  }, []);

  return {
    items,
    loading,
    error,
    progress,
    isStreaming,
    fetchStream,
    cancelStream,
    clearItems,
  };
}