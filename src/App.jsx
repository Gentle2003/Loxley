import { Routes, Route } from "react-router-dom";
import Nav from "./components/Nav.jsx";
import Footer from "./components/Footer.jsx";
import Landing from "./pages/Landing.jsx";
import Quiver from "./pages/Quiver.jsx";
import RepoDetail from "./pages/RepoDetail.jsx";
import Portfolio from "./pages/Portfolio.jsx";

export default function App() {
  return (
    <>
      <Nav />
      <main>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/quiver" element={<Quiver />} />
          <Route path="/repo/:id" element={<RepoDetail />} />
          <Route path="/portfolio" element={<Portfolio />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
