import React from "react";
import "./pages-css/achievements.css"; // optional if you move the CSS out

const AchievementPage = ({ shrink }) => {
  const achievements = [
    {
      title: "Top Performer",
      subtitle: "Completed 10+ lessons this week",
      img: "https://img.icons8.com/color/96/medal.png",
      flame: 120,
      points: 500,
      unlocked: true,
    },
    {
      title: "Consistency Master",
      subtitle: "Logged in for 7 days straight",
      img: "https://img.icons8.com/color/96/fire-element.png",
      flame: 90,
      points: 300,
      unlocked: true,
    },
    {
      title: "Quiz Champ",
      subtitle: "Scored 90%+ in 5 quizzes",
      img: "https://img.icons8.com/color/96/trophy.png",
      flame: 75,
      points: 250,
      unlocked: false,
    },
  ];

  const badges = [
    { icon: "🏅", label: "Gold Learner" },
    { icon: "🔥", label: "Streak Keeper" },
    { icon: "💡", label: "Creative Thinker" },
    { icon: "🎯", label: "Goal Crusher" },
  ];

  const challenges = [
    { label: "Complete 3 new modules", points: 200 },
    { label: "Maintain 5-day streak", points: 150 },
    { label: "Score 80%+ in quiz", points: 100 },
  ];

  const leaderboard = [
    { rank: 1, name: "Aarav Singh", points: 2000 },
    { rank: 2, name: "Neha Sharma", points: 1850 },
    { rank: 3, name: "Ravi Patel", points: 1700 },
    { rank: 4, name: "You", points: 1650 },
  ];

  return (
    <div className="container"
    style={{
      display:"flex",
      transition: "padding-left 0.3s ease",
      paddingLeft: shrink ? "100px" : "260px",
      paddingTop: "120px"
    }}>
      <h1>Achievements & Progress</h1>

      <div className="stats">
        <div className="card">
          <p>Completed</p>
          <h3>56%</h3>
        </div>
        <div className="card">
          <p>Lessons</p>
          <h3>21 / 23</h3>
        </div>
        <div className="card">
          <p>Hours</p>
          <h3>120 / 111</h3>
        </div>
      </div>

      <div className="grid">
        <div>
          <div className="achievements">
            {achievements.map((a, i) => (
              <div className="achievement-card" key={i}>
                <img src={a.img} alt={a.title} />
                <h4>{a.title}</h4>
                <p>{a.subtitle}</p>
                <div className="achievement-stats">
                  <span>🔥 {a.flame}</span>
                  <span style={{ color: "#2563eb", fontWeight: 600 }}>
                    +{a.points}
                  </span>
                  <span
                    style={{
                      color: a.unlocked ? "#f97316" : "#9ca3af",
                      fontWeight: 600,
                    }}
                  >
                    {a.unlocked ? "Unlocked" : "Locked"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="badges">
            <h3>Badges</h3>
            <div className="badge-list">
              {badges.map((b, i) => (
                <div className="badge" key={i}>
                  {b.icon} {b.label}
                </div>
              ))}
            </div>
          </div>

          <div className="challenges">
            <h3>Challenges</h3>
            <div className="challenge-list">
              {challenges.map((c, i) => (
                <div className="challenge" key={i}>
                  <span>{c.label}</span>
                  <span>+{c.points}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="leaderboard">
          <h3>🏆 Leaderboard</h3>
          <div>
            {leaderboard.map((u, i) => (
              <div className="leader-item" key={i}>
                <div className="rank">#{u.rank}</div>
                <div className="leader-name">{u.name}</div>
                <div className="points">{u.points}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AchievementPage;
