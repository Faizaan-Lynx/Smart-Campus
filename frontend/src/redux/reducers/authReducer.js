// reducers/authReducer.js

import {
  LOGIN_SUCCESS,
  LOGOUT,
  UPDATE_SELECTED_OPTION,
  UPDATE_DATA_STATE,
} from "../actions/authActions";

const initialState = {
  isAuthenticated: localStorage.getItem("token") ? true : false,
  selectedOption: "today",
  updateData: false,
};

const authReducer = (state = initialState, action) => {
  switch (action.type) {
    case LOGIN_SUCCESS:
      // console.log(action);
      localStorage.setItem("token", action.payload.access_token);
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
      };
    case LOGOUT:
      localStorage.removeItem("token");
      return {
        ...state,
        user: null,
        isAuthenticated: false,
      };
    case UPDATE_SELECTED_OPTION:
      return {
        ...state,
        selectedOption: action.payload,
      };
    case UPDATE_DATA_STATE: // Handle the new action
      return {
        ...state,
        updateData: action.payload,
      };
    default:
      return state;
  }
};

export default authReducer;
