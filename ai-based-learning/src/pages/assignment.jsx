import React, { useEffect } from "react";
import "./pages-css/assignment.css";


const assignments = [
  {
    id: 1,
    title: "Math Assignment 1",
    due: "Nov 18, 2025",
    submittedOn:"NULL",
    status: "pending",
  },
  {
    id: 2,
    title: "Science Project",
    due: "Nov 15, 2025",
    submittedOn:"NULL",
    status: "submitted",
  },
  {
    id: 3,
    title: "Essay on AI",
    due: "Nov 20, 2025",
    submittedOn:"NULL",
    status: "pending",
  },
  // Add more assignments here
];

const AssignmentSubmission = ({ shrink }) => {
  useEffect(() => {
    const progressCard = document.querySelector(".assignment-page .progress-card");
    if (progressCard) {
      progressCard.classList.add("active");
    }
  }, []);

  return (
    <div className="assignment-page"
        style={{

        }}
    >
      <div className="header">
        <div className="title">Assignment Submission</div>
        <div>
          <span
            className="material-icons"
            style={{ verticalAlign: "middle" }}
          >
            account_circle
          </span>{" "}
          User Name
        </div>
      </div>

      <div className="container">
        {/* Left Panel */}
        <div className="panel">
          <div className="instructions">
            <span className="material-icons">assignment</span>
            <strong>Instructions:</strong> Solve all the problems. You can upload
            a file or type your answer below.
          </div>

          <div className="due-date">
            <strong>Due:</strong> Nov 20, 2025
          </div>

          <div className="upload-section">
            <label>
              <span className="material-icons">cloud_upload</span> Upload your
              assignment:
            </label>

            <input type="file" />
            <span>or</span>

            <textarea rows="5" placeholder="Type your answer here..."></textarea>

            <button>
              <span
                className="material-icons"
                style={{ verticalAlign: "middle", fontSize: "1.12em" }}
              >
                send
              </span>
              Submit
            </button>
          </div>
        </div>

        {/* Right Panel */}
        <div className="panel">
          <div className="feedback">
            <div className="score">
              <span className="material-icons">auto_fix_high</span> AI Score:
              8/10
            </div>

            <div className="highlights">
              <strong>Strengths:</strong>
              <ul>
                <li>Clear explanation of concepts</li>
                <li>Accurate calculations</li>
              </ul>
            </div>

            <div className="improvements">
              <strong>Areas to Improve:</strong>
              <ul>
                <li>Add more examples in Question 2</li>
                <li>Review grammar in conclusion</li>
              </ul>

              <a href="#">
                <span
                  className="material-icons"
                  style={{ fontSize: "1em", verticalAlign: "middle" }}
                >
                  menu_book
                </span>{" "}
                Learn grammar basics
              </a>
            </div>
          </div>
        </div>

        {/* Progress Card */}
        <div className="progress-card panel">
          <strong>
            <span className="material-icons">trending_up</span> Progress
          </strong>

          <div className="bar">
            <div className="bar-inner"></div>
          </div>

          <span>You're getting better! Last score: 6/10</span>
        </div>
      </div>

    {/* Assignment list */}
    
        <div className="assignments-list"
            style={{
                paddingLeft: shrink ? "100px" : "260px",
                transition: "padding-left 0.3s ease",
                maxWidth: "1420px",
            }}
        >
            <div className="assignment-list-section panel" style={{ marginBottom: 28 }}>
            <div className="assignment-list-title">
                Your Assignments
            </div>
            {assignments.map(assignment => (
            <div key={assignment.id} className="assignment-card">
            <span>
                <span className="assignment-title">{assignment.title}</span>
                <span className="assignment-due">Due: {assignment.due}</span>
                <span className="submitted-on">Submitted On: {assignment.submittedOn}</span>
            </span>
            <span className={`assignment-status status-${assignment.status}`}>
                {assignment.status === "pending" ? "Pending" : "Submitted"}
            </span>
            </div>
        ))}
        </div>
        </div>
    </div>
  );
};

export default AssignmentSubmission;
