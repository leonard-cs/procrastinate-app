import React, { useState } from 'react'
import { auth, googleProvider } from "../../firebaseConfig";
import { createUserWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth";
import Button from './Button'

const Auth = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const signIn = async () => {
    console.log("Sign In button pressed")
    try {
      await createUserWithEmailAndPassword(auth, email, password)
    } catch (err) {
      console.error(err)
    }
  }
  const googleSignIn = async () => {
    console.log("Google Sign In button pressed")
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      console.error(err)
    }
  }
  const logout = async () => {
    console.log("Logout button pressed")
    try {
      await signOut(auth)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div>
      <h3>Auth component</h3>
      <text>User: {auth.currentUser?.email}</text>
      <input 
        placeholder="Email..."
        onChange={(e) => setEmail(e.target.value)}
      />
      <input 
        placeholder="Password..."
        type='password'
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button onClick={signIn}>Sign In</Button>
      <Button onClick={googleSignIn}>Google Sign In</Button>
      <Button onClick={logout}>Logout</Button>
    </div>
  )
}

export default Auth