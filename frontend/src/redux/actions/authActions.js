// Define action types
export const LOGIN_SUCCESS = "LOGIN_SUCCESS";
export const SIGNUP_SUCCESS = "SIGNUP_SUCCESS";
export const LOGOUT = "LOGOUT";
export const UPDATE_SELECTED_OPTION = "UPDATE_SELECTED_OPTION";
export const UPDATE_DATA_STATE = "UPDATE_DATA_STATE";

// Action creators
export const loginSuccess = (user) => ({
  type: LOGIN_SUCCESS,
  payload: user,
});

export const logout = () => ({
  type: LOGOUT,
});

export const updateSelectedOption = (option) => ({
  type: UPDATE_SELECTED_OPTION,
  payload: option,
});

export const updateDataState = (newState) => ({
  type: UPDATE_DATA_STATE,
  payload: newState,
});
