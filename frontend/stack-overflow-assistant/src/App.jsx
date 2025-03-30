import React from "react";
import SearchAssistant from "./components/SearchAssistant";
import {BrowserRouter as Router,Routes,Route} from "react-router-dom";
import HeroPage from "./components/HeroPage";

function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" exact element={<HeroPage/>}/>
          <Route path="/search" element={<SearchAssistant/>}/>
        </Routes>
      </Router>
    </>
  );
}

export default App;
