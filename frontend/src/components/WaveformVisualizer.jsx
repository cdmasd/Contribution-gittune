import React, { useRef, useEffect } from 'react';

function WaveformVisualizer({ analyser }) {
  const canvasRef = useRef(null);
  const reqRef = useRef(null);

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      reqRef.current = requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = '#111827'; // match bg-gray-900
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#4ade80'; // tailwind green-400
      ctx.beginPath();

      const sliceWidth = canvas.width * 1.0 / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * canvas.height / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();

    return () => {
      if (reqRef.current) {
        cancelAnimationFrame(reqRef.current);
      }
    };
  }, [analyser]);

  return (
    <div className="w-full flex justify-center my-6">
      <div className="p-4 bg-gray-800 rounded-lg shadow-inner w-full max-w-2xl flex items-center justify-center">
        <canvas 
          ref={canvasRef} 
          width={600} 
          height={100} 
          className="w-full h-24 rounded"
        />
      </div>
    </div>
  );
}

export default WaveformVisualizer;
