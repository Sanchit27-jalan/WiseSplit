import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Contacts from './components/Contacts';
import Login from './components/Login';
import Log from './components/Log';
import Navbar from './components/Navbar';
import Groups from './components/Groups.js'
import Group from './components/individual.js'
const CLIENT_ID = '716338759481-3t52ihgb9pa4ifk96mjnlehh8c0idr07.apps.googleusercontent.com';

function App() {

  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>

    <Router>
    <Navbar/>

    <Routes>
        <Route exact path="/signup" element={<Log title="Signup with your email" log=""/>} />
        <Route exact path="/log" element={<Log title="Login with your email" log="login"/>} />
        <Route exact path="/contact" element={<Contacts />} />
        <Route exact path="/login" element={<Login/>} />
        <Route exact path ="/group" element={<Groups/>}/>
        <Route exact path="/groups/:id" element={<Group />} /> 
    </Routes>
    </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
