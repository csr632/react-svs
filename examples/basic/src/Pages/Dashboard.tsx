import React, { useContext } from "react";
import { Redirect, withRouter, RouteComponentProps } from "react-router-dom";
import UserSvs from "../Services/UserSvs";

const DashboardPage: React.FC<RouteComponentProps> = ({ history }) => {
  const userState = useContext(UserSvs.StateCtx);
  const userService = useContext(UserSvs.ServiceCtx);
  if (!userState.user || !userState.user.username) {
    return <Redirect to="/login" />;
  }
  const username = userState.user.username;
  const onLogout = async () => {
    await userService.logout();
    history.push("/login");
  };
  return (
    <div>
      <p>Hello, {username}</p>
      <button onClick={onLogout}>Logout!</button>
    </div>
  );
};

export default withRouter(DashboardPage);
