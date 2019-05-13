import React, { useState, useContext } from "react";
import UserSvs from "../Services/UserSvs";
import { withRouter, RouteComponentProps } from "react-router";

const LoginPage: React.FC<RouteComponentProps> = ({ history }) => {
  const [inputUsername, setInputUsername] = useState("");
  const [inputPassword, setInputPassword] = useState("");
  const userService = useContext(UserSvs.ServiceCtx);

  const onSubmit = async () => {
    try {
      await userService.login(inputUsername, inputPassword);
      history.push("/dashboard");
    } catch (err) {
      console.error(err);
      alert(`Username should be 'csr'. Password should be '123'`);
    }
  };

  return (
    <>
      <div>
        <label>
          username:
          <input
            type="text"
            value={inputUsername}
            onChange={e => {
              setInputUsername(e.target.value);
            }}
          />
        </label>
      </div>
      <div>
        <label>
          password:
          <input
            type="password"
            value={inputPassword}
            onChange={e => {
              setInputPassword(e.target.value);
            }}
          />
        </label>
      </div>
      <button onClick={onSubmit}>Login!</button>
    </>
  );
};

export default withRouter(LoginPage);
