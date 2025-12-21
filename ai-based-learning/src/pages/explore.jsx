import React from "react";
import "./pages-css/explore.css";

const Explore = ({ shrink }) => {
  return (
    <div
      className="explore-container"
      style={{
        paddingLeft: shrink ? "100px" : "260px",
        paddingRight: "30px",
        paddingTop: "70px",
        transition: "padding-left 0.3s ease",
      }}
    >
      {/* Header */}
      <header className="header">
        <span className="title">Explore</span>
        <input
          className="search-bar"
          placeholder="Search topics, lessons, or teachers..."
        />
        <div className="filters">
          <button className="filter-btn">Popular</button>
          <button className="filter-btn">Science</button>
          <button className="filter-btn">Programming</button>
          <button className="filter-btn">Math</button>
          <button className="filter-btn">Languages</button>
          <button className="filter-btn">All</button>
        </div>
      </header>

      {/* Main Content */}
      <div className="main-content">
        <main className="left-bar">
          <h2 className="section-title">Trending Topics</h2>
          <div className="topic-grid">
            <div className="topic-card">
              <span className="card-title">Machine Learning Basics</span>
              <span className="card-desc">
                Core concepts and hands-on teaching on machine learning
                algorithms and workflows.
              </span>
              <span className="card-meta">124 sessions in progress</span>
              <div className="card-avatars">
                <span className="avatar"></span>
                <span className="avatar"></span>
                <span className="avatar"></span>
              </div>
              <button className="teach-btn">Teach This</button>
            </div>

            <div className="topic-card">
              <span className="card-title">Photosynthesis Explained</span>
              <span className="card-desc">
                Reverse teach the cycle, key ingredients, and plant cell
                science.
              </span>
              <span className="card-meta">93 sessions in progress</span>
              <div className="card-avatars">
                <span className="avatar"></span>
                <span className="avatar"></span>
              </div>
              <button className="teach-btn">Teach This</button>
            </div>

            <div className="topic-card">
              <span className="card-title">Introduction to Python</span>
              <span className="card-desc">
                Teach loops, data types, and real-world Python use cases to the
                AI.
              </span>
              <span className="card-meta">201 sessions in progress</span>
              <div className="card-avatars">
                <span className="avatar"></span>
                <span className="avatar"></span>
                <span className="avatar"></span>
              </div>
              <button className="teach-btn">Teach This</button>
            </div>
          </div>

          <h2 className="section-title">Community Feed</h2>
          <div className="topic-grid">
            <div className="topic-card">
              <span className="card-title">Quantum Computing</span>
              <span className="card-desc">
                Live reverse teaching session by @Jane_Doe
              </span>
              <span className="card-meta">Join now - 14 watching</span>
              <div className="card-avatars">
                <span className="avatar"></span>
              </div>
              <button className="teach-btn">Join Session</button>
            </div>

            <div className="topic-card">
              <span className="card-title">Shakespeare's Sonnets</span>
              <span className="card-desc">
                Explore poetic structures and literary history in a collaborative
                lesson.
              </span>
              <span className="card-meta">9 active teachers</span>
              <div className="card-avatars">
                <span className="avatar"></span>
                <span className="avatar"></span>
              </div>
              <button className="teach-btn">Teach This</button>
            </div>
          </div>
        </main>

        {/* Sidebar */}
        <aside className="right-bar">
          <div className="spotlight">
            <div className="section-title">Community Spotlight</div>
            <div>
              <strong>Top Teacher:</strong> @DrMathAI
              <br />
              <span style={{ color: "#7f7f90" }}>
                “How Algebra Transforms Tech” — 340 upvotes
              </span>
            </div>
            <hr className="divider" />
            <div>
              <strong>Featured Lesson:</strong>
              <br />
              Photosynthesis 101 — <em>by @GreenVibes</em>
            </div>
          </div>

          <div className="suggestions">
            <div className="section-title">For You</div>
            <ul>
              <li>Continue “Intro to Python”</li>
              <li>Teach AI: Supply & Demand</li>
              <li>Community Q: Explain Black Holes</li>
            </ul>
          </div>

          <div className="challenge-mode">
            🎲 Challenge Mode: Teach a Surprise Topic!
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer className="footer">
        © 2025 AI Learning Platform &nbsp;|&nbsp;
        <a href="#" className="footer-link">Help</a> ·{" "}
        <a href="#" className="footer-link">FAQ</a> ·{" "}
        <a href="#" className="footer-link">Community Guidelines</a>
      </footer>
    </div>
  );
};

export default Explore;
