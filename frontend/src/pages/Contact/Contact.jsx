import React, { useRef } from "react";
import "./Contact.css";
import assets from "../../assets";
import emailjs from "emailjs-com";

import toast, { Toaster } from "react-hot-toast";

const Contact = () => {
  const nameRef = useRef("");
  const emailRef = useRef("");
  const textRef = useRef("");

  emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY);

  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  const sendMail = (e) => {
    e.preventDefault();
    if (nameRef.current.value === "") {
      toast.dismiss();
      toast.error("Please Enter your name!");
    } else if (emailRef.current.value === "") {
      toast.dismiss();
      toast.error("Please Enter your email!");
    } else if (textRef.current.value === "") {
      toast.dismiss();
      toast.error("Please Enter details!");
    } else if (!isValidEmail(emailRef.current.value)) {
      toast.dismiss();
      toast.error("Please enter a valid email!");
    } else {
      emailjs
        .send(
          import.meta.env.VITE_EMAILJS_SERVICE_ID,
          import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
          {
            to_name: nameRef.current.value,
            from_email: emailRef.current.value,
            message: textRef.current.value,
          }
        )
        .then(
          (response) => {
            console.log("✅ Email sent successfully:", response);
            toast.success("Email sent! We will contact you soon.");
            nameRef.current.value = "";
            emailRef.current.value = "";
            textRef.current.value = "";
          },
          (error) => {
            console.error("❌ Failed to send email:", error);
            toast.error("Failed to send email! Check console.");
          }
        );
    }
  };

  return (
    <div className="contact__main__div">
      <div className="contact__container">
        <img src="img/shape.png" className="square" alt="" />
        <div className="form">
          <div className="contact-info">
            <h3 className="title">Let's get in touch</h3>
            <p className="contact__text">
              Get in touch with us to start your secure tracking journey.
            </p>
            <div className="info">
              <div className="information">
                <img src={assets.logo} className="icon" alt="" />
                <p>MCS</p>
              </div>
              <div className="information">
                <img src={assets.logo} className="icon" alt="" />
                <p>abdulrehman.prodev@gmail.com</p>
              </div>
              <div className="information">
                <img src={assets.logo} className="icon" alt="" />
                <p>12345678</p>
              </div>
            </div>
          </div>

          <div className="contact-form">
            <span className="circle one"></span>
            <span className="circle two"></span>

            <form action="index.html" autoComplete="off">
              <h3 className="title">Contact us</h3>
              <div className="input-container">
                <input
                  placeholder="Name"
                  ref={nameRef}
                  type="text"
                  name="name"
                  className="input"
                />
                <span>Username</span>
              </div>
              <div className="input-container">
                <input
                  ref={emailRef}
                  placeholder="Email"
                  type="email"
                  name="email"
                  className="input"
                />
                <span>Email</span>
              </div>
              <div className="input-container textarea">
                <textarea
                  ref={textRef}
                  placeholder="Message"
                  name="message"
                  className="input"
                ></textarea>
                <span>Message</span>
              </div>
              {/* <input value="Send" onClick={(e) => sendMail(e)} className="btn" /> */}
              <button className="btn" onClick={(e) => sendMail(e)}>Send</button>
            </form> 
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
};

export default Contact;
