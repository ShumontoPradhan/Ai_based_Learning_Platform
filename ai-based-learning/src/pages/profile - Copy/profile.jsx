import { useEffect, useState } from "react";
import api from "../utils/api";

function Profile({ userId }) {
  const [username, setUsername] = useState("");

  useEffect(() => {
    api.get(`/user/${userId}`)
      .then(res => {
        setUsername(res.data.username);
      })
      .catch(err => console.error(err));
  }, [userId]);

  return (
    <h2>Welcome, {username}</h2>
  );
}

export default Profile;
