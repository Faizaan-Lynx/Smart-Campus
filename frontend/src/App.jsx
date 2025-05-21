import { useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Outlet,
  Navigate,
} from "react-router-dom";
import SignIn from "./pages/SignIn/SignIn";
import LandingPage from "./components/LandingPage/LandingPage";
import Navbar from "./components/Navbar/Navbar";
import Dashboard from "./components/Dashboard/Dashboard";
import Sidebar from "./components/Sidebar/Sidebar";
import Settings from "./pages/Settings/Settings";
import Contact from "./pages/Contact/Contact";
// import Home from "./pages/Home/Home";
import Profile from "./pages/Profile/Profile";
import NotFound from "./pages/NotFound/NotFound"; // Import your 404 page component
import { useDispatch, useSelector } from "react-redux";
import { jwtDecode } from "jwt-decode";
import Hosts from "./pages/Hosts/Hosts";
import Guests from "./pages/Guests/Guests";
import CCTVPage from "./components/CCTV/CCTVPage";
import { logout } from "./redux/actions/authActions";
import Gate from "./pages/Gates/Gate";

function App() {
  const user = useSelector((state) => state.auth.isAuthenticated);
  // const user = true;
  // const user = false;
  const dispatch = useDispatch();
  // const [userInfo, setUserInfo] = useState(null);
  useEffect(() => {
    // Assuming token is stored in localStorage or received from an API
    // const token = localStorage.getItem("token");
    // if (token) {
    //   try {
    //     const decoded = jwtDecode(token);
    //     setUserInfo(decoded);
    //   } catch (error) {
    //     console.error("Error decoding token:", error);
    //   }
    // }
    // dispatch(logout());
  }, []);

  return (
    <>
      <Router>
        <div>
          <Routes>
            <Route
              path="/login"
              element={!user ? <SignIn /> : <Navigate to="/" replace />}
            />
            <Route
              path="/"
              element={
                user ? (
                  <>
                    <Navbar />
                    <Sidebar />
                    <Outlet /> {/* Outlet for nested routes */}
                  </>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            >
              {/* <Route
                path="/"
                element={user ? <Home /> : <Navigate to="/login" replace />}
              /> */}
              <Route
                path="/"
                element={
                  user ? <Dashboard /> : <Navigate to="/login" replace />
                }
              />

              <Route
                path="/profile"
                element={user ? <Profile /> : <Navigate to="/login" replace />}
              />

              <Route
                path="/site/:siteId"
                element={
                  user ? <Dashboard /> : <Navigate to="/login" replace />
                }
              />

              <Route
                path="/contact"
                element={user ? <Contact /> : <Navigate to="/login" replace />}
              />
              {/* {userInfo?.is_superuser && ( */}
              <Route
                path="/settings"
                element={user ? <Settings /> : <Navigate to="/login" replace />}
              />
              <Route
                path="/hosts/:siteId"
                element={user ? <Hosts /> : <Navigate to="/login" replace />}
              />
              <Route
                path="/guests/:siteId"
                element={user ? <Guests /> : <Navigate to="/login" replace />}
              />

              <Route
                path="/CCTV"
                element={user ? <CCTVPage /> : <Navigate to="/login" replace />}
              />

              <Route
                path="/gate"
                element={user ? <Gate /> : <Navigate to="/login" replace />}
              />

              {/* Route For user routing */}

              <Route path="/userDashboard" element=<Dashboard /> />

              {/* <Route
                path="/host/:hostId/visits/:siteId"
                element={
                  user ? <HostVisits /> : <Navigate to="/login" replace />
                }
              /> */}
              {/* )} */}
              {/* Add more routes here */}
            </Route>
            {/* <Route
              path="/SignIn"
              element={user ? <SignIn /> : <Navigate to="/" replace />}
            /> */}
            <Route path="*" element={<NotFound />} /> {/* 404 route */}
          </Routes>
        </div>
      </Router>
    </>
  );
}

export default App;
