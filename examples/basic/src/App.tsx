import React from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import UserSvs from "./Services/UserSvs";
import LoginPage from "./Pages/Login";
import DashboardPage from "./Pages/Dashboard";

function App() {
  return (
    <Router>
      {/* provide the user state and user service to this subtree */}
      <UserSvs.Provider>
        <div className="App">
          <Switch>
            <Route path="/login" component={LoginPage} />
            <Route path="/dashboard" component={DashboardPage} />
            <Route component={LoginPage} />
          </Switch>
        </div>
      </UserSvs.Provider>
    </Router>
  );
}

export default App;
