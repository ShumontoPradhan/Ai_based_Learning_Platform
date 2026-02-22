import React from "react";
import "./pages-css/home.css";
import { useAuth } from "../store/authContext";

export default function Home({ shrink }) {
  const {user} = useAuth();
  return (
    <div className="home-container"
        style={{
            paddingLeft: shrink ? "100px" : "260px",
            transition: "padding-left 0.3s ease",
            paddingRight: "30px",
            paddingTop: "70px"
        }}
    >

      {/* Page content */}
      <div className="page" role="main">
        {/* Left column */}
        <div className="left"
          style={{
            width: 100
          }}
        >
          {/* Hero */}
          <header className="header">
          <span className="title">Home</span>
          <input
            className="search-bar"
            placeholder="Search topics, lessons, or teachers..."
          />
          </header>
          <div className="hero">
            <div className="text">
              <h2>Hello {user?.username || "User"}!!</h2>
              <p className="muted">
                You have <strong style={{ color: "var(--accent)" }}>3 new tasks</strong>. It is a
                lot of work for today! So let's start!
              </p>
              <a href="#" aria-label="Review tasks">
                review it
              </a>
            </div>
            <div className="illustration">
              <img
                src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=800&auto=format&fit=crop"
                alt="illustration"
              />
            </div>
          </div>

          {/* Mid area: performance + visit donut */}
          <div className="mid"
            style={{
              maxWidth:"1100px"
            }}
          >
            {/* Performance card */}
            <div className="card">
              <div className="card-title">
                <h3>The best lessons</h3>
                <div className="select">December ▾</div>
              </div>

              <div className="perf-body">
                <div className="perf-left">
                  <div className="score">
                    <div className="big">95.4</div>
                    <div>
                      <div style={{ fontSize: "20px", color: "var(--muted)" }}>
                        Introduction to programming
                      </div>
                      
                    </div>
                  </div>

                  {/* --- NEW SECTION: Total Stats (Updated Spacing) --- */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      // Increased gap above and below
                      marginTop: "32px",    
                      marginBottom: "32px", 
                      paddingRight: "20px",
                    }}
                  >
                    {[
                      { label: "Documents", count: 142 },
                      { label: "Flashcards", count: 850 },
                      { label: "Quizzes", count: 24 },
                    ].map((item, idx) => (
                      <div key={idx} style={{ textAlign: "center" }}>
                        <div
                          style={{
                            fontSize: "18px",
                            fontWeight: "600",
                            color: "var(--accent, #333)",
                          }}
                        >
                          {item.count}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                          {item.label}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* -------------------------------------------------- */}

                  <div style={{ marginTop: "8px",marginBottom: "48px", justifyContent: "center" }}>
                        <button
                          style={{
                            border: "1px solid var(--line)",
                            background: "transparent",
                            padding: "6px 12px",
                            borderRadius: "16px",
                            fontSize: "13px",
                            cursor: "pointer",
                          }}
                        >
                          All lessons
                        </button>
                      </div>

                  <div className="bars-wrap" aria-hidden="true">
                    {[
                      { label: "Algorithms<br/>structures", height: "85%" },
                      { label: "Object<br/>program.", height: "65%" },
                      { label: "Database<br/>program.", height: "84%" },
                      { label: "Web<br/>develop.", height: "46%" },
                      { label: "Mobile<br/>applicat.", height: "43%" },
                      { label: "Machine<br/>learning", height: "74%" },
                    ].map((bar, i) => (
                      <div className="bar-col" key={i}>
                        <div className="bar-bg">
                          <div
                            className="bar-fill"
                            style={{ height: bar.height }}
                          ></div>
                        </div>
                        <div
                          className="bar-label"
                          dangerouslySetInnerHTML={{ __html: bar.label }}
                        ></div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Visit donuts (Unchanged) */}
                <aside className="visit-col">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <h3 style={{ margin: 0 }}>My visit</h3>
                    <div className="select">December ▾</div>
                  </div>

                  <div className="visit-grid" style={{ marginTop: "12px" }}>
                    {[
                      ["var(--accent)", "0.92turn", "Algorithms<br/>structures"],
                      ["#6b8bff", "0.83turn", "Object<br/>program."],
                      ["#7fb1ff", "0.78turn", "Database<br/>program."],
                      ["#5b6bff", "0.97turn", "Web<br/>develop."],
                      ["#6f86ff", "0.96turn", "Mobile<br/>application"],
                      ["#7a8bff", "0.89turn", "Machine<br/>learning"],
                    ].map(([color, percent, text], i) => (
                      <div className="donut" key={i}>
                        <div
                          className="circle"
                          style={{
                            background: `conic-gradient(${color} 0 ${percent}, #eef1f7 0 1turn)`,
                          }}
                        ></div>
                        <small dangerouslySetInnerHTML={{ __html: text }}></small>
                      </div>
                    ))}
                  </div>
                </aside>
              </div>
            </div>

            

        {/* Right column */}
        <div className="right">
          <div className="card calendar">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Calendar</h3>
              <div className="select">Today ▾</div>
            </div>

            <div className="timeline" style={{ marginTop: "12px" }}>
              <div className="big-event">
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", opacity: 0.9 }}>09:45 — 10:30</div>
                  <div style={{ fontWeight: 700, fontSize: "15px" }}>Electronics lesson</div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "rgba(255,255,255,0.85)",
                      marginTop: "6px",
                    }}
                  >
                    9.45 - 10.30, 21 lesson
                  </div>
                </div>
                <div
                  style={{
                    width: "46px",
                    height: "46px",
                    background: "rgba(255,255,255,0.12)",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <i
                    className="fa-solid fa-charging-station"
                    style={{ fontSize: "18px", color: "rgba(255,255,255,0.9)" }}
                  ></i>
                </div>
              </div>

              <ul style={{ margin: 0, padding: 0, marginTop: "14px" }}>
                {[
                  ["11:00", "Electronics lesson", "11.00 - 11.40, 23 lesson"],
                  ["12:00", "Robotics lesson", "12.00 - 12.45, 23 lesson"],
                  ["13:45", "C++ lesson", "13.45 - 14.30, 21 lesson"],
                ].map(([time, title, desc], i) => (
                  <li key={i}>
                    <div className="time">{time}</div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{title}</div>
                      <div className="muted" style={{ marginTop: "6px" }}>
                        {desc}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="card2 upcoming">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Upcoming events</h3>
              <a className="seeall" href="#">
                See all
              </a>
            </div>

            <div className="event" style={{ marginTop: "14px" }}>
              <img
                src="https://images.unsplash.com/photo-1581091215367-6f34b0d2eaa6?q=80&w=256&auto=format&fit=crop"
                alt=""
              />
              <div>
                <h4>The main event in your life "Robot Fest" will coming soon in...</h4>
                <p className="muted">14 December 2023 • 12.00 pm</p>
              </div>
            </div>

            <div className="event" style={{ marginTop: "12px" }}>
              <img
                src="https://images.unsplash.com/photo-1512496015851-a90fb38ba796?q=80&w=256&auto=format&fit=crop"
                alt=""
              />
              <div>
                <h4>Webinar of new tools in Minecraft</h4>
                <p className="muted">21 December 2023 • 11.00 pm</p>
              </div>
            </div>
            
          </div>
          <div className="card3 teacher">
                {/* Linked teachers */}
                <div className="card2">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ margin: 0 }}>Linked Teachers</h3>
                    <a className="seeall" href="#">
                      See all
                    </a>
                  </div>

                  <div className="teachers-list">
                    {[
                      {
                        name: "Mary Johnson (mentor)",
                        subject: "Science",
                        img: "https://images.unsplash.com/photo-1545996124-1b9d2d8c4f39?q=80&w=256&auto=format&fit=crop&crop=faces",
                      },
                      {
                        name: "James Brown",
                        subject: "Foreign language (Chinese)",
                        img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=256&auto=format&fit=crop&crop=faces",
                      },
                    ].map((t, i) => (
                      <div className="teacher-row" key={i}>
                        <img src={t.img} alt={t.name} />
                        <div className="meta">
                          <h4>{t.name}</h4>
                          <p>{t.subject}</p>
                        </div>
                        <div className="actions">
                          <i className="fa-solid fa-phone"></i>
                          <i className="fa-regular fa-envelope"></i>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
