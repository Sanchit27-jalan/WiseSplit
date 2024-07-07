import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Groups() {
  const location = useLocation();
  const emailFromLogin = location.state?.email;
  console.log(emailFromLogin);
  const navigate=useNavigate();
  const [groups, setGroups] = useState([]);
  const spacing = 18;
  const handleClick = (location) => () => {
    console.log("i was clicked");
    console.log(emailFromLogin);
    console.log(location);
    navigate(location, { state: { email: emailFromLogin } });
  };
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await axios.get("http://localhost:3001/groups", {
          params: {
            email: emailFromLogin,
          },
        });

        // Set the fetched groups to the state
        setGroups(response.data);
      } catch (error) {
        console.error("Error fetching groups:", error);
      }
    };

    fetchGroups();
  }, [emailFromLogin]);

  return (
    <div className="container">
      <div className="row">
        {groups.map((group, index) => (
          <div
            key={group.groupid}
            className="col-md-4" // Ensures max 3 cards per row in a Bootstrap grid system
            style={{ marginBottom: '1em' }}
          >
            <div className="card" style={{ width: spacing + "em" }}>
              <div className="card-body">
                <h5 className="card-title">{group.groupName}</h5>
                <button className="btn btn-primary" onClick={handleClick("/groups/" + group.groupid)}>
                  Go to group
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
