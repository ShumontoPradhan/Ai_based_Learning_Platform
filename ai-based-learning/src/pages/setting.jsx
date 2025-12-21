import React, { useState } from "react";
import "./pages-css/settings.css"; // link to plain CSS file

const SettingsProfile = ({ shrink }) => {
  const [profile, setProfile] = useState({
    username: "olivia",
    website: "www.untitledui.com",
    bio: "I'm a Product Designer based in Melbourne, Australia. I specialise in UX/UI design, brand strategy, and Webflow development.",
    jobTitle: "Product Designer",
    email: "example@example.com",
    showJobTitle: true,
    photo: "https://i.pravatar.cc/100?img=5",
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfile({
      ...profile,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Profile Updated ✅");
    console.log(profile);
  };

  return (
    <div className="settings-container"
    style={{
        paddingLeft: shrink ? "100px" : "260px",
        transition: "padding-left 0.3s ease",
    }}>
      <div className="settings-box">
        <h1>Settings</h1>

        {/* Tabs */}
        <div className="tabs">
          {[
            "My details",
            "Profile",
            "Password",
            "Team",
            "Plan",
            "Billing",
            "Email",
            "Notifications",
            "Integrations",
            "API",
          ].map((tab) => (
            <button
              key={tab}
              className={`tab-button ${tab === "Profile" ? "active" : ""}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Username */}
          <div className="form-group">
            <label>Username</label>
            <div className="input-group">
              <span className="prefix">untitledui.com/</span>
              <input
                type="text"
                name="username"
                value={profile.username}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Website */}
          <div className="form-group">
            <label>Website</label>
            <input
              type="text"
              name="website"
              value={profile.website}
              onChange={handleChange}
            />
          </div>

          {/* Profile Photo */}
          <div className="form-group">
            <label>Your photo</label>
            <div className="photo-section">
              <img src={profile.photo} alt="avatar" />
              <div className="photo-buttons">
                <button
                  type="button"
                  className="link"
                  onClick={() => alert("Change photo clicked")}
                >
                  Update
                </button>
                <button
                  type="button"
                  className="link delete"
                  onClick={() => setProfile({ ...profile, photo: "" })}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="form-group">
            <label>Your bio</label>
            <textarea
              name="bio"
              value={profile.bio}
              onChange={handleChange}
              rows="4"
            />
          </div>

          {/* Job Title */}
          <div className="form-group">
            <label>Job title</label>
            <input
              type="text"
              name="jobTitle"
              value={profile.jobTitle}
              onChange={handleChange}
            />
            <div className="checkbox">
              <input
                type="checkbox"
                name="showJobTitle"
                checked={profile.showJobTitle}
                onChange={handleChange}
              />
              <label>Show my job title in my profile</label>
            </div>
          </div>

          {/* Email */}
          <div className="form-group">
            <label>Alternative contact email</label>
            <input
              type="email"
              name="email"
              value={profile.email}
              onChange={handleChange}
            />
          </div>

          {/* Save Button */}
          <div className="form-actions">
            <button type="submit" className="save-btn">
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsProfile;
