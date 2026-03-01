import { Login } from "./login";
import { App } from "./app";
import { LocationProvider, Router, Route } from "preact-iso";

export function OpenWindow() {

    return (
        <LocationProvider>
            <Router>
                <Route path="/" component={Login}></Route>
                <Route path="/login" component={Login}></Route>
                <Route path="/chat" component={App}></Route>
            </Router>
        </LocationProvider>



    )


}