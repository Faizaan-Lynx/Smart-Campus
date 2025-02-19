import React, { useEffect, useRef, useState } from "react";
import "./Signin.css";
import assets from "../../assets";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast, { Toaster } from "react-hot-toast";
import { loginSuccess } from "../../redux/actions/authActions";
import { localurl } from "../../utils";
import axios from "axios";

const SignIn = () => {
  // const signUpButtonRef = useRef(null);
  const signInButtonRef = useRef(null);
  const containerRef = useRef(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    // const signUpButton = signUpButtonRef.current;
    const signInButton = signInButtonRef.current;
    const container = containerRef.current;

    // const handleSignUpClick = () => {
    //   userRef.current.value = "";
    //   passRef.current.value = "";
    //   fullNameRef.current.value = "";
    //   passwordRef.current.value = "";
    //   emailRef.current.value = "";
    //   container.classList.add("right-panel-active");
    // };

    const handleSignInClick = () => {
      userRef.current.value = "";
      passRef.current.value = "";
      fullNameRef.current.value = "";
      passwordRef.current.value = "";
      emailRef.current.value = "";
      container.classList.remove("right-panel-active");
    };

    // signUpButton.addEventListener("click", handleSignUpClick);
    signInButton.addEventListener("click", handleSignInClick);

    // Cleanup event listeners on component unmount
    return () => {
      // signUpButton.removeEventListener("click", handleSignUpClick);
      signInButton.removeEventListener("click", handleSignInClick);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);

    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const dispatch = useDispatch();
  const userRef = useRef(null);
  const passRef = useRef(null);
  const navigate = useNavigate();

  const fullNameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  // const handleLogin = async (e) => {
  //   e.preventDefault();
  //   if (userRef.current.value == "" || passRef.current.value == "") {
  //     toast.error("Please fill out all fields!");
  //     return;
  //   }
  //   console.log(userRef.current.value, passRef.current.value);
  //   console.log("Login successful");
  //   ///dispatch(loginSuccess(true));

  //   //navigate(`/`);
  //   try {
  //     const response = await fetch(`${localurl}/login`, {
  //       method: "POST",
  //       headers: {
  //         Accept: "application/json",
  //         "Content-Type": "application/x-www-form-urlencoded",
  //       },
  //       body: `grant_type=&username=${userRef.current.value}&password=${passRef.current.value}&scope=&client_id=&client_secret=`,
  //     });

  //     if (!response.ok) {
  //       // Parse the error response
  //       const errorData = await response.json();
  //       throw new Error(JSON.stringify(errorData));
  //     }

  //     console.log("Login Api called");

  //     const userData = await response.json();
  //     // Dispatch loginSuccess action with user data
  //     //dispatch(loginSuccess(userData));
  //     //navigate("/profile");
  //   } catch (error) {
  //     try {
  //       const errorData = JSON.parse(error.message);
  //       if (errorData.detail == "Inactive user") {
  //         toast.dismiss();
  //         toast.error("Account Disabled or inactive. Contact admin");
  //       } else {
  //         toast.dismiss();
  //         toast.error("Invalid credentials");
  //       }
  //     } catch (parseError) {
  //       toast.dismiss();
  //       // If parsing fails, show a generic error message
  //       toast.error("An unexpected error occurred");
  //     }
  //   }
  // };
  // const handleKeyDown = (event) => {
  //   if (event.key === "Enter") {
  //     handleLogin();
  //   }
  // };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (userRef.current.value === "" || passRef.current.value === "") {
        toast.error("Please fill out all fields!");
        return;
    }

    const formData = {
        username: userRef.current.value,
        password: passRef.current.value,
    };

    try {
        const response = await axios.post(`${localurl}/auth/login`, formData, {
            headers: {
                "Content-Type": "application/json",
            },
        });

        const { access_token, token_type } = response.data;

        // Store token in localStorage
        localStorage.setItem("token", access_token);

        // Dispatch user authentication success
        dispatch(loginSuccess({ access_token, token_type }));

        toast.success("Login successful!");
        navigate("/");
    } catch (error) {
        if (error.response) {
            // Server responded with an error
            const errorData = error.response.data;
            if (errorData.detail === "Inactive user") {
                toast.dismiss();
                toast.error("Account Disabled or inactive. Contact admin.");
            } else {
                toast.dismiss();
                toast.error("Invalid credentials.");
            }
        } else {
            // Network error or other issues
            toast.dismiss();
            toast.error("An unexpected error occurred.");
        }
    }
};


  const handleSignup = async (e) => {
    e.preventDefault();
    const container = containerRef.current;
    const fullName = fullNameRef.current.value;
    const email = emailRef.current.value;
    const password = passwordRef.current.value;

    if (fullName == "" || email == "" || password == "") {
      toast.error("Please fill out all fields!");
      return;
    }
    // try {
    //   const response = await fetch(`${localurl}/register`, {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //     },
    //     body: JSON.stringify({
    //       email: email,
    //       full_name: fullName,
    //       password: password,
    //     }),
    //   });

    //   if (response.ok) {
    //     toast.success("Account created successfully! Redirecting to login");
    //     // Navigate to login page after successful signup
    //     setTimeout(() => {
    //       window.location.reload();
    //     }, 2000);
    //   } else {
    //     toast.dismiss();
    //     toast.error("Email already exists!");
    //     console.error("Signup failed");
    //   }
    // } catch (error) {
    //   console.error("Signup error:", error);
    // }
  };

  return (
    <div className="body_div">
      {/* <img src={assets.home} alt="background" className="background-img" /> */}
      <div ref={containerRef} className="container__signin" id="container">
        <div className="form-container sign-up-container">
          <form className="form__auth">
            <h1>Create Account</h1>
            {/* <div className="social-container">
              <a href="#" className="social">
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="#" className="social">
                <i className="fab fa-google-plus-g"></i>
              </a>
              <a href="#" className="social">
                <i className="fab fa-linkedin-in"></i>
              </a>
            </div> */}
            <span>or use your email for registration</span>
            <input ref={fullNameRef} type="text" placeholder="Name" />
            <input ref={emailRef} type="email" placeholder="Email" />
            <input ref={passwordRef} type="password" placeholder="Password" />
            <button onClick={(e) => handleSignup(e)} className="button_auth">
              Sign Up
            </button>
          </form>
        </div>
        <div className="form-container sign-in-container">
          <form className="form__auth">
            <h1>Sign in</h1>
            {/* <div className="social-container">
              <a href="#" className="social">
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="#" className="social">
                <i className="fab fa-google-plus-g"></i>
              </a>
              <a href="#" className="social">
                <i className="fab fa-linkedin-in"></i>
              </a>
            </div> */}
            <span>or use your account</span>
            <input ref={userRef} type="text" placeholder="Email" />
            <input ref={passRef} type="password" placeholder="Password" />
            <a href="#">Forgot your password?</a>
            <button onClick={(e) => handleLogin(e)} className="button_auth">
              Sign In
            </button>
          </form>
        </div>
        {/* {windowWidth > 650 && ( */}
        <div className="overlay-container">
          <div className="overlay">
            <div className="overlay-panel overlay-left">
              <h1>Have an Account?</h1>
              <p>Login to access your dashboard!</p>
              <button
                ref={signInButtonRef}
                className="ghost button_auth"
                id="signIn"
              >
                Sign In
              </button>
            </div>
            <div className="overlay-panel overlay-right">
              <h1>Lynx-Infosec</h1>
              {/* <p>Sign Up for Smarter Security Today!</p> */}
              {/* <button
                ref={signUpButtonRef}
                className="ghost button_auth"
                id="signUp"
              >
                Sign Up
              </button> */}
            </div>
          </div>
        </div>
        {/* )} */}
      </div>
      <Toaster />
    </div>
  );
};

export default SignIn;
