import React from "react";
import "./pages-css/skill_gap.css"; // make sure this path is correct

const Skill = ({ shrink }) => {
  return (
    <div
      className="skill-gap-page"
      style={{
        paddingLeft: shrink ? "100px" : "260px",
        transition: "padding-left 0.3s ease",
        paddingTop: "70px",
        backgroundColor: "#f4f6fc", // consistent background
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <header className="header">
        <div className="title">Skill Gap Analyzer</div>
        <div className="subtitle">
          Discover your strengths and weaknesses across key concepts. Get instant, tailored learning actions to close your skill gaps!
        </div>
      </header>

      {/* Main container */}
      <div className="main-container">
        {/* Assessment Section */}
        <section className="assessment-area">
          <div className="assessment-header">Start Assessment</div>

          <div className="assessment-controls">
            <select className="skill-select">
              <option>Choose Skill Domain…</option>
              <option>Python Programming</option>
              <option>Biology</option>
              <option>Calculus</option>
              <option>Communication</option>
            </select>

            <select className="assessment-type">
              <option>Quick Evaluation (5 Qs)</option>
              <option>Deep Analysis (15+ Qs + Explanation)</option>
            </select>

            <button className="assessment-btn">Start Assessment</button>
          </div>

          <div className="progress-bar-bg">
            <div className="progress-bar"></div>
          </div>

          <div className="question-panel">
            <strong>Q3: What is a Python list comprehension and when would you use it?</strong>
          </div>

          <div className="answer-area">
            <input type="text" placeholder="Type your answer or explain to the AI..." />
            <button>Submit</button>
            <button className="skip-btn">Skip</button>
          </div>

          <div className="ai-feedback">
            Nice try! Can you elaborate on how a list comprehension differs from a traditional for loop in Python?
          </div>
        </section>

        {/* Sidebar */}
        <aside className="sidebar">
          <div className="results-card">
            <div className="results-title">Your Progress</div>

            <div className="skills-matrix">
              <span>Lists</span>
              <div className="matrix-bar"><div className="matrix-fill high"></div></div>
              <span>80%</span>
            </div>

            <div className="skills-matrix">
              <span>Dictionaries</span>
              <div className="matrix-bar"><div className="matrix-fill med"></div></div>
              <span>52%</span>
            </div>

            <div className="skills-matrix">
              <span>Comprehensions</span>
              <div className="matrix-bar"><div className="matrix-fill low"></div></div>
              <span>22%</span>
            </div>

            <div className="radar-chart">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/3/39/Radar_chart.svg"
                width="160"
                alt="Radar chart example"
                style={{ padding: "14px" }}
              />
            </div>

            <button className="report-cta">Download Full Report</button>
            <button className="report-cta" style={{ background: "#3949ab" }}>
              Share Progress
            </button>
          </div>

          <div className="results-card">
            <div className="results-title" style={{ color: "#43b581" }}>
              Top Gaps & Next Steps
            </div>
            <ul>
              <li>
                Practice dictionary operations{" "}
                <button className="report-cta" style={{ background: "#f1c232", color: "#222" }}>
                  Practice Now
                </button>
              </li>
              <li>
                Reverse teach comprehensions{" "}
                <button className="report-cta" style={{ background: "#3949ab" }}>
                  Start Teaching
                </button>
              </li>
            </ul>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer className="footer">
        © 2025 AI Learning Platform &nbsp;|&nbsp;
        <a href="#" style={{ color: "#3949ab", textDecoration: "none" }}>
          Help
        </a>{" "}
        ·{" "}
        <a href="#" style={{ color: "#3949ab", textDecoration: "none" }}>
          FAQ
        </a>
      </footer>
    </div>
  );
};

export default Skill;
