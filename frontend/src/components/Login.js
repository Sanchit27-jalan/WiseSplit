import React, { useEffect, useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const CLIENT_ID =
  "716338759481-3t52ihgb9pa4ifk96mjnlehh8c0idr07.apps.googleusercontent.com";

const Login = () => {
  const location = useLocation();
  const [emailfriend,setEmail]=useState('');
  const navigate = useNavigate();
  const { email: emailFromLogin } = location.state || {};
  console.log(emailFromLogin);

  const googleLogin = useGoogleLogin({
    onSuccess: async (res) => {
      const code = res.access_token;

      console.log(code, "Access token");
      try {
        console.log(emailFromLogin);
        await axios.post("http://localhost:3001/oauth2callback", {
          codes: code,
          email: emailFromLogin,
        });
        navigate("/contact", { state: { email: emailFromLogin } });
      } catch (error) {
        console.log(error);
      }
    },
    onFailure: (error) => {
      console.log("Error logging in with Google:", error);
    },
    flow: "implicit",
    scope: "https://www.googleapis.com/auth/contacts.readonly",
    clientId: CLIENT_ID,
    redirect_uri: "http://localhost:3000/login",
  });

  const handleClick = (location) => () => {
    console.log("i was clicked");
    console.log(emailFromLogin);
    console.log(location);
    navigate(location, { state: { email: emailFromLogin } });
  };
  const handleaddFriend =async  () => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(emailfriend)) {
      alert("Please enter a valid email address.");
      setEmail('');
      return;
    }
    try{

      await axios.post("http://localhost:3001/friends", {
        emailfriend: emailfriend,
        email: emailFromLogin,
      });
    }
    catch(error){
      console.log(error);
      alert("Please enter email address that exists in our database");
      setEmail('');
      return;
    }
    alert("Friend added");

    // Add friend logic here
    setEmail('');
  };

  return (
    <>
    <div className="list-group">
      <button
        onClick={handleClick('/contact')}
        className="list-group-item list-group-item-action"
      >
        Friends
      </button>
      <button data-bs-toggle="offcanvas" data-bs-target="#offcanvasExample" aria-controls="offcanvasExample"
        className="list-group-item list-group-item-action"
      >
        Add a Friend
      </button>
      <button 
      onClick={handleClick('/group')}
        className="list-group-item list-group-item-action"
        >
         Groups
          </button>

      <button
        className="list-group-item list-group-item-action"
        onClick={() => googleLogin()}
      >
        Sign in with Google to import your Contacts
      </button>

    </div>
    <div className="offcanvas offcanvas-start" tabIndex="-1" id="offcanvasExample" aria-labelledby="offcanvasExampleLabel">
    <div className="offcanvas-header">
      <h5 className="offcanvas-title" id="offcanvasExampleLabel">Add a Friend</h5>
      <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
    </div>
    <div className="offcanvas-body">
  <form>
  <div className="mb-3">
    <label htmlFor="exampleInputEmail1" className="form-label">Email address</label>
    <input type="email" className="form-control" id="exampleInputEmail1" aria-describedby="emailHelp" value={emailfriend} onChange={(e) => setEmail(e.target.value)}
    />
  </div>
</form>
  <button onClick={handleaddFriend} className="btn btn-primary">Add this id</button>

      </div>
  </div>
  </>
  );
};

export default Login;
