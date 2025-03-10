import React, { useState, useRef } from 'react';
import { Stage, Layer, Line } from 'react-konva';

const App = () => {
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#000000');
  const [lines, setLines] = useState([]);
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [iPadMode, setIPadMode] = useState(true);
  const stageRef = useRef(null);
  const isDrawing = useRef(false);
  const lastCenter = useRef(null);
  const lastDist = useRef(null);

  // Grid background with scaling dots
  const gridStyle = {
    backgroundSize: `${20 * scale}px ${20 * scale}px`,
    backgroundImage: 'radial-gradient(circle, #ccc 1px, rgba(0, 0, 0, 0) 2px)',
  };

  const getScaledPointerPosition = () => {
    const stage = stageRef.current;
    const pointerPosition = stage.getPointerPosition();
    return {
      x: (pointerPosition.x - stage.x()) / stage.scaleX(),
      y: (pointerPosition.y - stage.y()) / stage.scaleY(),
    };
  };

  const handleMouseDown = () => {
    isDrawing.current = true;
    const pos = getScaledPointerPosition();
    setLines([...lines, { tool, color, points: [pos.x, pos.y] }]);
  };

  const handleMouseMove = () => {
    if (!isDrawing.current) return;
    const point = getScaledPointerPosition();
    setLines(prevLines => {
      const lastLine = { ...prevLines[prevLines.length - 1] };
      if (tool === 'eraser') {
        return prevLines.filter(line => 
          !line.points.some((p, i) => 
            i % 2 === 0 && 
            Math.hypot(p - point.x, line.points[i + 1] - point.y) < 10 / scale
          )
        );
      } else {
        lastLine.points = lastLine.points.concat([point.x, point.y]);
        return [...prevLines.slice(0, -1), lastLine];
      }
    });
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
  };

  const handleWheel = (e) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const stage = stageRef.current;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    stage.scale({ x: newScale, y: newScale });
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    stage.position(newPos);
    setScale(newScale);
    setStagePos(newPos);
  };

  const getCenter = (p1, p2) => {
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    };
  };

  const getDistance = (p1, p2) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  const handleTouchStart = (e) => {
    if (iPadMode || e.evt.touches.length === 1) {
      handleMouseDown();
    }
    const touch1 = e.evt.touches[0];
    const touch2 = e.evt.touches[1];
    if (touch1 && touch2) {
      lastCenter.current = getCenter(touch1, touch2);
      lastDist.current = getDistance(touch1, touch2);
    }
  };

  const handleTouchMove = (e) => {
    e.evt.preventDefault();
    if (iPadMode || e.evt.touches.length === 1) {
      handleMouseMove();
    } else if (e.evt.touches.length === 2) {
      const touch1 = e.evt.touches[0];
      const touch2 = e.evt.touches[1];
      const center = getCenter(touch1, touch2);
      const dist = getDistance(touch1, touch2);
      if (!lastCenter.current) {
        lastCenter.current = center;
      }
      if (!lastDist.current) {
        lastDist.current = dist;
      }
      const pointTo = {
        x: (center.x - stageRef.current.x()) / scale,
        y: (center.y - stageRef.current.y()) / scale,
      };
      const newScale = scale * (dist / lastDist.current);
      const newPos = {
        x: center.x - pointTo.x * newScale,
        y: center.y - pointTo.y * newScale,
      };
      setScale(newScale);
      setStagePos(newPos);
      stageRef.current.scale({ x: newScale, y: newScale });
      stageRef.current.position(newPos);
      lastDist.current = dist;
      lastCenter.current = center;
    }
  };

  const handleTouchEnd = () => {
    handleMouseUp();
    lastCenter.current = null;
    lastDist.current = null;
  };

  return (
    <div className="app">
      <div className="floating-tools">
        <button className={`tool-btn ${tool === 'pen' ? 'active' : ''}`} onClick={() => setTool('pen')}>
          ✏️
        </button>
        <button className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`} onClick={() => setTool('eraser')}>
          🧹
        </button>
        <label className="tool-btn color-picker">
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          <div className="color-preview" style={{ background: color }} />
        </label>
        <button className="tool-btn" onClick={() => setLines([])}>
          🗑️
        </button>
        <button
          className="tool-btn"
          onClick={() => {
            const uri = stageRef.current.toDataURL();
            const link = document.createElement('a');
            link.download = 'whiteboard.png';
            link.href = uri;
            link.click();
          }}
        >
          💾
        </button>
        {/* <button className="tool-btn" onClick={() => setIPadMode(!iPadMode)}>
          {iPadMode ? "📱" : "💻"}
        </button> */}
      </div>

      <div className="canvas-container" style={gridStyle}>
        <Stage
          width={window.innerWidth}
          height={window.innerHeight}
          onMouseDown={handleMouseDown}
          onMousemove={handleMouseMove}
          onMouseup={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          ref={stageRef}
          scale={{ x: scale, y: scale }}
          x={stagePos.x}
          y={stagePos.y}
        >
          <Layer>
            {lines.map((line, i) => (
              <Line
                key={i}
                points={line.points}
                stroke={line.color}
                strokeWidth={5 / scale}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation={
                  line.tool === 'eraser' ? 'destination-out' : 'source-over'
                }
              />
            ))}
          </Layer>
        </Stage>
      </div>

      <style jsx>{
       ` .app {
          position: relative;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
        }
        .floating-tools {
          position: fixed;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          flex-direction: column;
          gap: 12px;
          z-index: 100;
        }
        .tool-btn {
          width: 45px;
          height: 45px;
          border-radius: 50%;
          border: none;
          background: white;
          box-shadow: 0px 2px 8px rgba(0,0,0,0.15);
          cursor: pointer;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .tool-btn.active {
          background-color: #007aff;
          color: white;
        }
        .color-picker {
          position: relative;
          overflow: hidden;
        }
        .color-picker input {
          position: absolute;
          opacity: 0;
          cursor: pointer;
        }
        .color-preview {
          width: 100%;
          height: 100%;
          border-radius: 50%;
        }
        .canvas-container {
          width: 100%;
          height: 100%;
          background-color: #f0f0f0;
        }`
      }</style>
    </div>
  );
};

export default App;