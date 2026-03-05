export default function HeroSection() {
  return (
    <section className="hero">
      <div className="hero__bg" />
      <div className="hero__grain" />
      <div className="hero__content">
        <p className="hero__eyebrow">✦ The world is cheaper than you think</p>
        <h1 className="hero__headline">
          Stop picking<br />a destination.<br />
          <em>Pick a budget.</em>
        </h1>
        <p className="hero__subheadline">
          Thrift Trip pairs the cheapest international flights with the best-value hotels 
          — then shows you exactly where your money can take you.
        </p>
        <div className="hero__stats">
          <div className="hero__stat">
            <span className="hero__stat-number">9,000+</span>
            <span className="hero__stat-label">Airports worldwide</span>
          </div>
          <div className="hero__stat">
            <span className="hero__stat-number">30+</span>
            <span className="hero__stat-label">Destinations scanned</span>
          </div>
          <div className="hero__stat">
            <span className="hero__stat-number">Free</span>
            <span className="hero__stat-label">Always & forever</span>
          </div>
        </div>
      </div>
    </section>
  );
}
