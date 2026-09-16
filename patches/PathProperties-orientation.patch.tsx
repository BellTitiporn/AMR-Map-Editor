{/* Add this block in the Path Properties panel, ideally below TRAVEL DIRECTION */}
<section className="property-section">
  <div className="property-section-title">ROBOT ORIENTATION</div>

  <div className="orientation-grid">
    <button
      type="button"
      className={!path.orientation ? 'active' : ''}
      onClick={() => {
        p.commit();
        p.updatePath(path.id, { orientation: '' });
      }}
    >
      None
    </button>

    <button
      type="button"
      className={path.orientation === 'forward' ? 'active' : ''}
      onClick={() => {
        p.commit();
        p.updatePath(path.id, { orientation: 'forward' });
      }}
    >
      → Forward
    </button>

    <button
      type="button"
      className={path.orientation === 'backward' ? 'active' : ''}
      onClick={() => {
        p.commit();
        p.updatePath(path.id, { orientation: 'backward' });
      }}
    >
      ← Backward
    </button>
  </div>

  <div className="property-help">
    RMF lane orientation. Forward makes the robot face along A → B;
    Backward makes the robot face opposite the lane travel direction.
  </div>
</section>
