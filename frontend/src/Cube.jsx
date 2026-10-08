// A pure-CSS 3D cube. Used for the header logo and floating background shapes.
export default function Cube({ size = 44, glyphs = [], className = "", style = {} }) {
  const g = (i) => glyphs[i] || "";
  return (
    <div className={`cube-scene ${className}`} style={{ "--s": `${size}px`, ...style }}>
      <div className="cube">
        <span className="face f-front">{g(0)}</span>
        <span className="face f-right">{g(1)}</span>
        <span className="face f-back">{g(2)}</span>
        <span className="face f-left">{g(3)}</span>
        <span className="face f-top" />
        <span className="face f-bottom" />
      </div>
    </div>
  );
}
